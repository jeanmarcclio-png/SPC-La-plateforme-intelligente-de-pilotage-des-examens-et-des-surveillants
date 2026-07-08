import { describe, it, expect } from "vitest";
import {
  authorize,
  canReadOperations,
  canPlanOperations,
  canValidateOperations,
  canManageFinance,
  canAdminOrg,
  CAPABILITY_MIN_ROLE,
} from "../roles";

describe("authorize — décision d'accès", () => {
  it("non authentifié = toujours refusé", () => {
    expect(authorize({ authenticated: false, enforce: true, role: "administrateur", capability: "read" }).ok).toBe(false);
    expect(authorize({ authenticated: false, enforce: false, role: null, capability: "read" }).ok).toBe(false);
  });

  it("mode transition (enforce=false) : authentifié = autorisé quel que soit le rôle", () => {
    expect(authorize({ authenticated: true, enforce: false, role: null, capability: "admin" }).ok).toBe(true);
    expect(authorize({ authenticated: true, enforce: false, role: "lecteur", capability: "finance" }).ok).toBe(true);
  });

  it("mode strict : un lecteur ne peut pas planifier ni valider ni administrer", () => {
    expect(authorize({ authenticated: true, enforce: true, role: "lecteur", capability: "read" }).ok).toBe(true);
    expect(authorize({ authenticated: true, enforce: true, role: "lecteur", capability: "plan" }).ok).toBe(false);
    expect(authorize({ authenticated: true, enforce: true, role: "lecteur", capability: "validate" }).ok).toBe(false);
    expect(authorize({ authenticated: true, enforce: true, role: "lecteur", capability: "admin" }).ok).toBe(false);
  });

  it("mode strict : un planificateur planifie mais ne valide pas", () => {
    expect(authorize({ authenticated: true, enforce: true, role: "planificateur", capability: "plan" }).ok).toBe(true);
    expect(authorize({ authenticated: true, enforce: true, role: "planificateur", capability: "validate" }).ok).toBe(false);
    expect(authorize({ authenticated: true, enforce: true, role: "planificateur", capability: "finance" }).ok).toBe(false);
  });

  it("mode strict : un coordinateur valide et gère la finance", () => {
    expect(authorize({ authenticated: true, enforce: true, role: "coordinateur", capability: "validate" }).ok).toBe(true);
    expect(authorize({ authenticated: true, enforce: true, role: "coordinateur", capability: "finance" }).ok).toBe(true);
    expect(authorize({ authenticated: true, enforce: true, role: "coordinateur", capability: "admin" }).ok).toBe(false);
  });

  it("mode strict : rôle null retombe sur lecteur (aucune élévation)", () => {
    expect(authorize({ authenticated: true, enforce: true, role: null, capability: "plan" }).ok).toBe(false);
  });

  it("refus : message explicite sans donnée sensible", () => {
    const r = authorize({ authenticated: true, enforce: true, role: "lecteur", capability: "finance" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("finance");
    expect(r.error).not.toMatch(/@|\d{10}/); // pas de PII
  });
});

describe("capacités dérivées du rôle", () => {
  it("lecture ouverte à tous les rôles", () => {
    expect(canReadOperations("lecteur")).toBe(true);
  });
  it("planification à partir de planificateur", () => {
    expect(canPlanOperations("lecteur")).toBe(false);
    expect(canPlanOperations("planificateur")).toBe(true);
  });
  it("validation et finance à partir de coordinateur", () => {
    expect(canValidateOperations("planificateur")).toBe(false);
    expect(canValidateOperations("coordinateur")).toBe(true);
    expect(canManageFinance("coordinateur")).toBe(true);
  });
  it("administration réservée à l'administrateur", () => {
    expect(canAdminOrg("coordinateur")).toBe(false);
    expect(canAdminOrg("administrateur")).toBe(true);
  });
  it("table des rôles minimaux cohérente", () => {
    expect(CAPABILITY_MIN_ROLE.read).toBe("lecteur");
    expect(CAPABILITY_MIN_ROLE.admin).toBe("administrateur");
  });
});
