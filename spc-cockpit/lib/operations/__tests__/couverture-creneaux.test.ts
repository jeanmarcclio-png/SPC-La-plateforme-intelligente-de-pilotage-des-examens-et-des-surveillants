import { describe, it, expect } from "vitest";
import { couvertureParCreneau } from "../couverture-creneaux";

describe("couvertureParCreneau (couverture par tranche horaire)", () => {
  it("aucune présence → tout est hors plage, zéro trou", () => {
    const c = couvertureParCreneau({ presences: [], requis: 4 });
    expect(c.trousCritiques).toBe(0);
    expect(c.creneaux.every((x) => x.niveau === "hors")).toBe(true);
  });

  it("compte les surveillants distincts présents par tranche", () => {
    const c = couvertureParCreneau({
      requis: 2,
      presences: [
        { id: 1, slots: [{ debut: "08:00", fin: "10:00" }] },
        { id: 2, slots: [{ debut: "08:00", fin: "12:00" }] },
      ],
    });
    const t0810 = c.creneaux.find((x) => x.label === "08–10h")!;
    const t1012 = c.creneaux.find((x) => x.label === "10–12h")!;
    expect(t0810.presents).toBe(2);
    expect(t0810.niveau).toBe("complet");
    expect(t1012.presents).toBe(1);
    expect(t1012.niveau).toBe("partiel");
  });

  it("un même surveillant sur deux créneaux d'une tranche n'est compté qu'une fois", () => {
    const c = couvertureParCreneau({
      requis: 1,
      presences: [{ id: 7, slots: [{ debut: "08:00", fin: "09:00" }, { debut: "09:00", fin: "10:00" }] }],
    });
    expect(c.creneaux.find((x) => x.label === "08–10h")!.presents).toBe(1);
  });

  it("détecte un trou critique : tranche vide entre deux tranches actives", () => {
    // Présence 08–10h puis 14–16h → 10–14h sont des trous dans la plage active.
    const c = couvertureParCreneau({
      requis: 1,
      presences: [{ id: 1, slots: [{ debut: "08:00", fin: "10:00" }, { debut: "14:00", fin: "16:00" }] }],
    });
    const trous = c.creneaux.filter((x) => x.trou).map((x) => x.label);
    expect(trous).toEqual(["10–12h", "12–14h"]);
    expect(c.trousCritiques).toBe(2);
  });

  it("les tranches hors amplitude d'activité ne comptent pas comme trous", () => {
    // Session purement matinale : l'après-midi est « hors », pas un trou.
    const c = couvertureParCreneau({
      requis: 2,
      presences: [{ id: 1, slots: [{ debut: "08:00", fin: "12:00" }] }],
    });
    expect(c.trousCritiques).toBe(0);
    const apm = c.creneaux.find((x) => x.label === "16–18h")!;
    expect(apm.niveau).toBe("hors");
  });

  it("ignore les créneaux invalides (fin ≤ début)", () => {
    const c = couvertureParCreneau({
      requis: 1,
      presences: [{ id: 1, slots: [{ debut: "10:00", fin: "08:00" }] }],
    });
    expect(c.creneaux.every((x) => x.niveau === "hors")).toBe(true);
  });

  it("requis 0 → toute présence est considérée complète", () => {
    const c = couvertureParCreneau({
      requis: 0,
      presences: [{ id: 1, slots: [{ debut: "08:00", fin: "10:00" }] }],
    });
    expect(c.creneaux.find((x) => x.label === "08–10h")!.niveau).toBe("complet");
  });
});
