// Non-régression des chantiers 4 et 6 — BUG-014, BUG-017, BUG-018, BUG-019,
// BUG-020, BUG-021. Chaque test reproduit le constat exact de l'audit.

import { describe, it, expect } from "vitest";
import { buildCockpitView, temporaliteSession } from "../cockpit";
import { buildCoverage, buildSessions } from "../dashboard";
import { preparationMission } from "../missions-dashboard";
import type { Affectation, Devis, Mission, Salle, Surveillant } from "../types";

function mission(p: Partial<Mission> & Pick<Mission, "id">): Mission {
  return {
    reference: `EX-${p.id}`, client: "ICP Paris", type: "Examen",
    nbSalles: 2, nbSurveillants: 4, montantHT: 1000, statut: "En cours", ...p,
  };
}
function aff(id: number, missionId: number, surveillantId: number, salle?: string): Affectation {
  return {
    id, missionId, surveillantId, statut: "Confirmée", salle,
    matin: true, matinDebut: "08:30", matinFin: "12:30", apm: false, presence: "En attente",
  };
}
const surveillants: Surveillant[] = [10, 11, 12, 13].map((id) => ({
  id, nom: `Surveillant ${id}`, role: "Surveillant salle", statut: "Disponible" as const,
  nbExamens: 1, heures: 10, note: 4, tauxHoraire: 30,
}));
const salles: Salle[] = [
  { id: 1, nom: "A21", capacite: 60, etudiants: 50, nbSurveillants: 2, pmr: false, tiersTemps: false },
];

// ---------------------------------------------------------------------------

describe("BUG-014 — le cockpit ne présente pas une session close comme « en direct »", () => {
  // Relevé de l'audit : le 8 août 2026 à 13:48, une session datée du 30 juillet
  // affichait « PRISES DE POSTE À VENIR : 2 · dans les 2 prochaines heures » et
  // un curseur temps réel à 13:48 sur la frise.
  const now = new Date("2026-08-08T13:48:00");

  it("situe une session vieille de 9 jours comme clôturée", () => {
    const t = temporaliteSession("2026-07-30", now);
    expect(t.jour).toBe("passee");
    expect(t.ecartJours).toBe(-9);
    expect(t.tempsReel).toBe(false);
    expect(t.libelle).toContain("clôturée depuis 9 jours");
  });

  it("situe une session à venir sans autoriser le temps réel", () => {
    const t = temporaliteSession("2026-08-12", now);
    expect(t.jour).toBe("avenir");
    expect(t.ecartJours).toBe(4);
    expect(t.tempsReel).toBe(false);
  });

  it("n'autorise le temps réel QUE le jour même", () => {
    expect(temporaliteSession("2026-08-08", now).tempsReel).toBe(true);
    expect(temporaliteSession("2026-08-08", now).jour).toBe("aujourdhui");
  });

  it("refuse le temps réel sur une session sans date", () => {
    expect(temporaliteSession(undefined, now).tempsReel).toBe(false);
  });

  it("supprime curseur et prises de poste sur une session close", () => {
    const m = mission({ id: 1, dateMission: "2026-07-30" });
    const v = buildCockpitView({
      missions: [m],
      affectations: [aff(1, 1, 10, "A21"), aff(2, 1, 11, "A21")],
      surveillants, salles, now,
    });
    expect(v.temporalite.tempsReel).toBe(false);
    expect(v.timeline.nowPct).toBeNull();
    expect(v.kpis.prisesDePoste).toBe(0);
    // Aucun créneau ne se dit « En cours » sur une session terminée.
    expect(v.sessions.every((s) => s.matin?.etat !== "En cours")).toBe(true);
  });

  it("conserve curseur et prises de poste le jour de la session", () => {
    const m = mission({ id: 1, dateMission: "2026-08-08" });
    const v = buildCockpitView({
      missions: [m],
      affectations: [aff(1, 1, 10, "A21"), aff(2, 1, 11, "A21")],
      surveillants, salles,
      now: new Date("2026-08-08T08:00:00"),
    });
    expect(v.temporalite.tempsReel).toBe(true);
    expect(v.timeline.nowPct).not.toBeNull();
    expect(v.kpis.prisesDePoste).toBe(2); // deux créneaux à 08:30, dans les 2 h
  });
});

