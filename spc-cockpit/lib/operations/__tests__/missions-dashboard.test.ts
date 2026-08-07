import { describe, it, expect } from "vitest";
import type { Affectation, Devis, DevisSalle, Incident, Mission } from "../types";
import {
  alertesMissions,
  candidatsMission,
  construireVueMissions,
  couvertureMission,
  formatHeuresCompact,
  isoDuJour,
  minutesPlanifiees,
  preparationMission,
  prochainesMissions,
  progressionMission,
  repartitionCA,
  selectionnerMissionActive,
  serieMensuelle,
  statsMissions,
} from "../missions-dashboard";

const NOW = new Date(2026, 6, 1, 10, 0, 0); // 1er juillet 2026, heure locale

function mission(p: Partial<Mission> & { id: number }): Mission {
  return {
    reference: `EX-2026-${String(p.id).padStart(3, "0")}`,
    client: "Client",
    type: "Examen écrit",
    nbSalles: 4,
    nbSurveillants: 10,
    montantHT: 1000,
    statut: "Planifiée",
    ...p,
  };
}

function affectation(p: Partial<Affectation> & { id: number; missionId: number }): Affectation {
  return { surveillantId: p.id, statut: "Confirmé", matin: false, apm: false, presence: "En attente", ...p };
}

const devisVide: Devis[] = [];

describe("sélection de la mission active", () => {
  it("privilégie « En cours », puis « Validée », puis « Planifiée »", () => {
    const list = [mission({ id: 1, statut: "Planifiée" }), mission({ id: 2, statut: "Validée" }), mission({ id: 3, statut: "En cours" })];
    expect(selectionnerMissionActive(list)?.id).toBe(3);
    expect(selectionnerMissionActive(list.slice(0, 2))?.id).toBe(2);
    expect(selectionnerMissionActive(list.slice(0, 1))?.id).toBe(1);
  });

  it("retourne undefined si aucune mission engagée", () => {
    expect(selectionnerMissionActive([mission({ id: 1, statut: "Terminée" })])).toBeUndefined();
  });
});

describe("KPI missions", () => {
  const missions = [
    mission({ id: 1, statut: "Terminée", montantHT: 2600, dateMission: "2026-05-26" }),
    mission({ id: 2, statut: "Facturée", montantHT: 5200, dateMission: "2026-05-23" }),
    mission({ id: 3, statut: "Planifiée", montantHT: 4042, dateMission: "2026-07-08" }),
    mission({ id: 4, statut: "Annulée", montantHT: 9999, dateMission: "2026-06-01" }),
    mission({ id: 5, statut: "À chiffrer", montantHT: 4000, dateMission: "2026-09-10" }),
  ];

  it("compte les missions engagées et clôturées sans les annulées", () => {
    const s = statsMissions(missions, NOW);
    expect(s.total).toBe(5);
    expect(s.enCours).toBe(1); // Planifiée
    expect(s.terminees).toBe(2); // Terminée + Facturée, pas Annulée
  });

  it("exclut les missions annulées du CA HT", () => {
    expect(statsMissions(missions, NOW).caHT).toBe(2600 + 5200 + 4042 + 4000);
  });

  it("masque la variation quand l'année N-1 n'a aucune donnée", () => {
    const s = statsMissions(missions, NOW);
    expect(s.variation.caHT).toBeNull();
    expect(s.variation.total).toBeNull();
  });

  it("calcule la variation N/N-1 quand l'antériorité existe", () => {
    const avecN1 = [...missions, mission({ id: 6, statut: "Terminée", montantHT: 8000, dateMission: "2025-05-12" })];
    const s = statsMissions(avecN1, NOW);
    // N = 15 842 € (annulée exclue) vs N-1 = 8 000 €
    expect(s.variation.caHT).toBeCloseTo((15842 - 8000) / 8000, 6);
  });

  it("produit une série mensuelle réelle alignée sur les mois demandés", () => {
    const serie = serieMensuelle(missions, NOW, 3); // mai, juin, juillet 2026
    expect(serie.labels).toEqual(["mai 26", "juin 26", "juil. 26"]);
    expect(serie.total).toEqual([2, 0, 1]); // l'annulée de juin est exclue
    expect(serie.caHT).toEqual([7800, 0, 4042]);
  });
});

