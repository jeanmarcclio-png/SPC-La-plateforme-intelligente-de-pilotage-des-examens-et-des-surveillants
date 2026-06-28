import { describe, it, expect } from "vitest";
import { calcJoursRestants, parseFRDate } from "../lib/utils/date";

describe("parseFRDate", () => {
  it("parse DD/MM/YYYY", () => {
    const d = parseFRDate("30/06/2030");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2030);
    expect(d!.getMonth()).toBe(5); // juin = 5
    expect(d!.getDate()).toBe(30);
  });

  it("retourne null pour une chaîne vide", () => {
    expect(parseFRDate("")).toBeNull();
    expect(parseFRDate(undefined)).toBeNull();
  });

  it("retourne null si format invalide", () => {
    expect(parseFRDate("2030-06-30")).toBeNull(); // ISO → non supporté par parseFRDate
  });
});

describe("calcJoursRestants", () => {
  it("retourne 0 pour une deadline passée", () => {
    expect(calcJoursRestants("01/01/2000")).toBe(0);
  });

  it("retourne 0 pour une date ISO passée", () => {
    expect(calcJoursRestants("2000-01-01")).toBe(0);
  });

  it("retourne un nombre positif pour une date future (DD/MM/YYYY)", () => {
    expect(calcJoursRestants("01/01/2099")).toBeGreaterThan(0);
  });

  it("retourne un nombre positif pour une date future (YYYY-MM-DD)", () => {
    expect(calcJoursRestants("2099-01-01")).toBeGreaterThan(0);
  });

  it("ne retourne jamais NaN", () => {
    const result = calcJoursRestants("30/06/2026");
    expect(result).not.toBeNaN();
    expect(typeof result).toBe("number");
  });

  it("gère les formats invalides sans planter", () => {
    expect(calcJoursRestants("invalid")).toBe(0);
    expect(calcJoursRestants("")).toBe(0);
  });
});
