import { describe, it, expect } from "vitest";
import type { Affectation, Amenagement, Mission, Salle } from "../types";
import {
  COEFFICIENT_TIERS_TEMPS, conflitsAmenagement, conformiteAmenagement, construireVuePMR,
  creneauxSalle, dureeEffectiveMinutes, formatDuree, memeSalle, referenceAmenagement, statutAmenagement,
} from "../pmr-vue";

const MISSION: Mission = {
  id: 1, reference: "EX-2026-001", client: "ICP Paris", type: "Examen écrit",
  nbSalles: 4, nbSurveillants: 6, montantHT: 4000, statut: "En cours", dateMission: "2026-07-08",
};

function salle(p: Partial<Salle> & { id: number; nom: string }): Salle {
  return { batiment: "A", capacite: 30, etudiants: 0, nbSurveillants: 1, pmr: false, tiersTemps: false, ...p };
}

function aff(p: Partial<Affectation> & { id: number }): Affectation {
  return { missionId: 1, surveillantId: p.id, statut: "Confirmé", matin: false, apm: false, presence: "En attente", ...p };
}

describe("format et règle du tiers-temps", () => {
  it("formate une durée en HHhMM", () => {
    expect(formatDuree(140)).toBe("02h20");
    expect(formatDuree(160)).toBe("02h40");
    expect(formatDuree(0)).toBe("00h00");
    expect(formatDuree(605)).toBe("10h05");
  });

  it("majore la durée d'un tiers pour un tiers-temps", () => {
    expect(COEFFICIENT_TIERS_TEMPS).toBeCloseTo(4 / 3, 10);
    // 2 h d'épreuve → 2 h 40 avec tiers-temps
    expect(dureeEffectiveMinutes({ debut: "10:00", fin: "12:00" }, true)).toBe(160);
    expect(formatDuree(dureeEffectiveMinutes({ debut: "10:00", fin: "12:00" }, true))).toBe("02h40");
  });

  it("laisse la durée intacte sans tiers-temps", () => {
    expect(dureeEffectiveMinutes({ debut: "09:00", fin: "11:00" }, false)).toBe(120);
  });

  it("retourne 0 quand l'horaire est inconnu — jamais une durée inventée", () => {
    expect(dureeEffectiveMinutes(null, true)).toBe(0);
  });

  it("dérive une référence stable de l'identifiant", () => {
    expect(referenceAmenagement(1)).toBe("ETU-001");
    expect(referenceAmenagement(42)).toBe("ETU-042");
  });
});

describe("normalisation des noms de salle", () => {
  it("réconcilie « Salle E31 » du référentiel et « E31 » d'un aménagement", () => {
    expect(memeSalle("Salle E31", "E31")).toBe(true);
    expect(memeSalle("E31", " salle e31 ")).toBe(true);
    expect(memeSalle("E31", "E32")).toBe(false);
    expect(memeSalle("", "E31")).toBe(false);
    expect(memeSalle(undefined, undefined)).toBe(false);
  });
});

describe("créneaux dérivés de la salle", () => {
  const affectations = [
    aff({ id: 1, salle: "E31", matin: true, matinDebut: "09:00", matinFin: "11:00" }),
    aff({ id: 2, salle: "E31", apm: true, apmDebut: "14:00", apmFin: "16:00" }),
    aff({ id: 3, salle: "E31", matin: true, matinDebut: "09:00", matinFin: "11:00" }), // doublon
    aff({ id: 4, salle: "B11", matin: true, matinDebut: "10:00", matinFin: "12:00" }),
  ];

  it("liste les créneaux réels, dédoublonnés et triés — jamais l'amplitude de la journée", () => {
    expect(creneauxSalle("E31", affectations)).toEqual([
      { debut: "09:00", fin: "11:00" },
      { debut: "14:00", fin: "16:00" },
    ]);
  });

  it("reconnaît la salle malgré la casse et le préfixe du référentiel", () => {
    expect(creneauxSalle("Salle E31", affectations)).toHaveLength(2);
  });

  it("retourne une liste vide sans créneau planifié", () => {
    expect(creneauxSalle("Z99", affectations)).toEqual([]);
    expect(creneauxSalle("E31", [])).toEqual([]);
  });

  it("écarte les créneaux invalides", () => {
    expect(creneauxSalle("X1", [aff({ id: 9, salle: "X1", matin: true, matinDebut: "12:00", matinFin: "09:00" })])).toEqual([]);
  });
});

