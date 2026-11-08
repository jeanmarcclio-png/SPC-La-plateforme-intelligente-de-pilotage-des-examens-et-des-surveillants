import { describe, expect, it } from "vitest";
import { payloadMissionDepuisDemande } from "../conversion";
import type { DemandeClient, LigneSalleDemande } from "../types";

function ligne(p: Partial<LigneSalleDemande>): LigneSalleDemande {
  return { id: Math.random().toString(36).slice(2), ...p };
}

function demande(p: Partial<DemandeClient> = {}): DemandeClient {
  return {
    id: "1",
    reference: "DC-20260614-001",
    etablissement: "  ICP Paris ",
    demandeur: { prenom: "A", nom: "B", email: "a@b.fr" },
    responsableClient: { prenom: "C", nom: "D", email: "c@d.fr" },
    responsableSpc: "Jean-Marc Clio",
    lignes: [],
    statut: "Validée SPC",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-06-14T08:00:00Z",
    historique: [],
    ...p,
  };
}

describe("payload de conversion d'une demande", () => {
  it("compte les salles distinctes et additionne les surveillants", () => {
    const p = payloadMissionDepuisDemande(demande({
      lignes: [
        ligne({ date: "2026-06-16", salle: "B22", surveillants: 2 }),
        ligne({ date: "2026-06-16", salle: "B22", surveillants: 1 }),
        ligne({ date: "2026-06-17", salle: "B11", surveillants: 3 }),
      ],
    }));
    expect(p.nbSalles).toBe(2);
    expect(p.nbSurveillants).toBe(6);
  });

  it("prend la première date d'épreuve et nettoie le nom de l'établissement", () => {
    const p = payloadMissionDepuisDemande(demande({
      lignes: [ligne({ date: "2026-06-18", salle: "A" }), ligne({ date: "2026-06-16", salle: "B" })],
    }));
    expect(p.dateMission).toBe("2026-06-16");
    expect(p.client).toBe("ICP Paris");
  });

  it("n'expose aucun montant : le potentiel indicatif n'est jamais un HT de mission", () => {
    const p = payloadMissionDepuisDemande(demande({
      lignes: [ligne({ date: "2026-06-16", salle: "Amphi", etudiants: 180, surveillants: 6 })],
    }));
    expect(Object.keys(p)).not.toContain("montant");
    expect(Object.keys(p).some((k) => k.toLowerCase().includes("montant"))).toBe(false);
  });

  it("date nulle quand aucune épreuve n'est datée", () => {
    expect(payloadMissionDepuisDemande(demande({ lignes: [ligne({ creneau: "Matin" })] })).dateMission).toBeNull();
  });
});
