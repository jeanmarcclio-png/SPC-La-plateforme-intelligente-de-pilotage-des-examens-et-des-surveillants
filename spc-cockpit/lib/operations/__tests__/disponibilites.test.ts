import { describe, it, expect } from "vitest";
import {
  dureeCreneauHeures,
  heuresAffectation,
  aUnCreneau,
  computeMissionKpis,
  buildGrilleDispo,
  besoinsParJour,
  couvertureMoyenne,
} from "../disponibilites";
import type { Affectation, Surveillant } from "../types";

function surv(partial: Partial<Surveillant> & { id: number }): Surveillant {
  return {
    nom: `Surv ${partial.id}`,
    role: "Surveillant salle",
    statut: "Disponible",
    nbExamens: 0,
    heures: 0,
    note: 4.5,
    tauxHoraire: 18,
    ...partial,
  };
}

function aff(partial: Partial<Affectation> & { id: number; surveillantId: number }): Affectation {
  return {
    missionId: 5,
    roleMission: "Surveillant salle",
    statut: "Confirmé",
    matin: false,
    apm: false,
    presence: "En attente",
    ...partial,
  };
}

describe("durée & heures d'affectation", () => {
  it("calcule la durée d'un créneau (cas de référence 08:30→11:30 = 3h)", () => {
    expect(dureeCreneauHeures("08:30", "11:30")).toBe(3);
  });

  it("retourne 0 pour un créneau invalide ou négatif", () => {
    expect(dureeCreneauHeures("14:00", "13:00")).toBe(0);
    expect(dureeCreneauHeures("08:00", undefined)).toBe(0);
    expect(dureeCreneauHeures("bla", "10:00")).toBe(0);
  });

  it("somme matin + après-midi d'une affectation", () => {
    const a = aff({ id: 1, surveillantId: 1, matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:00" });
    expect(heuresAffectation(a)).toBe(9.5);
  });

  it("utilise les créneaux multiples si présents (table enfant §29)", () => {
    const a = aff({
      id: 1,
      surveillantId: 1,
      matin: true,
      matinCreneaux: [{ debut: "08:00", fin: "10:00" }, { debut: "10:30", fin: "12:00" }],
    });
    expect(heuresAffectation(a)).toBe(3.5);
  });

  it("détecte une affectation avec au moins un créneau", () => {
    expect(aUnCreneau(aff({ id: 1, surveillantId: 1, matin: true }))).toBe(true);
    expect(aUnCreneau(aff({ id: 2, surveillantId: 2 }))).toBe(false);
  });
});

describe("computeMissionKpis", () => {
  const surveillants = [
    surv({ id: 1, heures: 108 }), // surcharge
    surv({ id: 2, heures: 61 }),
    surv({ id: 3, heures: 22 }),
  ];
  const affectations = [
    aff({ id: 1, surveillantId: 1, matin: true, matinDebut: "08:00", matinFin: "12:00" }), // 4h
    aff({ id: 2, surveillantId: 2, apm: true, apmDebut: "14:00", apmFin: "18:00" }), // 4h
    aff({ id: 3, surveillantId: 3 }), // pas de créneau → non affecté
  ];

  it("compte les affectés, le manque et la couverture", () => {
    const k = computeMissionKpis({ missionRequis: 4, affectations, surveillants, seuilSurcharge: 100 });
    expect(k.affectes).toBe(2);
    expect(k.requis).toBe(4);
    expect(k.postesRestants).toBe(2);
    expect(k.couverturePct).toBe(50);
    expect(k.heuresPlanifiees).toBe(8);
    expect(k.nbCreneaux).toBe(2);
  });

  it("le besoin ne descend jamais sous le nombre d'affectés", () => {
    const k = computeMissionKpis({ missionRequis: 1, affectations, surveillants, seuilSurcharge: 100 });
    expect(k.requis).toBe(2);
    expect(k.postesRestants).toBe(0);
    expect(k.couverturePct).toBe(100);
  });

  it("remonte le risque de fatigue (≥ seuil)", () => {
    const k = computeMissionKpis({ missionRequis: 4, affectations, surveillants, seuilSurcharge: 100 });
    expect(k.risqueFatigue).toBe(1);
    expect(k.fatigueNoms).toEqual(["Surv 1"]);
  });
});

describe("buildGrilleDispo", () => {
  const surveillants = [
    surv({ id: 1, statut: "Disponible" }),
    surv({ id: 2, statut: "Indisponible" }),
    surv({ id: 3, statut: "Annulé" }),
  ];

  it("produit une ligne par surveillant et une colonne par jour du mois", () => {
    const g = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 }); // juillet = 31 jours
    expect(g.lignes).toHaveLength(3);
    expect(g.jours).toHaveLength(31);
    expect(g.lignes[0].cells).toHaveLength(31);
  });

  it("marque les week-ends non ouvrés", () => {
    // 2026-07-04 est un samedi, 2026-07-05 un dimanche.
    const g = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });
    const sam = g.jours.find((j) => j.jour === 4)!;
    const dim = g.jours.find((j) => j.jour === 5)!;
    expect(sam.weekend).toBe(true);
    expect(dim.weekend).toBe(true);
    expect(g.lignes[0].cells[3].type).toBe("non-ouvre");
  });

  it("un surveillant annulé ou indisponible est indisponible tous les jours ouvrés", () => {
    const g = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });
    for (const idx of [1, 2]) { // id2 Indisponible, id3 Annulé
      const ouvres = g.lignes[idx].cells.filter((c) => !c.weekend);
      expect(ouvres.every((c) => c.type === "indispo")).toBe(true);
    }
  });

  it("dérive la disponibilité déclarée : une demi-journée « Non » → demi", () => {
    const survs = [surv({ id: 1, statut: "Disponible", dispoMatin: "08:00–13:00", dispoApm: "Non" })];
    const g = buildGrilleDispo({ surveillants: survs, affectations: [], annee: 2026, mois: 6 });
    const ouvre = g.lignes[0].cells.find((c) => !c.weekend)!;
    expect(ouvre.type).toBe("demi");
  });

  it("les deux demi-journées « Non » → indisponible", () => {
    const survs = [surv({ id: 1, statut: "Disponible", dispoMatin: "Non", dispoApm: "Non" })];
    const g = buildGrilleDispo({ surveillants: survs, affectations: [], annee: 2026, mois: 6 });
    const ouvre = g.lignes[0].cells.find((c) => !c.weekend)!;
    expect(ouvre.type).toBe("indispo");
  });

  it("n'invente aucune heure hors des affectations réelles", () => {
    const g = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });
    expect(g.lignes.every((l) => l.totalHeures === 0)).toBe(true);
  });

  it("est déterministe (même entrée → même sortie)", () => {
    const a = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });
    const b = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });
    expect(JSON.stringify(a.lignes)).toBe(JSON.stringify(b.lignes));
  });

  it("peint le jour de mission avec les heures réelles de l'affectation", () => {
    const affectations = [
      aff({ id: 1, surveillantId: 1, missionId: 5, matin: true, matinDebut: "08:00", matinFin: "14:00" }), // 6h
    ];
    const g = buildGrilleDispo({
      surveillants,
      affectations,
      missionDates: { 5: "2026-07-08" },
      annee: 2026,
      mois: 6,
    });
    const cell = g.lignes[0].cells.find((c) => c.jour === 8)!;
    expect(cell.type).toBe("affecte");
    expect(cell.heures).toBe(6);
    // Un jour ordinaire sans affectation reste « libre » (0 h).
    const autre = g.lignes[0].cells.find((c) => c.jour === 7)!;
    expect(autre.type).toBe("libre");
    expect(autre.heures).toBe(0);
  });
});

describe("besoinsParJour & couvertureMoyenne", () => {
  const surveillants = [surv({ id: 1, statut: "Planifié" }), surv({ id: 2, statut: "Disponible" })];
  const g = buildGrilleDispo({ surveillants, affectations: [], annee: 2026, mois: 6 });

  it("agrège disponibles/affectés/heures par jour", () => {
    const jours = besoinsParJour(g);
    expect(jours).toHaveLength(31);
    // Les week-ends n'ont aucune disponibilité.
    const weekend = jours.find((j) => j.weekend)!;
    expect(weekend.disponibles).toBe(0);
    expect(weekend.heures).toBe(0);
  });

  it("affectés ≤ disponibles chaque jour", () => {
    for (const j of besoinsParJour(g)) {
      expect(j.affectes).toBeLessThanOrEqual(j.disponibles);
    }
  });

  it("retourne une couverture moyenne entre 0 et 100", () => {
    const cov = couvertureMoyenne(besoinsParJour(g));
    expect(cov).toBeGreaterThanOrEqual(0);
    expect(cov).toBeLessThanOrEqual(100);
  });
});
