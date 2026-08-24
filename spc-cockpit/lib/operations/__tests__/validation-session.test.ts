// Non-régression du chantier 4 — corrige BUG-015.
//
// Le moteur `validateSessionForApproval` était testé mais n'avait AUCUN appelant
// applicatif. Ces tests portent sur l'ADAPTATEUR qui le branche : ils exigent
// qu'une session à 10/14 soit refusée, ce que le garde client d'origine
// (nbLignes / nbModifiees / nbAlertes) laissait passer.

import { describe, it, expect } from "vitest";
import { entreesMoteur, anomaliesHorsMoteur, verdictSession, refusValidation } from "../validation-session";
import type { Affectation, Mission, Salle } from "../types";

const mission: Mission = {
  id: 1, reference: "EX-2026-041", client: "ICP Paris", dateMission: "2026-07-08",
  type: "Examen", nbSalles: 2, nbSurveillants: 4, montantHT: 1000, statut: "Planifiée",
};

function salle(nom: string, requis: number): Salle {
  return { id: nom.length, nom, capacite: 60, etudiants: 50, nbSurveillants: requis, pmr: false, tiersTemps: false };
}
function aff(id: number, surveillantId: number, nomSalle: string | undefined, debut = "08:30", fin = "12:30"): Affectation {
  return {
    id, missionId: 1, surveillantId, statut: "Confirmée", salle: nomSalle,
    matin: true, matinDebut: debut, matinFin: fin, apm: false, presence: "En attente",
  };
}

describe("entreesMoteur — traduction produit → moteur", () => {
  it("dérive une salle par couple (période, salle) et non par affectation", () => {
    const { rooms } = entreesMoteur({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21"), aff(3, 12, "A22")],
      salles: [salle("A21", 2), salle("A22", 1)],
    });
    expect(rooms).toHaveLength(2);
    expect(rooms.map((r) => r.roomCode).sort()).toEqual(["A21", "A22"]);
    expect(rooms.every((r) => r.period === "morning")).toBe(true);
  });

  it("prend le nombre de surveillants requis dans le référentiel", () => {
    const { rooms } = entreesMoteur({
      mission, affectations: [aff(1, 10, "A21")], salles: [salle("Salle A21", 3)],
    });
    expect(rooms[0].requiredSupervisors).toBe(3);
  });

  it("retombe sur 1 — jamais sur l'effectif observé — quand la salle est inconnue", () => {
    // Prendre l'effectif observé rendrait la sous-couverture indétectable par
    // construction : toute salle serait toujours « complète ».
    const { rooms } = entreesMoteur({
      mission, affectations: [aff(1, 10, "C14")], salles: [],
    });
    expect(rooms[0].requiredSupervisors).toBe(1);
  });

  it("étend l'amplitude d'une salle à l'enveloppe de ses créneaux", () => {
    const { rooms } = entreesMoteur({
      mission,
      affectations: [aff(1, 10, "A21", "09:00", "12:00"), aff(2, 11, "A21", "08:00", "13:00")],
      salles: [salle("A21", 2)],
    });
    expect(rooms[0].startTime).toBe("08:00");
    expect(rooms[0].endTime).toBe("13:00");
  });

  it("n'invente aucune salle pour une affectation qui n'en porte pas", () => {
    const { rooms, assignments } = entreesMoteur({
      mission, affectations: [aff(1, 10, undefined)], salles: [],
    });
    expect(rooms).toEqual([]);
    expect(assignments).toEqual([]);
  });

  it("ignore les affectations sans créneau exploitable", () => {
    const sansCreneau: Affectation = {
      id: 9, missionId: 1, surveillantId: 99, statut: "Proposé", salle: "A21",
      matin: false, apm: false, presence: "En attente",
    };
    const { rooms } = entreesMoteur({ mission, affectations: [sansCreneau], salles: [salle("A21", 1)] });
    expect(rooms).toEqual([]);
  });
});

