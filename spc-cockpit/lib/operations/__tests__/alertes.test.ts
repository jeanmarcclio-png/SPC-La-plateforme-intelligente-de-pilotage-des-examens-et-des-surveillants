import { describe, it, expect } from "vitest";
import { joursAvant, prioriteAlerte, trierParPriorite } from "../alertes";

const REF = new Date("2026-07-10T00:00:00");

describe("joursAvant", () => {
  it("compte les jours (positif = à venir, négatif = passé)", () => {
    expect(joursAvant("2026-07-12", REF)).toBe(2);
    expect(joursAvant("2026-07-08", REF)).toBe(-2);
    expect(joursAvant(null, REF)).toBeNull();
    expect(joursAvant("pas-une-date", REF)).toBeNull();
  });
});

describe("prioriteAlerte", () => {
  it("hiérarchise par sévérité", () => {
    expect(prioriteAlerte("critique", null)).toBe(100);
    expect(prioriteAlerte("avertissement", null)).toBe(60);
    expect(prioriteAlerte("information", null)).toBe(30);
  });
  it("ajoute l'urgence quand l'échéance approche", () => {
    expect(prioriteAlerte("avertissement", 0)).toBe(90); // 60 + 30
    expect(prioriteAlerte("avertissement", 1)).toBe(87); // 60 + 27
    expect(prioriteAlerte("information", 10)).toBe(30); // urgence nulle à 10 j
  });
  it("pénalise légèrement une échéance dépassée", () => {
    expect(prioriteAlerte("avertissement", -1)).toBe(50); // 60 + 0 - 10
  });
});

describe("trierParPriorite", () => {
  it("classe du plus urgent au moins urgent", () => {
    const out = trierParPriorite([
      { id: "a", priorite: 30 },
      { id: "b", priorite: 100 },
      { id: "c", priorite: 60 },
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});
