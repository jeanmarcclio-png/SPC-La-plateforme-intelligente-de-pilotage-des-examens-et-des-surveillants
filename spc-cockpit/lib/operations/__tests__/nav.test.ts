import { describe, it, expect } from "vitest";
import { isNavActive } from "../nav";

describe("isNavActive — état sélectionné de la navigation", () => {
  it("Dashboard actif seulement sur /operations exact", () => {
    expect(isNavActive("/operations", "/operations")).toBe(true);
    expect(isNavActive("/operations/devis", "/operations")).toBe(false);
    expect(isNavActive("/operations/cockpit", "/operations")).toBe(false);
  });
  it("entrée active sur sa page et ses sous-pages", () => {
    expect(isNavActive("/operations/devis", "/operations/devis")).toBe(true);
    expect(isNavActive("/operations/devis/13", "/operations/devis")).toBe(true);
  });
  it("ne matche pas une entrée voisine par préfixe partiel", () => {
    expect(isNavActive("/operations/devis", "/operations/de")).toBe(false);
    expect(isNavActive("/operations/rapports", "/operations/risques")).toBe(false);
  });
});
