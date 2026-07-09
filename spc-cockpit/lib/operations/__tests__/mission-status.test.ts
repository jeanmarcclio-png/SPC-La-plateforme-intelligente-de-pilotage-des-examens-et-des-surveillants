import { describe, it, expect } from "vitest";
import { MISSION_STATUTS, allowedTransitions, statutOptions, estPlanifiable } from "../mission-status";

describe("cycle de vie des missions", () => {
  it("liste les 11 statuts du cycle", () => {
    expect(MISSION_STATUTS).toHaveLength(11);
    expect(MISSION_STATUTS).toContain("Validée"); // flux de validation conservé
    expect(MISSION_STATUTS[0]).toBe("Brouillon");
    expect(MISSION_STATUTS.at(-1)).toBe("Annulée");
  });

  it("autorise les bonnes transitions", () => {
    expect(allowedTransitions("Brouillon")).toEqual(["À chiffrer", "Annulée"]);
    expect(allowedTransitions("Planifiée")).toContain("Validée");
    expect(allowedTransitions("En cours")).toEqual(["Terminée", "Annulée"]);
    expect(allowedTransitions("Archivée")).toEqual([]); // terminal
    expect(allowedTransitions("Annulée")).toEqual([]); // terminal
  });

  it("statutOptions inclut le statut courant en tête", () => {
    const opts = statutOptions("Planifiée");
    expect(opts[0]).toBe("Planifiée");
    expect(opts).toContain("En cours");
    expect(opts).toContain("Annulée");
  });

  it("estPlanifiable ne couvre que l'opérationnel engagé", () => {
    expect(estPlanifiable("Acceptée")).toBe(true);
    expect(estPlanifiable("Planifiée")).toBe(true);
    expect(estPlanifiable("Validée")).toBe(true);
    expect(estPlanifiable("En cours")).toBe(true);
    expect(estPlanifiable("Brouillon")).toBe(false);
    expect(estPlanifiable("Terminée")).toBe(false);
    expect(estPlanifiable("Archivée")).toBe(false);
  });
});
