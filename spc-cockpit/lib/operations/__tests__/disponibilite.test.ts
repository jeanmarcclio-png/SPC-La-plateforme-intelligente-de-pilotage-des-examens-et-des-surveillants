import { describe, it, expect } from "vitest";
import { etatJour, moisJours, estWeekend, chargeMensuelle, heuresAffectation } from "../disponibilite";
import type { Affectation } from "../types";

function aff(id: number, missionId: number, surveillantId: number, matin: [string, string][], apm: [string, string][]): Affectation {
  return {
    id, missionId, surveillantId, statut: "Confirmé",
    matin: matin.length > 0, matinCreneaux: matin.map(([debut, fin]) => ({ debut, fin })),
    apm: apm.length > 0, apmCreneaux: apm.map(([debut, fin]) => ({ debut, fin })),
    presence: "En attente",
  };
}

describe("etatJour", () => {
  it("indisponible prime sur tout", () => expect(etatJour(6, true)).toBe("indispo"));
  it("aucune heure → libre", () => expect(etatJour(0, false)).toBe("libre"));
  it("moins de 5h → demi-journée", () => expect(etatJour(3, false)).toBe("demi"));
  it("5h ou plus → charge", () => { expect(etatJour(5, false)).toBe("charge"); expect(etatJour(9.5, false)).toBe("charge"); });
});

describe("moisJours & estWeekend", () => {
  it("juillet 2026 = 31 jours, du 01 au 31", () => {
    const j = moisJours(2026, 6);
    expect(j).toHaveLength(31);
    expect(j[0]).toBe("2026-07-01");
    expect(j[30]).toBe("2026-07-31");
  });
  it("février 2026 = 28 jours", () => expect(moisJours(2026, 1)).toHaveLength(28));
  it("détecte les week-ends", () => {
    expect(estWeekend("2026-07-04")).toBe(true); // samedi
    expect(estWeekend("2026-07-05")).toBe(true); // dimanche
    expect(estWeekend("2026-07-06")).toBe(false); // lundi
  });
});

describe("heuresAffectation", () => {
  it("somme matin + après-midi", () => {
    expect(heuresAffectation(aff(1, 1, 1, [["08:30", "13:00"]], [["13:30", "18:30"]]))).toBeCloseTo(9.5, 5);
  });
  it("ignore les créneaux invalides", () => {
    expect(heuresAffectation(aff(1, 1, 1, [["10:00", "08:00"]], []))).toBe(0);
  });
});

describe("chargeMensuelle", () => {
  const jours = moisJours(2026, 6);
  const surveillants = [
    { id: 1, nom: "Marie", role: "Coordinatrice", statut: "Planifié" },
    { id: 2, nom: "Karim", role: "Surveillant salle", statut: "Indisponible" },
  ];
  const missions = [{ id: 10, dateMission: "2026-07-08" }, { id: 11, dateMission: "2026-08-01" }];
  const affectations = [
    aff(101, 10, 1, [["08:00", "14:00"]], []), // Marie le 08/07 → 6h → charge
    aff(102, 11, 1, [["08:00", "10:00"]], []), // Marie le 01/08 → hors mois, ignoré
  ];

  it("colore le jour affecté en 'charge' et le reste en 'libre'", () => {
    const rows = chargeMensuelle({ surveillants, affectations, missions, jours });
    const marie = rows.find((r) => r.surveillantId === 1)!;
    const j08 = marie.jours.find((c) => c.date === "2026-07-08")!;
    expect(j08.heures).toBeCloseTo(6, 5);
    expect(j08.etat).toBe("charge");
    expect(marie.totalSessions).toBe(1); // le 01/08 est hors mois
    const j09 = marie.jours.find((c) => c.date === "2026-07-09")!;
    expect(j09.etat).toBe("libre");
  });

  it("un surveillant indisponible sans affectation → jours 'indispo'", () => {
    const rows = chargeMensuelle({ surveillants, affectations, missions, jours });
    const karim = rows.find((r) => r.surveillantId === 2)!;
    expect(karim.jours.every((c) => c.etat === "indispo")).toBe(true);
  });
});
