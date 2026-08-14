// ============================================================================
// SPC — APPELS DIRECTS AUX SERVER ACTIONS (V-2, V-3, T-2, I-2)
//
// POURQUOI CES TESTS EXISTENT
// ---------------------------
// Les 69 tests end-to-end pilotent l'application par le NAVIGATEUR. Ils ne
// peuvent donc prouver qu'une chose : que le formulaire ne propose pas l'action
// interdite. Or un Server Action est un POINT D'ENTRÉE RÉSEAU : il s'appelle
// sans passer par l'écran, et le garde du formulaire ne le protège en rien.
//
// L'audit avait laissé cette famille de contrôles en 🔍 NON VÉRIFIÉ, en notant
// que c'était « le contrôle qui compte ». Ces tests l'exécutent.
//
// CE QU'ILS VÉRIFIENT, ET COMMENT
// -------------------------------
// Chaque action est appelée DIRECTEMENT, avec ses arguments, sans rendu ni
// navigateur. La couche Supabase est remplacée par un client factice qui
// JOURNALISE TOUTE ÉCRITURE. Un refus ne se juge donc pas au message retourné —
// un message peut mentir — mais au fait qu'AUCUNE écriture n'a été tentée.
//
// LES CONTRÔLES POSITIFS NE SONT PAS DÉCORATIFS
// ---------------------------------------------
// Une action qui refuserait TOUT ferait passer tous les tests de refus. Chaque
// garde est donc doublé d'un cas légitime qui, lui, DOIT écrire. C'est ce qui
// distingue « le garde fonctionne » de « l'action est cassée ».
// ============================================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockMissions, mockAffectations, mockSalles } from "@/lib/operations/mock";
import type { Mission } from "@/lib/operations/types";

interface Ecriture {
  table: string;
  type: "insert" | "update" | "delete";
  charge?: unknown;
}

const etat = vi.hoisted(() => ({
  ecritures: [] as { table: string; type: string; charge?: unknown }[],
  // Lignes rendues par le client factice, par table.
  lignes: {} as Record<string, Record<string, unknown>[]>,
  // Jeux rendus par lib/operations/queries, avec leur ORIGINE — c'est elle qui
  // permet de rejouer V-3 (« la base n'a pas pu être relue »).
  jeux: {} as Record<string, { origine: string; lignes: unknown[] }>,
}));

