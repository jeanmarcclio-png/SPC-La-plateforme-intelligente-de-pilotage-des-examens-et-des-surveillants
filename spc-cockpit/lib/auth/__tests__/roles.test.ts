import { describe, it, expect } from "vitest";
import { normalizeRole, hasRole, assertRole } from "../roles";

describe("normalizeRole", () => {
  it("mappe les libellés libres", () => {
    expect(normalizeRole("Administrateur")).toBe("administrateur");
    expect(normalizeRole("coordinatrice")).toBe("coordinateur");
    expect(normalizeRole("Planificateur")).toBe("planificateur");
    expect(normalizeRole("")).toBe("lecteur");
    expect(normalizeRole(null)).toBe("lecteur");
    expect(normalizeRole("inconnu")).toBe("lecteur");
  });
});

describe("hasRole", () => {
  it("respecte la hiérarchie", () => {
    expect(hasRole("administrateur", "lecteur")).toBe(true);
    expect(hasRole("coordinateur", "planificateur")).toBe(true);
    expect(hasRole("lecteur", "planificateur")).toBe(false);
    expect(hasRole("planificateur", "administrateur")).toBe(false);
    expect(hasRole("lecteur", "lecteur")).toBe(true);
  });
});

describe("assertRole", () => {
  it("autorise si niveau suffisant", () => {
    expect(assertRole("coordinateur", "planificateur").ok).toBe(true);
  });
  it("refuse avec message si niveau insuffisant", () => {
    const r = assertRole("lecteur", "administrateur");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("administrateur");
  });
});
