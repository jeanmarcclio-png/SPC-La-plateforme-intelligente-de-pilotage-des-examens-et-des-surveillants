import { describe, it, expect } from "vitest";
import { buildCockpitView, DEMO_COCKPIT } from "../cockpit";
import { santeSession } from "../planification-vue";
import type { Affectation, Mission, Salle, Surveillant } from "../types";

const mission: Mission = {
  id: 1, reference: "EX-2026-041", client: "ICP Paris", dateMission: "2026-07-08",
  type: "Examen", nbSalles: 4, nbSurveillants: 4, montantHT: 1000, statut: "En cours",
};
const surveillants: Surveillant[] = [
  { id: 10, nom: "Marie Laroche", role: "Coordinatrice", statut: "Disponible", nbExamens: 3, heures: 20, note: 4.5, tauxHoraire: 30 },
  { id: 11, nom: "Karim Haddad", role: "Surveillant salle", statut: "Disponible", nbExamens: 2, heures: 15, note: 4, tauxHoraire: 30 },
];
const salles: Salle[] = [
  { id: 1, nom: "A21", capacite: 30, etudiants: 25, nbSurveillants: 1, pmr: false, tiersTemps: false },
];
const affectations: Affectation[] = [
  { id: 1, missionId: 1, surveillantId: 10, statut: "Confirmée", salle: "A21", matin: true, matinDebut: "08:30", matinFin: "14:30", apm: false, presence: "Présent" },
  { id: 2, missionId: 1, surveillantId: 11, statut: "Confirmée", salle: "A22", matin: true, matinDebut: "08:30", matinFin: "13:30", apm: false, presence: "Absent" },
];

describe("buildCockpitView", () => {
  // Ce test verrouillait auparavant le repli sur le jeu de démonstration
  // (`expect(v).toBe(DEMO_COCKPIT)`). L'audit QA forensic V2 a établi (BUG-001)
  // qu'un cockpit opérationnel ne doit jamais inventer de session : il est
  // repris pour exiger le comportement corrigé.
  it("rend une vue VIDE sans mission active (aucune donnée inventée)", () => {
    delete process.env.SPC_DEMO;
    const v = buildCockpitView({ missions: [], affectations: [], surveillants: [], salles: [] });
    expect(v.vide).toBe(true);
    expect(v.demo).toBe(false);
    expect(v).not.toBe(DEMO_COCKPIT);
    expect(v.sessions).toEqual([]);
    expect(v.kpis.postesTotal).toBe(0);
  });

  it("sert le jeu de démonstration uniquement sous SPC_DEMO=1", () => {
    process.env.SPC_DEMO = "1";
    try {
      const v = buildCockpitView({ missions: [], affectations: [], surveillants: [], salles: [] });
      expect(v.demo).toBe(true);
      expect(v).toBe(DEMO_COCKPIT);
    } finally {
      delete process.env.SPC_DEMO;
    }
  });

  it("dérive couverture, sessions et statuts depuis les données réelles", () => {
    const v = buildCockpitView({ missions: [mission], affectations, surveillants, salles });
    expect(v.demo).toBe(false);
    // 2 surveillants affectés sur 4 requis → 50 %
    expect(v.kpis.couverturePct).toBe(50);
    expect(v.kpis.postesCouverts).toBe(2);
    expect(v.kpis.postesTotal).toBe(4);
    // 1 présent sur 2 → 50 %
    expect(v.kpis.confirmationsPct).toBe(50);
    // Karim est « Absent » → statut En retard
    const karim = v.sessions.find((s) => s.nom === "Karim Haddad");
    expect(karim?.statut).toBe("En retard");
    // Marie est coordinatrice, présente → conforme
    const marie = v.sessions.find((s) => s.nom === "Marie Laroche");
    expect(marie?.coord).toBe(true);
    expect(marie?.statut).toBe("Conforme");
    // Score de santé de session : MÊME échelle que la planification (0–100).
    // Le cockpit affichait auparavant une heuristique « fluidité IA » sur 10,
    // qui contredisait le score de la planification pour la même session
    // (audit QA forensic V2, BUG-025).
    expect(v.kpis.scoreIA).toBeGreaterThanOrEqual(0);
    expect(v.kpis.scoreIA).toBeLessThanOrEqual(100);
    expect(v.kpis.scoreIA).toBe(
      santeSession({ mission, missions: [mission], affectations, surveillants }).score,
    );
    expect(["prête", "à consolider", "à risque"]).toContain(v.kpis.scoreLabel);
  });
});