describe("BUG-019 — la date du cockpit est en toutes lettres, comme ailleurs", () => {
  it("n'affiche plus « ICP Paris — 2026-07-30 »", () => {
    const v = buildCockpitView({
      missions: [mission({ id: 1, dateMission: "2026-07-30" })],
      affectations: [aff(1, 1, 10, "A21")],
      surveillants, salles,
      now: new Date("2026-08-08T13:48:00"),
    });
    expect(v.missionLabel).not.toContain("2026-07-30");
    expect(v.missionLabel).toContain("30 juillet 2026");
    expect(v.dateLabel).toBe("30 juillet 2026");
  });
});

describe("BUG-020 — le KPI Confirmations compte les postes requis", () => {
  it("ne dit plus 100 % quand des postes ne sont pas pourvus", () => {
    // 4 postes requis, 2 affectations, les 2 présentes. L'ancien dénominateur
    // (nombre d'affectations) donnait « 100 % · 2/2 confirmés ».
    const affs = [aff(1, 1, 10, "A21"), aff(2, 1, 11, "A21")].map((a) => ({ ...a, presence: "Présent" as const }));
    const v = buildCockpitView({
      missions: [mission({ id: 1, dateMission: "2026-08-08", nbSurveillants: 4 })],
      affectations: affs, surveillants, salles,
      now: new Date("2026-08-08T13:48:00"),
    });
    expect(v.kpis.confTotal).toBe(4);
    expect(v.kpis.confirmationsPct).toBe(50);
    expect(v.kpis.confirmationsPct).not.toBe(100);
  });
});

describe("BUG-021 — un ratio de salles supérieur à 100 % est un écart", () => {
  it("nomme l'écart au cockpit au lieu de l'afficher comme « 8 / 6 salles »", () => {
    const affs = ["A21", "A22", "C14"].map((s, i) => aff(i + 1, 1, 10 + i, s));
    const v = buildCockpitView({
      missions: [mission({ id: 1, dateMission: "2026-08-08", nbSalles: 2 })],
      affectations: affs, surveillants, salles,
      now: new Date("2026-08-08T13:48:00"),
    });
    expect(v.salles.ouvertes).toBe(3);
    expect(v.salles.declarees).toBe(2);
    expect(v.salles.ecart).toBe(1);
    expect(v.salles.anomalie).toBe(true);
    expect(v.salles.libelle).toContain("de trop au planning");
  });

  it("ne signale rien quand ouvertes et déclarées coïncident", () => {
    const affs = ["A21", "A22"].map((s, i) => aff(i + 1, 1, 10 + i, s));
    const v = buildCockpitView({
      missions: [mission({ id: 1, dateMission: "2026-08-08", nbSalles: 2 })],
      affectations: affs, surveillants, salles,
      now: new Date("2026-08-08T13:48:00"),
    });
    expect(v.salles.anomalie).toBe(false);
  });

  it("l'avancement de mission ne compte plus « Salles 8/6 » comme terminé", () => {
    const m = mission({ id: 1, dateMission: "2026-08-08", nbSalles: 2, statut: "Planifiée" });
    const affs = ["A21", "A22", "C14"].map((s, i) => aff(i + 1, 1, 10 + i, s));
    const etape = preparationMission({ mission: m, affectations: affs, devis: [] as Devis[] })
      .etapes.find((e) => e.cle === "salles")!;
    expect(etape.fait).toBe(false);
    expect(etape.anomalie).toContain("de plus au planning");
    expect(etape.label).toContain("écart à corriger");
  });

  it("l'étape salles reste « faite » quand le compte est exact", () => {
    const m = mission({ id: 1, dateMission: "2026-08-08", nbSalles: 2, statut: "Planifiée" });
    const affs = ["A21", "A22"].map((s, i) => aff(i + 1, 1, 10 + i, s));
    const etape = preparationMission({ mission: m, affectations: affs, devis: [] as Devis[] })
      .etapes.find((e) => e.cle === "salles")!;
    expect(etape.fait).toBe(true);
    expect(etape.anomalie).toBeNull();
  });
});