describe("conformité d'un aménagement", () => {
  const sallePMR = salle({ id: 1, nom: "E31", pmr: true, tiersTemps: true });

  it("bloque quand aucun surveillant dédié n'est affecté", () => {
    const r = conformiteAmenagement({ id: 1, amenagement: "Tiers-temps", salle: "E31", tiersTemps: true }, sallePMR);
    expect(r.conformite).toBe("Surv. manquant");
    expect(r.motif).toContain("surveillant dédié");
  });

  it("demande confirmation quand la salle est absente du référentiel", () => {
    const r = conformiteAmenagement({ id: 1, amenagement: "Tiers-temps", salle: "ZZ9", tiersTemps: true, surveillant: "Thomas Girard" }, undefined);
    expect(r.conformite).toBe("À confirmer");
    expect(r.motif).toContain("ZZ9");
  });

  it("demande confirmation quand la salle n'est pas marquée PMR", () => {
    const r = conformiteAmenagement(
      { id: 1, amenagement: "PMR — Fauteuil roulant", salle: "A10", tiersTemps: false, surveillant: "Thomas Girard" },
      salle({ id: 2, nom: "A10", pmr: false })
    );
    expect(r.conformite).toBe("À confirmer");
    expect(r.motif).toContain("PMR");
  });

  it("demande confirmation quand la salle n'est pas marquée tiers-temps", () => {
    const r = conformiteAmenagement(
      { id: 1, amenagement: "Tiers-temps", salle: "A10", tiersTemps: true, surveillant: "Sophie Dubois" },
      salle({ id: 2, nom: "A10", tiersTemps: false })
    );
    expect(r.conformite).toBe("À confirmer");
  });

  it("est conforme quand surveillant et salle correspondent au besoin", () => {
    const r = conformiteAmenagement({ id: 1, amenagement: "PMR — Fauteuil roulant", salle: "E31", tiersTemps: true, surveillant: "Thomas Girard" }, sallePMR);
    expect(r.conformite).toBe("Conforme");
    expect(r.motif).toBe("");
  });
});

describe("statut d'aménagement", () => {
  it("classe isolement, PMR et tiers-temps", () => {
    expect(statutAmenagement({ id: 1, amenagement: "Isolement — candidat seul", tiersTemps: false })).toBe("Isolé");
    expect(statutAmenagement({ id: 2, amenagement: "PMR — Fauteuil roulant", tiersTemps: true })).toBe("Salle dédiée");
    expect(statutAmenagement({ id: 3, amenagement: "Tiers-temps + secrétaire", tiersTemps: true })).toBe("Tiers-temps");
    expect(statutAmenagement({ id: 4, amenagement: "Secrétaire", tiersTemps: false })).toBe("Aménagement");
  });
});

describe("conflits entre aménagements", () => {
  const base = { dureeMinutes: 120, dureeLabel: "02h00", tiersTemps: false, statut: "Tiers-temps" as const, conformite: "Conforme" as const, motif: "" };

  it("détecte deux salles simultanées pour le même surveillant", () => {
    const c = conflitsAmenagement([
      { id: 1, reference: "ETU-001", libelle: "A", salle: "E31", horaire: { debut: "09:00", fin: "11:00" }, surveillant: "Thomas Girard", ...base },
      { id: 2, reference: "ETU-002", libelle: "B", salle: "B11", horaire: { debut: "10:00", fin: "12:00" }, surveillant: "Thomas Girard", ...base },
    ]);
    expect(c).toHaveLength(1);
  });

  it("ne signale rien pour deux aménagements dans la même salle", () => {
    const c = conflitsAmenagement([
      { id: 1, reference: "ETU-001", libelle: "A", salle: "E31", horaire: { debut: "09:00", fin: "11:00" }, surveillant: "Thomas Girard", ...base },
      { id: 2, reference: "ETU-002", libelle: "B", salle: "E31", horaire: { debut: "09:00", fin: "11:00" }, surveillant: "Thomas Girard", ...base },
    ]);
    expect(c).toEqual([]);
  });

  it("ne signale rien pour des surveillants différents ni des horaires disjoints", () => {
    expect(conflitsAmenagement([
      { id: 1, reference: "ETU-001", libelle: "A", salle: "E31", horaire: { debut: "09:00", fin: "11:00" }, surveillant: "Thomas Girard", ...base },
      { id: 2, reference: "ETU-002", libelle: "B", salle: "B11", horaire: { debut: "10:00", fin: "12:00" }, surveillant: "Sophie Dubois", ...base },
    ])).toEqual([]);
    expect(conflitsAmenagement([
      { id: 1, reference: "ETU-001", libelle: "A", salle: "E31", horaire: { debut: "09:00", fin: "11:00" }, surveillant: "Thomas Girard", ...base },
      { id: 2, reference: "ETU-002", libelle: "B", salle: "B11", horaire: { debut: "11:00", fin: "13:00" }, surveillant: "Thomas Girard", ...base },
    ])).toEqual([]);
  });
});

