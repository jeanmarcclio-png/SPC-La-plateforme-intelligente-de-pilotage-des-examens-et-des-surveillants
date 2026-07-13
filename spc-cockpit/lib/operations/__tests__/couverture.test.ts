import { describe, it, expect } from "vitest";
import { analyseCouverture } from "../couverture";

describe("analyseCouverture (prédiction de sous-effectif)", () => {
  it("complet quand tous les postes sont pourvus", () => {
    const c = analyseCouverture({ requis: 9, affectes: 9 });
    expect(c.niveau).toBe("complet");
    expect(c.manque).toBe(0);
    expect(c.tauxCouverture).toBe(1);
  });

  it("tendu entre 80 % et 100 %", () => {
    const c = analyseCouverture({ requis: 10, affectes: 9 });
    expect(c.niveau).toBe("tendu");
    expect(c.manque).toBe(1);
    expect(c.tauxCouverture).toBeCloseTo(0.9, 5);
  });

  it("sous-effectif sous 80 %", () => {
    const c = analyseCouverture({ requis: 10, affectes: 6 });
    expect(c.niveau).toBe("sous-effectif");
    expect(c.manque).toBe(4);
    expect(c.tauxCouverture).toBeCloseTo(0.6, 5);
  });

  it("sur-effectif reste complet (manque 0)", () => {
    const c = analyseCouverture({ requis: 5, affectes: 7 });
    expect(c.niveau).toBe("complet");
    expect(c.manque).toBe(0);
  });

  it("aucun requis → considéré couvert", () => {
    const c = analyseCouverture({ requis: 0, affectes: 0 });
    expect(c.niveau).toBe("complet");
    expect(c.tauxCouverture).toBe(1);
  });
});