describe("BUG-017 — le titre de la courbe dit ce que la courbe montre", () => {
  it("annonce des sessions, pas « 7 jours », et la période réelle", () => {
    // Relevé de l'audit : le libellé « ÉVOLUTION SUR 7 JOURS » coiffait des
    // points allant du 14/04 au 30/07, soit 3,5 mois.
    const now = new Date("2026-08-08T12:00:00");
    const missions = ["2026-04-14", "2026-05-20", "2026-06-18", "2026-07-30"].map((d, i) =>
      mission({ id: i + 1, dateMission: d, statut: "Terminée", nbSurveillants: 2 }),
    );
    const affectations = missions.flatMap((m) => [aff(m.id * 10, m.id, 10), aff(m.id * 10 + 1, m.id, 11)]);
    const c = buildCoverage(missions, affectations, now);

    expect(c.trend).toHaveLength(4);
    expect(c.trendTitre).toContain("sessions datées");
    expect(c.trendTitre).not.toContain("7 jours");
    expect(c.trendPeriode).toBe("14/04 → 30/07");
  });

  it("reste lisible sans aucune session datée", () => {
    const c = buildCoverage([], [], new Date("2026-08-08T12:00:00"));
    expect(c.trend).toEqual([]);
    expect(c.trendPeriode).toBeNull();
    expect(c.trendTitre).toBe("Évolution de la couverture");
  });
});

describe("BUG-018 — la colonne DATE du tableau des sessions est monotone", () => {
  const now = new Date("2026-08-08T12:00:00");
  const missions = [
    mission({ id: 1, dateMission: "2026-07-30", statut: "En cours" }),
    mission({ id: 2, dateMission: "2026-08-12", statut: "Planifiée" }),
    mission({ id: 3, dateMission: "2026-08-24", statut: "Planifiée" }),
    mission({ id: 4, dateMission: "2026-08-01", statut: "Terminée" }),
    mission({ id: 5, dateMission: "2026-07-31", statut: "Terminée" }),
  ];

  it("trie chronologiquement — la suite « 30 juil · 12 août · 24 août · 01 août » n'est plus possible", () => {
    const rows = buildSessions(missions, [], now);
    const dates = rows.map((r) => r.dateISO!);
    expect(dates).toEqual([...dates].sort());
  });

  it("conserve la fenêtre de pilotage : sessions passées ET à venir", () => {
    const rows = buildSessions(missions, [], now);
    expect(rows.some((r) => r.position === "passee")).toBe(true);
    expect(rows.some((r) => r.position === "avenir")).toBe(true);
  });

  it("dit à quelle distance du jour se trouve chaque session", () => {
    const rows = buildSessions(missions, [], now);
    expect(rows.find((r) => r.dateISO === "2026-07-30")!.quand).toBe("Il y a 9 j");
    expect(rows.find((r) => r.dateISO === "2026-08-12")!.quand).toBe("Dans 4 j");
  });

  it("marque « Aujourd’hui » sans dériver avec l'heure de la journée", () => {
    // `joursAvant` compare une date à minuit avec l'instant courant : à 12:00,
    // la session du jour tombait à −1 jour. Le calcul est en jours calendaires.
    const rows = buildSessions([mission({ id: 9, dateMission: "2026-08-08" })], [], now);
    expect(rows[0].position).toBe("aujourdhui");
    expect(rows[0].quand).toBe("Aujourd’hui");
  });
});
