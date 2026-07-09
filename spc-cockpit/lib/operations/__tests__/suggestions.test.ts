import { describe, it, expect } from "vitest";
import { fiabilite, scoreAffectation, suggererSurveillants } from "../suggestions";
import type { Surveillant } from "../types";

function surv(p: Partial<Surveillant>): Surveillant {
  return {
    id: 1, nom: "Test", role: "Surveillant salle", statut: "Disponible",
    nbExamens: 0, heures: 0, note: 0, tauxHoraire: 18, ...p,
  };
}

describe("fiabilité", () => {
  it("combine note (70%) et disponibilité (30%)", () => {
    expect(fiabilite(surv({ note: 5, statut: "Disponible" }))).toBe(100);
    expect(fiabilite(surv({ note: 0, statut: "Indisponible" }))).toBe(0);
    expect(fiabilite(surv({ note: 5, statut: "Planifié" }))).toBe(88); // 70 + 18
  });
});

describe("scoreAffectation", () => {
  it("récompense dispo + note + charge faible et explique", () => {
    const { score, reasons } = scoreAffectation(surv({ note: 4.8, statut: "Disponible", heures: 20 }));
    expect(score).toBeGreaterThan(85);
    expect(reasons).toContain("Disponible");
    expect(reasons).toContain("Note 4.8/5");
    expect(reasons).toContain("Charge faible");
  });
  it("pénalise une charge élevée", () => {
    const bas = scoreAffectation(surv({ note: 4.5, statut: "Disponible", heures: 20 })).score;
    const haut = scoreAffectation(surv({ note: 4.5, statut: "Disponible", heures: 110 })).score;
    expect(bas).toBeGreaterThan(haut);
  });
});

describe("suggererSurveillants", () => {
  const equipe = [
    surv({ id: 1, nom: "A", note: 5.0, statut: "Disponible", heures: 20 }),
    surv({ id: 2, nom: "B", note: 4.0, statut: "Planifié", heures: 80 }),
    surv({ id: 3, nom: "C", note: 4.9, statut: "Indisponible", heures: 10 }), // exclu
    surv({ id: 4, nom: "D", note: 3.0, statut: "Annulé", heures: 5 }), // exclu
    surv({ id: 5, nom: "E", note: 4.7, statut: "Disponible", heures: 60 }),
  ];

  it("exclut Indisponible/Annulé et classe par score", () => {
    const s = suggererSurveillants(equipe);
    expect(s.map((x) => x.surveillant.id)).toEqual([1, 5, 2]); // A > E > B
    expect(s.every((x) => x.surveillant.statut !== "Indisponible" && x.surveillant.statut !== "Annulé")).toBe(true);
  });

  it("respecte exclureIds et limite", () => {
    const s = suggererSurveillants(equipe, { exclureIds: [1], limite: 1 });
    expect(s).toHaveLength(1);
    expect(s[0].surveillant.id).toBe(5);
  });
});
