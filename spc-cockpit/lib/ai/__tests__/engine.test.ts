import { describe, it, expect } from "vitest";
import {
  computeCampagneHealth,
  computeRecommendations,
  detectRisks,
  generateInsights,
  generateExecutiveSummary,
} from "../engine";
import type { Campagne, Prospect } from "@/lib/types";

const baseCampagne: Campagne = {
  id: "test-1",
  nom: "Test Campagne",
  perimetre: "Paris",
  deadline: "31/12/2026",
  joursRestants: 30,
  score: 8.5,
  statut: "Actif",
  nombreProspects: 20,
  tresChaudes: 12, // 60% hot ratio → 30/30 pts → score 94 → Excellent
};

const baseProspect: Prospect = {
  id: "p1",
  nom: "EM Lyon Business School",
  segment: "Commerce",
  cluster: "Lyon/RA",
  scoreBANT: 9.5,
  niveau: "Très chaud",
  priorite: "A",
  vague: "Vague 1",
  interlocuteur: "DAF",
  canal: "Téléphone",
  statut: "Non contacté",
  action: "Appel",
};

// ── computeCampagneHealth ──────────────────────────────────────────────────

describe("computeCampagneHealth", () => {
  it("retourne Excellent pour une campagne idéale", () => {
    const result = computeCampagneHealth(baseCampagne);
    expect(result.label).toBe("Excellent");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("retourne Critique pour une campagne en échec", () => {
    const critique: Campagne = {
      ...baseCampagne,
      score: 2,
      tresChaudes: 0,
      joursRestants: 1,
      statut: "En cours",
    };
    const result = computeCampagneHealth(critique);
    expect(result.score).toBeLessThan(40);
    expect(result.label).toBe("Critique");
  });

  it("score borné entre 0 et 100", () => {
    const result = computeCampagneHealth(baseCampagne);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("retourne exactement 4 signaux", () => {
    const result = computeCampagneHealth(baseCampagne);
    expect(result.signals).toHaveLength(4);
  });

  it("campagne Terminée reçoit le signal 'Campagne terminée'", () => {
    const terminee: Campagne = { ...baseCampagne, statut: "Terminé", joursRestants: 0 };
    const result = computeCampagneHealth(terminee);
    expect(result.signals.some((s) => s.text === "Campagne terminée")).toBe(true);
  });
});

// ── computeRecommendations ────────────────────────────────────────────────

describe("computeRecommendations", () => {
  it("exclut les prospects convertis", () => {
    const converti: Prospect = { ...baseProspect, statut: "Converti" };
    const result = computeRecommendations([converti]);
    expect(result).toHaveLength(0);
  });

  it("retourne au maximum 5 recommandations", () => {
    const prospects = Array.from({ length: 10 }, (_, i) => ({
      ...baseProspect,
      id: `p${i}`,
      nom: `Prospect ${i}`,
    }));
    const result = computeRecommendations(prospects);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("trie par confidence décroissant", () => {
    const faible: Prospect = { ...baseProspect, id: "p2", scoreBANT: 3, niveau: "Froid", priorite: "C" };
    const result = computeRecommendations([faible, baseProspect]);
    expect(result[0].confidence).toBeGreaterThanOrEqual(result[1]?.confidence ?? 0);
  });

  it("confidence bornée entre 0 et 99", () => {
    const result = computeRecommendations([baseProspect]);
    expect(result[0].confidence).toBeGreaterThanOrEqual(0);
    expect(result[0].confidence).toBeLessThanOrEqual(99);
  });

  it("prospect BANT sub-scores >= 2.0 génère les raisons besoin/timing", () => {
    // Prospect sans niveau/priorite élevés pour laisser la place aux raisons BANT dans le slice(0,4)
    const avecBant: Prospect = {
      ...baseProspect,
      niveau: "Tiède",
      priorite: "B",
      bant: { budget: 2.2, autorite: 2.1, besoin: 2.3, timing: 2.0 },
    };
    const result = computeRecommendations([avecBant]);
    const reasons = result[0].reasons;
    expect(reasons.some((r) => r.includes("Besoin fort"))).toBe(true);
    expect(reasons.some((r) => r.includes("Timing favorable"))).toBe(true);
    expect(reasons.some((r) => r.includes("Budget probable"))).toBe(true);
  });

  it("sous-scores BANT < seuil ne génèrent pas les raisons BANT", () => {
    const sansBant: Prospect = {
      ...baseProspect,
      bant: { budget: 1.0, autorite: 1.0, besoin: 1.0, timing: 1.0 },
    };
    const result = computeRecommendations([sansBant]);
    const reasons = result[0].reasons;
    expect(reasons.some((r) => r.includes("Besoin fort"))).toBe(false);
    expect(reasons.some((r) => r.includes("Timing favorable"))).toBe(false);
  });
});

// ── detectRisks ───────────────────────────────────────────────────────────

describe("detectRisks", () => {
  it("retourne toujours exactement 5 signaux", () => {
    const result = detectRisks({ prospects: [baseProspect], totalAlertes: 0, urgentEcheances: 0 });
    expect(result).toHaveLength(5);
  });

  it("taux de contact ok si 0 non-contactés", () => {
    const enCours: Prospect = { ...baseProspect, statut: "En cours" };
    const result = detectRisks({ prospects: [enCours], totalAlertes: 0, urgentEcheances: 0 });
    expect(result[0].level).toBe("ok");
  });

  it("taux de contact critical si pipeline vide de contacts", () => {
    const nonContactes = Array.from({ length: 10 }, (_, i) => ({
      ...baseProspect, id: `p${i}`, statut: "Non contacté" as const,
    }));
    const result = detectRisks({ prospects: nonContactes, totalAlertes: 0, urgentEcheances: 0 });
    expect(result[0].level).toBe("critical");
  });

  it("alertes critical si > 3", () => {
    const result = detectRisks({ prospects: [baseProspect], totalAlertes: 5, urgentEcheances: 0 });
    const alerteSignal = result.find((s) => s.label === "Alertes actives");
    expect(alerteSignal?.level).toBe("critical");
  });
});

// ── generateInsights ──────────────────────────────────────────────────────

describe("generateInsights", () => {
  it("retourne au maximum 3 insights", () => {
    const result = generateInsights({
      prospects: [baseProspect],
      campagnes: [{ nom: "Test", statut: "Actif", score: 8, joursRestants: 30 }],
      totalAlertes: 0,
      urgentEcheances: 0,
    });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("retourne un insight 'info' quand tout va bien", () => {
    const converti: Prospect = { ...baseProspect, statut: "Converti" };
    const result = generateInsights({
      prospects: [converti],
      campagnes: [],
      totalAlertes: 0,
      urgentEcheances: 0,
    });
    expect(result[0].type).toBe("info");
  });
});

// ── generateExecutiveSummary ──────────────────────────────────────────────

describe("generateExecutiveSummary", () => {
  it("retourne exactement 3 champs actions au maximum", () => {
    const result = generateExecutiveSummary({
      prospects: [baseProspect],
      campagnes: [baseCampagne],
      totalAlertes: 2,
      urgentEcheances: 1,
    });
    expect(result.actions.length).toBeLessThanOrEqual(3);
  });

  it("headline non vide", () => {
    const result = generateExecutiveSummary({
      prospects: [baseProspect],
      campagnes: [baseCampagne],
      totalAlertes: 0,
      urgentEcheances: 0,
    });
    expect(result.headline.length).toBeGreaterThan(0);
    expect(result.subline.length).toBeGreaterThan(0);
  });

  it("détecte 'Pipeline à accélérer' si < 40% contactés", () => {
    const nonContactes = Array.from({ length: 10 }, (_, i) => ({
      ...baseProspect, id: `p${i}`, statut: "Non contacté" as const,
    }));
    const result = generateExecutiveSummary({
      prospects: nonContactes,
      campagnes: [],
      totalAlertes: 0,
      urgentEcheances: 0,
    });
    expect(result.headline).toBe("Pipeline à accélérer");
  });

  it("détecte 'Fenêtre d'opportunité' si >= 5 Très chaud", () => {
    const chauds = Array.from({ length: 6 }, (_, i) => ({
      ...baseProspect, id: `p${i}`, statut: "En cours" as const,
    }));
    const result = generateExecutiveSummary({
      prospects: chauds,
      campagnes: [],
      totalAlertes: 0,
      urgentEcheances: 0,
    });
    expect(result.headline).toBe("Fenêtre d'opportunité ouverte");
  });
});