describe("couverture, heures et préparation", () => {
  const m = mission({ id: 5, nbSurveillants: 14, nbSalles: 6, statut: "Planifiée" });
  const affs: Affectation[] = [
    affectation({ id: 1, missionId: 5, salle: "A21", matin: true, matinDebut: "08:00", matinFin: "14:00" }),
    affectation({ id: 2, missionId: 5, matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:00" }),
    affectation({ id: 3, missionId: 5 }), // proposé, sans créneau → non couvrant
    affectation({ id: 4, missionId: 5, salle: "E31", matin: true, matinDebut: "08:30", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:30" }),
    affectation({ id: 5, missionId: 5, salle: "AMP", apm: true, apmDebut: "13:00", apmFin: "19:00" }),
  ];

  it("ne compte comme affecté qu'un surveillant disposant d'un créneau", () => {
    const c = couvertureMission(m, affs);
    expect(c.affectes).toBe(4);
    expect(c.requis).toBe(14);
    expect(c.manque).toBe(10);
  });

  it("cumule les heures réellement planifiées (matin + après-midi)", () => {
    // 360 + (300+270) + (270+300) + 360 = 1860 min
    expect(minutesPlanifiees(affs)).toBe(1860);
    expect(formatHeuresCompact(1860)).toBe("31h00");
  });

  it("ignore un créneau incohérent au lieu de compter une durée négative", () => {
    const casse = [affectation({ id: 9, missionId: 5, matin: true, matinDebut: "14:00", matinFin: "08:00" })];
    expect(minutesPlanifiees(casse)).toBe(0);
  });

  it("formate les heures au format compact attendu", () => {
    expect(formatHeuresCompact(3360)).toBe("56h00");
    expect(formatHeuresCompact(7095)).toBe("118h15");
  });

  it("préparation : 4 axes de 25 points, deux proratisés", () => {
    const p = preparationMission({ mission: m, affectations: affs, devis: devisVide });
    // devis 25 (statut ≥ Acceptée) + 25×4/14 + 25×3/6 + planning 0 = 44,64 → 45
    expect(p.pourcentage).toBe(45);
    expect(p.etapes.map((e) => e.label)).toEqual([
      "Devis accepté",
      "Surveillants 4/14",
      "Salles 3/6",
      "Planning en cours",
    ]);
    expect(p.etapes.map((e) => e.fait)).toEqual([true, false, false, false]);
  });

  it("préparation à 100 % quand tout est couvert et le planning validé", () => {
    const complet = mission({ id: 7, nbSurveillants: 2, nbSalles: 2, statut: "Validée" });
    const a: Affectation[] = [
      affectation({ id: 1, missionId: 7, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
      affectation({ id: 2, missionId: 7, salle: "B", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
    ];
    const p = preparationMission({ mission: complet, affectations: a, devis: devisVide });
    expect(p.pourcentage).toBe(100);
    expect(p.etapes.every((e) => e.fait)).toBe(true);
  });

  it("un devis accepté rattaché vaut acceptation même sur une mission peu avancée", () => {
    const brouillon = mission({ id: 8, statut: "Brouillon", nbSurveillants: 1, nbSalles: 1 });
    const sans = preparationMission({ mission: brouillon, affectations: [], devis: devisVide });
    expect(sans.etapes[0].fait).toBe(false);
    const devis = [{ id: 1, reference: "D1", client: "C", statut: "Accepté", montantHT: 0, montantTTC: 0, nbSurveillants: 1, missionId: 8, coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 } as Devis];
    expect(preparationMission({ mission: brouillon, affectations: [], devis }).etapes[0].fait).toBe(true);
  });

  it("avancement : 100 % si clôturée, 0 % si annulée, préparation sinon", () => {
    expect(progressionMission({ mission: mission({ id: 1, statut: "Terminée" }), affectations: [], devis: devisVide })).toBe(100);
    expect(progressionMission({ mission: mission({ id: 2, statut: "Facturée" }), affectations: [], devis: devisVide })).toBe(100);
    expect(progressionMission({ mission: mission({ id: 3, statut: "Annulée" }), affectations: [], devis: devisVide })).toBe(0);
    expect(progressionMission({ mission: m, affectations: affs, devis: devisVide })).toBe(45);
  });
});

describe("cohérence affectés / requis / couverture / alertes", () => {
  it("aucune alerte de sous-effectif quand la couverture est complète", () => {
    const m = mission({ id: 1, statut: "En cours", nbSurveillants: 2, nbSalles: 1, dateMission: "2026-07-08" });
    const affs = [
      affectation({ id: 1, missionId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
      affectation({ id: 2, missionId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
    ];
    const c = couvertureMission(m, affs);
    expect(c.affectes).toBe(2);
    expect(c.tauxCouverture).toBe(1);
    const alertes = alertesMissions({ missions: [m], affectations: affs, incidents: [], now: NOW });
    expect(alertes.some((a) => a.id.startsWith("couverture-"))).toBe(false);
  });

  it("12/14 → couverture 86 % et une alerte « 2 surveillants manquants »", () => {
    const m = mission({ id: 1, statut: "En cours", nbSurveillants: 14, nbSalles: 1, dateMission: "2026-08-20" });
    const affs = Array.from({ length: 12 }, (_, i) =>
      affectation({ id: i + 1, missionId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" })
    );
    const c = couvertureMission(m, affs);
    expect(Math.round(c.tauxCouverture * 100)).toBe(86);
    const alertes = alertesMissions({ missions: [m], affectations: affs, incidents: [], now: NOW });
    const alerte = alertes.find((a) => a.id === "couverture-1");
    expect(alerte?.titre).toContain("2 surveillants manquants");
  });

  it("regroupe les missions à chiffrer en une seule alerte", () => {
    const missions = [mission({ id: 1, statut: "À chiffrer" }), mission({ id: 2, statut: "Brouillon" })];
    const alertes = alertesMissions({ missions, affectations: [], incidents: [], now: NOW });
    const chiffrage = alertes.filter((a) => a.id === "devis-a-chiffrer");
    expect(chiffrage).toHaveLength(1);
    expect(chiffrage[0].titre).toBe("Devis à chiffrer pour 2 missions");
  });

  it("remonte les incidents non résolus et trie le plus urgent en tête", () => {
    const incidents: Incident[] = [
      { id: 1, titre: "Fraude", gravite: "critique", statut: "Ouvert" },
      { id: 2, titre: "Retard", gravite: "mineur", statut: "Résolu" },
    ];
    const alertes = alertesMissions({ missions: [mission({ id: 1, statut: "Devis envoyé" })], affectations: [], incidents, now: NOW });
    expect(alertes[0].id).toBe("incidents-ouverts");
    expect(alertes[0].niveau).toBe("critique");
    expect(alertes[0].titre).toContain("1 incident non résolu");
  });

  it("aucune alerte quand tout est sain", () => {
    const m = mission({ id: 1, statut: "Validée", nbSurveillants: 1, nbSalles: 1, dateMission: "2026-09-01" });
    const affs = [affectation({ id: 1, missionId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" })];
    expect(alertesMissions({ missions: [m], affectations: affs, incidents: [], now: NOW })).toEqual([]);
  });
});

describe("prochaines missions à venir", () => {
  const missions = [
    mission({ id: 1, statut: "Terminée", dateMission: "2026-05-26" }),
    mission({ id: 2, statut: "Planifiée", dateMission: "2026-06-22" }), // passée
    mission({ id: 3, statut: "Planifiée", dateMission: "2026-07-08" }),
    mission({ id: 4, statut: "Annulée", dateMission: "2026-07-09" }),
    mission({ id: 5, statut: "À chiffrer", dateMission: "2026-09-15" }),
    mission({ id: 6, statut: "Planifiée", dateMission: "2026-08-03" }),
    mission({ id: 7, statut: "Planifiée", dateMission: "2026-10-01" }),
    mission({ id: 8, statut: "Planifiée" }), // sans date
  ];

  it("n'affiche jamais une mission passée, terminée ou annulée", () => {
    const p = prochainesMissions(missions, isoDuJour(NOW));
    expect(p.map((m) => m.id)).toEqual([3, 6, 5]);
    expect(p.some((m) => (m.dateMission as string) < "2026-07-01")).toBe(false);
  });

  it("trie par date croissante et limite le nombre de résultats", () => {
    const p = prochainesMissions(missions, "2026-01-01", 5);
    expect(p.map((m) => m.dateMission)).toEqual(["2026-06-22", "2026-07-08", "2026-08-03", "2026-09-15", "2026-10-01"]);
  });

  it("conserve la mission du jour (elle n'est pas passée)", () => {
    const p = prochainesMissions(missions, "2026-07-08");
    expect(p[0].id).toBe(3);
  });

  it("retourne une liste vide quand plus rien n'est à venir", () => {
    expect(prochainesMissions(missions, "2027-01-01")).toEqual([]);
  });

  it("isoDuJour utilise la date locale, pas UTC", () => {
    expect(isoDuJour(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
    expect(isoDuJour(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });
});

describe("répartition du CA HT", () => {
  const missions = [
    mission({ id: 1, statut: "Terminée", montantHT: 2600 }),
    mission({ id: 2, statut: "Facturée", montantHT: 5200 }),
    mission({ id: 3, statut: "En cours", montantHT: 4042 }),
    mission({ id: 4, statut: "À chiffrer", montantHT: 4000 }),
    mission({ id: 5, statut: "Annulée", montantHT: 9999 }),
  ];

  it("segmente en trois parts disjointes dont la somme est le CA total", () => {
    const r = repartitionCA(missions);
    expect(r.parts.map((p) => p.montant)).toEqual([7800, 4042, 4000]);
    expect(r.total).toBe(15842);
    expect(r.parts.reduce((s, p) => s + p.montant, 0)).toBe(r.total);
  });

  it("le total du donut est identique au KPI « CA total »", () => {
    expect(repartitionCA(missions).total).toBe(statsMissions(missions, NOW).caHT);
  });

  it("parts à zéro sans division par zéro quand il n'y a aucun CA", () => {
    const r = repartitionCA([]);
    expect(r.total).toBe(0);
    expect(r.parts.every((p) => p.part === 0)).toBe(true);
  });
});

describe("candidats dérivés du devis rattaché", () => {
  const m = mission({ id: 5 });
  const devis: Devis[] = [
    { id: 9, reference: "D9", client: "C", statut: "Accepté", montantHT: 100, montantTTC: 120, nbSurveillants: 2, missionId: 5, coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
  ];
  const salles: DevisSalle[] = [
    { id: 1, devisId: 9, session: "matin", salle: "A", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, ordre: 1 },
    { id: 2, devisId: 9, session: "matin", salle: "B", etudiants: 25, surveillants: 1, pmr: false, tiersTemps: false, ordre: 2 },
    { id: 3, devisId: 9, session: "apres-midi", salle: "A", etudiants: 40, surveillants: 1, pmr: false, tiersTemps: false, ordre: 1 },
  ];

  it("retient le pic de présence, jamais la somme des deux demi-journées", () => {
    expect(candidatsMission(m, devis, salles)).toBe(55);
  });

  it("retourne null sans devis rattaché — la donnée est masquée, pas inventée", () => {
    expect(candidatsMission(m, [], salles)).toBeNull();
    expect(candidatsMission(mission({ id: 99 }), devis, salles)).toBeNull();
  });
});

describe("vue consolidée de la page", () => {
  const missions = [
    mission({ id: 5, statut: "En cours", client: "ICP Paris", nbSurveillants: 2, nbSalles: 2, montantHT: 4042, dateMission: "2026-07-08" }),
    mission({ id: 4, statut: "Terminée", montantHT: 2600, dateMission: "2026-05-26" }),
  ];
  const affs = [
    affectation({ id: 1, missionId: 5, salle: "A21", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
    affectation({ id: 2, missionId: 5, salle: "A22", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
  ];

  it("les chiffres du bandeau, des alertes et du tableau concordent", () => {
    const vue = construireVueMissions({ missions, affectations: affs, devis: devisVide, devisSalles: [], incidents: [], now: NOW });
    expect(vue.active?.mission.id).toBe(5);
    expect(vue.active?.couverture.affectes).toBe(2);
    expect(vue.active?.couverture.tauxCouverture).toBe(1);
    expect(vue.active?.preparation.etapes[1].label).toBe("Surveillants 2/2");
    expect(vue.alertes.some((a) => a.id === "couverture-5")).toBe(false);
    expect(vue.lignes.find((l) => l.mission.id === 5)?.surveillantsAffectes).toBe(2);
    expect(vue.lignes.find((l) => l.mission.id === 5)?.avancement).toBe(vue.active?.preparation.pourcentage);
    expect(vue.ca.total).toBe(vue.stats.caHT);
  });

  it("distingue « aucun surveillant affecté » de « affectations non suivies »", () => {
    const vue = construireVueMissions({ missions, affectations: affs, devis: devisVide, devisSalles: [], incidents: [], now: NOW });
    // La mission 5 a des affectations enregistrées, la 4 n'en a aucune :
    // l'écran affichera « 2/2 surv. » d'un côté et l'effectif requis de l'autre.
    expect(vue.lignes.find((l) => l.mission.id === 5)?.affectationsSuivies).toBe(2);
    expect(vue.lignes.find((l) => l.mission.id === 4)?.affectationsSuivies).toBe(0);
    expect(vue.active?.affectationsSuivies).toBe(2);
  });

  it("gère l'absence de mission active sans casser la page", () => {
    const vue = construireVueMissions({
      missions: [mission({ id: 1, statut: "Terminée", dateMission: "2026-01-05" })],
      affectations: [], devis: devisVide, devisSalles: [], incidents: [], now: NOW,
    });
    expect(vue.active).toBeNull();
    expect(vue.prochaines).toEqual([]);
    expect(vue.lignes).toHaveLength(1);
  });

  it("gère l'absence totale de mission", () => {
    const vue = construireVueMissions({ missions: [], affectations: [], devis: devisVide, devisSalles: [], incidents: [], now: NOW });
    expect(vue.stats.total).toBe(0);
    expect(vue.stats.caHT).toBe(0);
    expect(vue.alertes).toEqual([]);
    expect(vue.lignes).toEqual([]);
  });
});