describe("BUG-015 — une session sous-dotée est REFUSÉE", () => {
  it("refuse 2/4 : le garde client d'origine laissait passer", () => {
    const v = verdictSession({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21")],
      salles: [salle("A21", 2)],
    });
    expect(v.valide).toBe(false);
    expect(v.bloquants.join(" ")).toContain("2/4");
  });

  it("refuse une salle sous-dotée même si la session atteint son effectif global", () => {
    // 4 surveillants sur 4 requis, mais A22 en réclame 3 et n'en a qu'un.
    const v = verdictSession({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21"), aff(3, 12, "A21"), aff(4, 13, "A22")],
      salles: [salle("A21", 3), salle("A22", 3)],
    });
    expect(v.valide).toBe(false);
    expect(v.bloquants.some((m) => m.includes("A22"))).toBe(true);
  });

  it("refuse un créneau planifié sans salle : le moteur ne peut pas l'examiner", () => {
    const v = verdictSession({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21"), aff(3, 12, "A21"), aff(4, 13, undefined)],
      salles: [salle("A21", 3)],
    });
    expect(v.valide).toBe(false);
    expect(v.bloquants.join(" ")).toContain("sans salle");
  });

  it("refuse un double emploi : même surveillant, deux salles, créneaux qui se chevauchent", () => {
    const v = verdictSession({
      mission,
      affectations: [
        aff(1, 10, "A21", "08:00", "12:00"),
        aff(2, 10, "A22", "10:00", "13:00"),
        aff(3, 11, "A21", "08:00", "12:00"),
        aff(4, 12, "A22", "10:00", "13:00"),
      ],
      salles: [salle("A21", 2), salle("A22", 2)],
    });
    expect(v.valide).toBe(false);
    expect(v.bloquants.some((m) => /simultan/i.test(m))).toBe(true);
  });

  it("refuse une session sans aucun créneau planifié", () => {
    const v = verdictSession({ mission, affectations: [], salles: [] });
    expect(v.valide).toBe(false);
    expect(v.bloquants.join(" ")).toContain("Aucun créneau");
  });

  it("ACCEPTE une session complète et cohérente", () => {
    const v = verdictSession({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21"), aff(3, 12, "A22"), aff(4, 13, "A22")],
      salles: [salle("A21", 2), salle("A22", 2)],
    });
    expect(v.bloquants).toEqual([]);
    expect(v.valide).toBe(true);
    expect(refusValidation(v)).toBeNull();
  });
});

describe("anomaliesHorsMoteur — ce que le moteur ne peut pas voir", () => {
  it("signale la sous-dotation globale, invisible salle par salle", () => {
    // Une seule salle réclamant 1 surveillant est « complète » pour le moteur,
    // alors que la mission en déclare 4 : sans ce contrôle, une session à 25 %
    // passerait toutes les vérifications de salle.
    const a = anomaliesHorsMoteur({
      mission, affectations: [aff(1, 10, "A21")], salles: [salle("A21", 1)],
    });
    expect(a.map((x) => x.code)).toContain("SESSION_UNDERSTAFFED");
  });

  it("ne signale rien sur une session complète", () => {
    const a = anomaliesHorsMoteur({
      mission,
      affectations: [aff(1, 10, "A21"), aff(2, 11, "A21"), aff(3, 12, "A22"), aff(4, 13, "A22")],
      salles: [salle("A21", 2), salle("A22", 2)],
    });
    expect(a).toEqual([]);
  });
});

describe("refusValidation — message actionnable", () => {
  it("dit combien de contrôles bloquent, lesquels, et quoi faire", () => {
    const v = verdictSession({ mission, affectations: [aff(1, 10, "A21")], salles: [salle("A21", 2)] });
    const m = refusValidation(v)!;
    expect(m).toContain("Validation refusée");
    expect(m).toContain("bloquant");
    expect(m).toContain("Corrigez le planning");
  });

  it("tronque proprement au-delà de la limite", () => {
    const v = { valide: false, bloquants: ["a", "b", "c", "d", "e", "f"], avertissements: [] };
    expect(refusValidation(v, 2)).toContain("(+4 autre(s))");
  });
});
