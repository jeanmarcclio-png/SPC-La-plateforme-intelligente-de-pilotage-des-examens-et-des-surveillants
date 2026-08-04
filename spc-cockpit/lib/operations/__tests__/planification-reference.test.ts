import { describe, it, expect } from "vitest";
import { mockAffectations, mockSurveillants, mockMissions } from "../mock";
import { heuresAffectation, aUnCreneau } from "../disponibilites";
import { analyseCouverture } from "../couverture";
import { analyseRentabilite } from "../rentabilite";

// Verrouille le jeu de référence de la session ICP Paris (prompt Planification) :
// total exact 66,25 h · couverture 10/14 (≈ 71 %) · marge calculée.
describe("session de référence ICP Paris (EX-2026-041)", () => {
  const missionId = 5;
  const affs = mockAffectations.filter((a) => a.missionId === missionId);
  const survById = new Map(mockSurveillants.map((s) => [s.id, s]));

  it("totalise exactement 66,25 h", () => {
    const total = affs.reduce((n, a) => n + heuresAffectation(a), 0);
    expect(total).toBe(66.25);
  });

  it("respecte les heures de référence par surveillant", () => {
    const attendu: Record<number, number> = { 1: 6, 2: 7, 3: 2.75, 4: 9.5, 5: 6, 6: 5, 7: 3, 8: 9.25, 9: 9.25, 10: 8.5 };
    for (const a of affs) {
      expect(heuresAffectation(a)).toBe(attendu[a.surveillantId]);
    }
  });

  it("a une couverture 10/14 ≈ 71 %", () => {
    const mission = mockMissions.find((m) => m.id === missionId)!;
    const affectes = new Set(affs.filter(aUnCreneau).map((a) => a.surveillantId)).size;
    expect(affectes).toBe(10);
    const cov = analyseCouverture({ requis: mission.nbSurveillants, affectes });
    expect(cov.requis).toBe(14);
    expect(cov.manque).toBe(4);
    expect(Math.round(cov.tauxCouverture * 100)).toBe(71);
  });

  it("calcule une marge automatiquement (≈ 69 %)", () => {
    const mission = mockMissions.find((m) => m.id === missionId)!;
    const r = analyseRentabilite({
      caHT: mission.montantHT,
      lignes: affs.map((a) => ({ heures: heuresAffectation(a), tauxHoraire: survById.get(a.surveillantId)?.tauxHoraire ?? 18 })),
    });
    expect(r.caHT).toBe(4042);
    expect(Math.round(r.tauxMarge * 100)).toBe(69);
    expect(r.margeHT).toBeGreaterThan(0);
  });
});
