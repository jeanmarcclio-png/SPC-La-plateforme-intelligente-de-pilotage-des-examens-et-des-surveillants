import { describe, it, expect } from "vitest";
import { STATUTS_DEMANDE, peutTransiter, totauxDemande, validerDemande, genererReference } from "../logic";
import type { DemandeClient, LigneSalleDemande } from "../types";

function ligne(p: Partial<LigneSalleDemande> = {}): LigneSalleDemande {
  return { id: Math.random().toString(36).slice(2), ...p };
}

function demande(p: Partial<DemandeClient> = {}): DemandeClient {
  return {
    id: "1",
    reference: "DC-20260804-001",
    etablissement: "ICP Paris",
    demandeur: { prenom: "Marie", nom: "Lecomte", email: "marie@icp.fr" },
    responsableClient: { prenom: "Paul", nom: "Durand", email: "paul@icp.fr" },
    responsableSpc: "Jean-Marc",
    lignes: [],
    statut: "Brouillon",
    createdAt: "2026-08-04T09:00:00Z",
    updatedAt: "2026-08-04T09:00:00Z",
    historique: [],
    ...p,
  };
}

describe("transitions de statut", () => {
  it("chaque statut expose des transitions cohérentes", () => {
    expect(peutTransiter("Brouillon", "À vérifier")).toBe(true);
    expect(peutTransiter("Complète", "Validée SPC")).toBe(true);
    expect(peutTransiter("Validée SPC", "Convertie en mission")).toBe(true);
    expect(peutTransiter("Brouillon", "Validée SPC")).toBe(false);
    expect(peutTransiter("Archivée", "Brouillon")).toBe(false);
  });

  it("un statut « Validée SPC » a le vert sémantique et l'action de conversion", () => {
    expect(STATUTS_DEMANDE["Validée SPC"].tone).toBe("success");
    expect(STATUTS_DEMANDE["Validée SPC"].action).toBe("Convertir en mission");
  });
});

describe("totauxDemande", () => {
  it("agrège salles, étudiants, créneaux et période", () => {
    const d = demande({
      lignes: [
        ligne({ date: "2026-06-15", creneau: "Matin", salle: "B11", etudiants: 30, surveillants: 2 }),
        ligne({ date: "2026-06-15", creneau: "Après-midi", salle: "B12", etudiants: 28, surveillants: 1 }),
        ligne({ date: "2026-06-16", creneau: "Matin", salle: "B11", etudiants: 30, surveillants: 2 }),
        ligne({}), // ligne vide ignorée
      ],
    });
    const t = totauxDemande(d);
    expect(t.nbCreneaux).toBe(3);
    expect(t.nbSalles).toBe(2); // B11, B12
    expect(t.nbEtudiants).toBe(88);
    expect(t.nbSurveillants).toBe(5);
    expect(t.periodeLabel).toBe("2026-06-15 → 2026-06-16");
  });

  it("période sur un seul jour", () => {
    const d = demande({ lignes: [ligne({ date: "2026-06-15", salle: "A1", etudiants: 10, surveillants: 1 })] });
    expect(totauxDemande(d).periodeLabel).toBe("2026-06-15");
  });
});

describe("validerDemande", () => {
  const complet = demande({
    lignes: [ligne({ date: "2026-06-15", creneau: "Matin", salle: "B11", etudiants: 30, surveillants: 2, debutExamen: "08:30", finExamen: "11:30" })],
  });

  it("ne renvoie aucune erreur pour une demande complète", () => {
    expect(validerDemande(complet)).toEqual([]);
  });

  it("détecte les champs obligatoires manquants", () => {
    const d = demande({ etablissement: "", demandeur: { prenom: "", nom: "", email: "" }, responsableSpc: "", lignes: [] });
    const errs = validerDemande(d);
    expect(errs).toContain("Établissement non renseigné");
    expect(errs).toContain("Demandeur non renseigné");
    expect(errs).toContain("Responsable SPC non renseigné");
    expect(errs).toContain("Au moins une date requise");
    expect(errs).toContain("Au moins une salle requise");
  });

  it("détecte des horaires incohérents", () => {
    const d = demande({ lignes: [ligne({ date: "2026-06-15", salle: "B11", etudiants: 10, surveillants: 1, debutExamen: "11:00", finExamen: "09:00" })] });
    expect(validerDemande(d).some((e) => e.includes("incohérents"))).toBe(true);
  });

  it("exige le détail PMR si PMR présent", () => {
    const d = demande({ ...complet, pmrPresence: true, pmrNombre: 0 });
    expect(validerDemande(d)).toContain("Nombre d'étudiants PMR à préciser");
  });
});

describe("genererReference", () => {
  it("incrémente la séquence journalière", () => {
    expect(genererReference("2026-08-04T10:00:00Z", [])).toBe("DC-20260804-001");
    expect(genererReference("2026-08-04T10:00:00Z", ["DC-20260804-001", "DC-20260804-002"])).toBe("DC-20260804-003");
    // Une référence d'un autre jour n'interfère pas.
    expect(genererReference("2026-08-04T10:00:00Z", ["DC-20260803-009"])).toBe("DC-20260804-001");
  });
});
