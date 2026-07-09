import { describe, it, expect } from "vitest";
import { analyseRentabilite } from "../rentabilite";

describe("analyseRentabilite", () => {
  it("calcule coût, marge et taux", () => {
    const r = analyseRentabilite({
      caHT: 4000,
      lignes: [
        { heures: 6, tauxHoraire: 22 }, // 132
        { heures: 9.5, tauxHoraire: 18 }, // 171
      ],
    });
    expect(r.coutHT).toBe(303);
    expect(r.margeHT).toBe(3697);
    expect(r.heuresTotal).toBe(15.5);
    expect(r.niveau).toBe("saine");
  });

  it("classe « à surveiller » sous 30 % de marge", () => {
    const r = analyseRentabilite({ caHT: 1000, lignes: [{ heures: 40, tauxHoraire: 20 }] }); // coût 800, marge 20 %
    expect(r.tauxMarge).toBeCloseTo(0.2, 5);
    expect(r.niveau).toBe("surveiller");
  });

  it("classe « critique » quand la marge s'effondre ou est négative", () => {
    const perte = analyseRentabilite({ caHT: 1000, lignes: [{ heures: 60, tauxHoraire: 20 }] }); // coût 1200
    expect(perte.margeHT).toBe(-200);
    expect(perte.niveau).toBe("critique");
    const sansCA = analyseRentabilite({ caHT: 0, lignes: [] });
    expect(sansCA.niveau).toBe("critique");
    expect(sansCA.tauxMarge).toBe(0);
  });
});