// Le client factice : chaînable comme supabase-js, et surtout MOUCHARD. Toute
// écriture est enregistrée avant d'être signalée comme réussie.
function clientFactice() {
  const requete = (table: string) => {
    const lignes = () => etat.lignes[table] ?? [];
    const ctx: Record<string, unknown> = {};
    Object.assign(ctx, {
      select: () => ctx,
      eq: () => ctx,
      order: () => ctx,
      limit: () => ctx,
      single: async () => ({ data: lignes()[0] ?? null, error: null }),
      // Rend l'objet « awaitable » : `await supabase.from(t).select(...)`.
      then: (suite: (v: unknown) => unknown) =>
        Promise.resolve({ data: lignes(), error: null }).then(suite),
      update: (charge: unknown) => {
        etat.ecritures.push({ table, type: "update", charge });
        return { eq: async () => ({ error: null }) };
      },
      delete: () => {
        etat.ecritures.push({ table, type: "delete" });
        return { eq: async () => ({ error: null }) };
      },
      insert: (charge: unknown) => {
        etat.ecritures.push({ table, type: "insert", charge });
        return ctx;
      },
    });
    return ctx;
  };
  return { from: requete };
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/log", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
// L'authentification est accordée : ces tests portent sur les gardes MÉTIER,
// pas sur le contrôle d'accès. Un refus obtenu faute de droits ne prouverait
// rien sur la transition ni sur la couverture.
vi.mock("@/lib/auth/session", () => ({ requireCapability: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/auth/org", () => ({ getActiveOrgId: vi.fn(async () => "org-recette") }));
vi.mock("@/lib/operations/journal", () => ({ journaliser: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => clientFactice()) }));
vi.mock("@/lib/operations/queries", () => ({
  getMissions: vi.fn(async () => etat.jeux.missions),
  getAffectations: vi.fn(async () => etat.jeux.affectations),
  getSalles: vi.fn(async () => etat.jeux.salles),
}));

import { updateMission, validerSession } from "@/app/actions/missions";
import { deleteSalle } from "@/app/actions/salles";

const ecritures = () => etat.ecritures as Ecriture[];

/** La session de référence de l'audit : 14 surveillants requis, 10 pourvus. */
const MISSION_SOUS_DOTEE = mockMissions.find((m) => m.statut === "En cours")!;
const AFFECTATIONS_SOUS_DOTEES = mockAffectations.filter((a) => a.missionId === MISSION_SOUS_DOTEE.id);

/**
 * La même session, mais au statut « Planifiée ».
 *
 * « En cours » ne permet pas la transition vers « Validée » : l'action
 * refuserait sur le contrôle de transition, AVANT d'atteindre le contrôle de
 * couverture. Le test porterait alors sur un garde qu'il ne croit pas tester.
 */
const MISSION_A_VALIDER: Mission = { ...MISSION_SOUS_DOTEE, statut: "Planifiée" };

function formulaireMission(champs: Record<string, string>): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    reference: "RECETTE-001",
    client: "Établissement de recette",
    nb_salles: "6",
    nb_surveillants: "14",
    montant_ht: "1000",
    statut: "Planifiée",
  };
  for (const [k, v] of Object.entries({ ...base, ...champs })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  etat.ecritures.length = 0;
  etat.lignes = {};
  etat.jeux = {
    missions: { origine: "base", lignes: [MISSION_A_VALIDER] },
    affectations: { origine: "base", lignes: AFFECTATIONS_SOUS_DOTEES },
    salles: { origine: "base", lignes: mockSalles },
  };
});

// ---------------------------------------------------------------------------
describe("T-2 — transitions de statut, hors formulaire", () => {
  it("refuse « Terminée → Brouillon » et n'écrit rien", async () => {
    etat.lignes.missions = [{ statut: "Terminée", client: "Établissement", reference: "M-1" }];

    const r = await updateMission(1, formulaireMission({ statut: "Brouillon" }));

    expect(r.error).toMatch(/Transition refusée/);
    expect(ecritures().filter((e) => e.table === "missions")).toEqual([]);
  });

  it("nomme les transitions réellement permises depuis « Terminée »", async () => {
    etat.lignes.missions = [{ statut: "Terminée", client: "Établissement", reference: "M-1" }];

    const r = await updateMission(1, formulaireMission({ statut: "Brouillon" }));

    // Le message doit être exploitable par l'utilisateur, pas un simple refus.
    expect(r.error).toContain("Facturée");
    expect(r.error).toContain("Archivée");
  });

  it("CONTRÔLE POSITIF — accepte « Terminée → Facturée » et écrit", async () => {
    etat.lignes.missions = [{ statut: "Terminée", client: "Établissement", reference: "M-1" }];

    const r = await updateMission(1, formulaireMission({ statut: "Facturée" }));

    expect(r.error).toBeUndefined();
    const maj = ecritures().filter((e) => e.table === "missions" && e.type === "update");
    expect(maj).toHaveLength(1);
    expect((maj[0].charge as { statut: string }).statut).toBe("Facturée");
  });
});

// ---------------------------------------------------------------------------
describe("V-2 — validation de session, hors formulaire", () => {
  it("refuse une session à 10 surveillants pour 14 requis, et n'écrit rien", async () => {
    etat.lignes.missions = [{ statut: "Planifiée", client: "Établissement" }];

    const r = await validerSession(MISSION_A_VALIDER.id);

    expect(r.error).toMatch(/Validation refusée/);
    // Le refus vient bien du moteur central, et non du garde de transition.
    expect(r.error).toMatch(/contrôle\(s\) bloquant\(s\)/);
    expect(ecritures().filter((e) => e.table === "missions")).toEqual([]);
  });

  it("refuse aussi une transition illégale vers « Validée »", async () => {
    etat.lignes.missions = [{ statut: "Terminée", client: "Établissement" }];

    const r = await validerSession(MISSION_A_VALIDER.id);

    expect(r.error).toMatch(/ne peut pas être validée/);
    expect(ecritures().filter((e) => e.table === "missions")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("V-3 — planning illisible", () => {
  it("refuse de valider sur un planning qui n'a pas pu être relu", async () => {
    etat.lignes.missions = [{ statut: "Planifiée", client: "Établissement" }];
    // Une lecture en échec renvoie un jeu VIDE. Sans ce garde, un planning vide
    // passerait tous les contrôles de salle et la session serait validée.
    etat.jeux.affectations = { origine: "erreur", lignes: [] };

    const r = await validerSession(MISSION_A_VALIDER.id);

    expect(r.error).toMatch(/n'a pas pu être relu/);
    expect(ecritures().filter((e) => e.table === "missions")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("I-2 — suppression d'une salle, hors formulaire", () => {
  it("refuse la suppression d'une salle référencée au planning, et n'écrit rien", async () => {
    etat.lignes.salles = [{ nom: "A21" }];
    etat.lignes.affectations = [
      { id: 1, salle: "A21", salle_id: null },
      { id: 2, salle: "A21", salle_id: null },
      { id: 3, salle: "A21", salle_id: null },
    ];
    etat.lignes.incidents = [];
    etat.lignes.devis_salles = [];

    const r = await deleteSalle(1);

    expect(r.error).toMatch(/Suppression refusée/);
    // Le message nomme le nombre d'affectations : c'est ce qui rend le refus
    // actionnable pour un responsable des examens.
    expect(r.error).toContain("3 affectation");
    expect(ecritures().filter((e) => e.type === "delete")).toEqual([]);
  });

  it("refuse aussi quand seule la clé étrangère salle_id rattache le planning", async () => {
    // Le libellé texte a divergé — seul `salle_id` rattache encore. C'est
    // exactement le cas que la migration 32 a introduit.
    etat.lignes.salles = [{ nom: "A21" }];
    etat.lignes.affectations = [{ id: 1, salle: "ancien libellé", salle_id: 1 }];
    etat.lignes.incidents = [];
    etat.lignes.devis_salles = [];

    const r = await deleteSalle(1);

    expect(r.error).toMatch(/Suppression refusée/);
    expect(ecritures().filter((e) => e.type === "delete")).toEqual([]);
  });

  it("refuse quand un devis ou un incident cite la salle", async () => {
    etat.lignes.salles = [{ nom: "B11" }];
    etat.lignes.affectations = [];
    etat.lignes.incidents = [{ id: 1, salle: "B11" }];
    etat.lignes.devis_salles = [{ id: 1, salle: "B11" }];

    const r = await deleteSalle(1);

    expect(r.error).toMatch(/Suppression refusée/);
    expect(r.error).toContain("incident");
    expect(ecritures().filter((e) => e.type === "delete")).toEqual([]);
  });

  it("CONTRÔLE POSITIF — supprime une salle orpheline et écrit", async () => {
    etat.lignes.salles = [{ nom: "B11" }];
    etat.lignes.affectations = [];
    etat.lignes.incidents = [];
    etat.lignes.devis_salles = [];

    const r = await deleteSalle(1);

    expect(r.error).toBeUndefined();
    expect(ecritures().filter((e) => e.table === "salles" && e.type === "delete")).toHaveLength(1);
  });
});