describe("vue consolidée PMR", () => {
  const salles = [
    salle({ id: 1, nom: "E31", pmr: true, tiersTemps: true, capacite: 20, etudiants: 3 }),
    salle({ id: 2, nom: "B11", pmr: true, tiersTemps: true, capacite: 30, etudiants: 2 }),
    salle({ id: 3, nom: "A10", capacite: 50, etudiants: 40 }), // ni PMR ni tiers-temps
  ];
  const affectations = [
    aff({ id: 1, salle: "E31", matin: true, matinDebut: "09:00", matinFin: "11:00" }),
    aff({ id: 2, salle: "B11", matin: true, matinDebut: "10:00", matinFin: "12:00" }),
  ];
  const amenagements: Amenagement[] = [
    { id: 1, amenagement: "PMR — Fauteuil roulant", salle: "E31", tiersTemps: false, surveillant: "Thomas Girard" },
    { id: 2, amenagement: "Tiers-temps", salle: "B11", tiersTemps: true, surveillant: "Sophie Dubois" },
    { id: 3, amenagement: "Tiers-temps", salle: "B11", tiersTemps: true }, // sans surveillant
  ];

  const vue = construireVuePMR({ amenagements, salles, affectations, mission: MISSION });

  it("dérive horaire et durée depuis le créneau réel de la salle", () => {
    const l1 = vue.lignes.find((l) => l.id === 1)!;
    expect(l1.horaire).toEqual({ debut: "09:00", fin: "11:00" });
    expect(l1.dureeLabel).toBe("02h00"); // sans tiers-temps

    const l2 = vue.lignes.find((l) => l.id === 2)!;
    expect(l2.horaire).toEqual({ debut: "10:00", fin: "12:00" });
    expect(l2.dureeLabel).toBe("02h40"); // 2 h majorées d'1/3
  });

  it("attribue un créneau distinct à chaque aménagement d'une même salle", () => {
    const deuxCreneaux = construireVuePMR({
      amenagements: [
        { id: 1, amenagement: "PMR — Fauteuil roulant", salle: "E31", tiersTemps: false, surveillant: "Thomas Girard" },
        { id: 2, amenagement: "PMR — Malvoyant", salle: "E31", tiersTemps: false, surveillant: "Thomas Girard" },
      ],
      salles,
      affectations: [
        aff({ id: 1, salle: "E31", matin: true, matinDebut: "09:00", matinFin: "11:00" }),
        aff({ id: 2, salle: "E31", apm: true, apmDebut: "14:00", apmFin: "16:00" }),
      ],
      mission: MISSION,
    });
    expect(deuxCreneaux.lignes[0].horaire).toEqual({ debut: "09:00", fin: "11:00" });
    expect(deuxCreneaux.lignes[1].horaire).toEqual({ debut: "14:00", fin: "16:00" });
  });

  it("réconcilie le référentiel « Salle E31 » avec l'aménagement « E31 »", () => {
    const avecPrefixe = construireVuePMR({
      amenagements,
      salles: salles.map((s) => ({ ...s, nom: `Salle ${s.nom}` })),
      affectations,
      mission: MISSION,
    });
    // la cartographie retrouve bien le surveillant du tableau : aucune contradiction
    expect(avecPrefixe.salles.find((s) => s.nom === "Salle E31")?.surveillant).toBe("Thomas Girard");
    expect(avecPrefixe.nbSallesActives).toBe(2);
  });

  it("compte les KPI depuis les données réelles", () => {
    expect(vue.nbAmenagements).toBe(3);
    expect(vue.nbSallesDediees).toBe(2); // A10 n'est ni PMR ni tiers-temps
    expect(vue.nbSallesActives).toBe(2); // E31 et B11 ont des créneaux
    expect(vue.nbTiersTemps).toBe(2);
    expect(vue.nbActionsRequises).toBe(1); // l'aménagement sans surveillant
  });

  it("la couverture est le taux d'aménagements conformes", () => {
    expect(vue.couverture).toBeCloseTo(2 / 3, 6);
    expect(vue.repartition.couvertureGlobale).toBe(vue.couverture);
  });

  it("remonte une action immédiate par type d'écart, jamais plus", () => {
    const ids = vue.actions.map((a) => a.id);
    expect(ids).toContain("surveillant-manquant");
    expect(new Set(ids).size).toBe(ids.length);
    expect(vue.actions.find((a) => a.id === "surveillant-manquant")?.niveau).toBe("critique");
  });

  it("la cartographie ne retient que les salles dédiées, avec leur occupation", () => {
    expect(vue.salles.map((s) => s.nom)).toEqual(["E31", "B11"]);
    const e31 = vue.salles.find((s) => s.nom === "E31")!;
    expect(e31.occupation).toBeCloseTo(3 / 20, 6);
    expect(e31.enCours).toBe(true);
    expect(e31.surveillant).toBe("Thomas Girard");
  });

  it("aucune action ni écart quand tout est conforme", () => {
    const propre = construireVuePMR({
      amenagements: [amenagements[0]], salles, affectations, mission: MISSION,
    });
    expect(propre.nbActionsRequises).toBe(0);
    expect(propre.actions).toEqual([]);
    expect(propre.couverture).toBe(1);
  });

  it("sans session active, les horaires sont inconnus mais la page tient", () => {
    const sansMission = construireVuePMR({ amenagements, salles, affectations, mission: null });
    expect(sansMission.lignes.every((l) => l.horaire === null)).toBe(true);
    expect(sansMission.lignes.every((l) => l.dureeLabel === "—")).toBe(true);
    expect(sansMission.nbAmenagements).toBe(3);
  });

  it("gère l'absence totale d'aménagement", () => {
    const vide = construireVuePMR({ amenagements: [], salles, affectations, mission: MISSION });
    expect(vide.nbAmenagements).toBe(0);
    expect(vide.couverture).toBe(0);
    expect(vide.actions).toEqual([]);
  });
});
