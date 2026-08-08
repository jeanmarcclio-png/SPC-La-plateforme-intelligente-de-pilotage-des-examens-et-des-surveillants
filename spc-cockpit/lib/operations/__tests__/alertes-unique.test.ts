// Non-régression — fin du chantier 1 : « un décompte, un périmètre » (BUG-025).
//
// Le cockpit et la planification portent sur LA MÊME session : ils annonçaient
// 2 alertes et 5 alertes, et deux scores de santé sur deux échelles (5,9/10
// « À surveiller » contre 54/100 « à risque »). Ils dérivent désormais du même
// catalogue et du même score.

import { describe, it, expect } from "vitest";
import { buildCockpitView } from "../cockpit";
import { alertesSession, santeSession, construireVueSession } from "../planification-vue";
import { mockMissions, mockAffectations, mockSurveillants, mockSalles } from "../mock";

const ACTIVE = mockMissions.find((m) => m.statut === "En cours")!;
const NOW = new Date("2026-08-08T12:00:00");

const ENTREE = {
  mission: ACTIVE,
  missions: mockMissions,
  affectations: mockAffectations,
  surveillants: mockSurveillants,
};

const COCKPIT = buildCockpitView({
  missions: mockMissions,
  affectations: mockAffectations,
  surveillants: mockSurveillants,
  salles: mockSalles,
  now: NOW,
});

describe("BUG-025 — cockpit et planification comptent la même chose", () => {
  it("le catalogue d'alertes de la session est unique", () => {
    const planif = alertesSession(ENTREE);
    const vue = construireVueSession(ENTREE);
    expect(planif).toEqual(vue.alertes);
    expect(planif.length).toBe(5);
  });

  it("le cockpit reprend ce catalogue, sans en recalculer une variante", () => {
    const planif = alertesSession(ENTREE);
    const critiques = planif.filter((a) => a.niveau === "critique").length;
    const avertissements = planif.filter((a) => a.niveau === "avertissement").length;

    expect(COCKPIT.kpis.alertesCritiques).toBe(critiques);
    expect(COCKPIT.kpis.alertesInfos).toBe(avertissements);
    // Aucun retard dans le jeu de référence : le total du cockpit égale donc
    // exactement le décompte de la planification.
    expect(COCKPIT.kpis.alertesRetards).toBe(0);
    expect(COCKPIT.kpis.alertesTotal).toBe(planif.length);
  });

  it("les retards restent propres au cockpit (constat du jour J)", () => {
    const avecAbsent = buildCockpitView({
      ...ENTREE,
      affectations: mockAffectations.map((a) =>
        a.surveillantId === 3 ? { ...a, presence: "Absent" as const } : a,
      ),
      salles: mockSalles,
      now: NOW,
    });
    expect(avecAbsent.kpis.alertesRetards).toBe(1);
    // Le catalogue de planning, lui, ne bouge pas : la présence n'en fait pas partie.
    expect(avecAbsent.kpis.alertesTotal).toBe(alertesSession(ENTREE).length + 1);
  });
});

describe("BUG-025 — un seul score de santé, une seule échelle", () => {
  it("le cockpit affiche le score de la planification, sur 100", () => {
    const sante = santeSession(ENTREE);
    expect(COCKPIT.kpis.scoreIA).toBe(sante.score);
    expect(COCKPIT.kpis.scoreLabel).toBe(sante.niveau);
    expect(COCKPIT.kpis.scoreIA).toBeGreaterThan(10); // plus jamais une note sur 10
  });

  it("le verdict est le même des deux côtés", () => {
    const vue = construireVueSession(ENTREE);
    expect(COCKPIT.kpis.scoreLabel).toBe(vue.sante.niveau);
    expect(["prête", "à consolider", "à risque"]).toContain(COCKPIT.kpis.scoreLabel);
  });
});
