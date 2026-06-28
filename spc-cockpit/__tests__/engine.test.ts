import { describe, it, expect } from "vitest";
import {
  generateExecutiveSummary,
  computeCampagneHealth,
  generateInsights,
  computeRecommendations,
} from "../lib/ai/engine";
import type { Prospect, Campagne } from "../lib/types";

const mockCampagne: Campagne = {
  id: "1",
  nom: "Test",
  perimetre: "Paris",
  deadline: "2099-12-31",
  joursRestants: 365,
  score: 8,
  statut: "Actif",
  nombreProspects: 10,
  tresChaudes: 3,
};

const mockProspect: Prospect = {
  id: "1",
  nom: "IFSI Lyon",
  segment: "Santé",
  cluster: "Lyon/RA",
  scoreBANT: 8,
  niveau: "Très chaud",
  priorite: "A",
  vague: 1 as const,
  interlocuteur: "Directeur",
  canal: "Email",
  statut: "Non contacté",
  action: "",
  valeurPotentielle: "32",
};

// ── generateExecutiveSummary ─────────────────────────────────────────────────

describe("generateExecutiveSummary", () => {
  it("retourne un état vide quand prospects=[]", () => {
    const result = generateExecutiveSummary({ prospects: [], campagnes: [], totalAlertes: 0, urgentEcheances: 0 });
    expect(result.headline).toContain("Aucun");
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.forecast).toBeTruthy();
  });

  it("détecte une fenêtre d'opportunité quand tresChaudes >= 5", () => {
    // Half contacted (contactRate=50%>=40%) + all Très chaud → triggers opportunité branch
    const prospects = Array.from({ length: 10 }, (_, i) => ({
      ...mockProspect,
      id: String(i),
      niveau: "Très chaud" as const,
      statut: (i < 5 ? "En cours" : "Non contacté") as "En cours" | "Non contacté",
    }));
    const result = generateExecutiveSummary({ prospects, campagnes: [], totalAlertes: 0, urgentEcheances: 0 });
    expect(result.headline).toContain("opportunité");
  });

  it("détecte pipeline à accélérer quand contactRate < 40%", () => {
    const prospects = Array.from({ length: 10 }, (_, i) => ({
      ...mockProspect,
      id: String(i),
      statut: "Non contacté" as const,
    }));
    const result = generateExecutiveSummary({ prospects, campagnes: [], totalAlertes: 0, urgentEcheances: 0 });
    expect(result.headline).toContain("accélérer");
  });

  it("ne produit jamais NaN dans les textes", () => {
    const result = generateExecutiveSummary({ prospects: [mockProspect], campagnes: [mockCampagne], totalAlertes: 2, urgentEcheances: 1 });
    const allText = JSON.stringify(result);
    expect(allText).not.toContain("NaN");
  });
});

// ── computeCampagneHealth ────────────────────────────────────────────────────

describe("computeCampagneHealth", () => {
  it("retourne Excellent pour une campagne saine", () => {
    // tresChaudes=6/10 → hotRatio=60% → 30pts + BANT 8→32pts + deadline 20pts + Actif 10pts = 92
    const health = computeCampagneHealth({ ...mockCampagne, tresChaudes: 6 });
    expect(health.score).toBeGreaterThanOrEqual(80);
    expect(health.label).toBe("Excellent");
  });

  it("retourne Critique pour score=0 et joursRestants=0", () => {
    const health = computeCampagneHealth({ ...mockCampagne, score: 0, joursRestants: 0, tresChaudes: 0, statut: "Brouillon" });
    expect(health.label).toBe("Critique");
  });

  it("score toujours entre 0 et 100", () => {
    const health = computeCampagneHealth(mockCampagne);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
  });

  it("ne produit jamais NaN", () => {
    const health = computeCampagneHealth({ ...mockCampagne, score: 0, joursRestants: 0 });
    expect(health.score).not.toBeNaN();
  });
});

// ── computeRecommendations ───────────────────────────────────────────────────

describe("computeRecommendations", () => {
  it("retourne [] si prospects=[]", () => {
    expect(computeRecommendations([])).toEqual([]);
  });

  it("exclut les prospects convertis", () => {
    const converted = { ...mockProspect, statut: "Converti" as const };
    expect(computeRecommendations([converted])).toHaveLength(0);
  });

  it("scoreBANT=0 ne plante pas", () => {
    const weak = { ...mockProspect, scoreBANT: 0 };
    const recs = computeRecommendations([weak]);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].confidence).not.toBeNaN();
  });

  it("retourne au max 5 recommandations", () => {
    const prospects = Array.from({ length: 20 }, (_, i) => ({ ...mockProspect, id: String(i) }));
    expect(computeRecommendations(prospects).length).toBeLessThanOrEqual(5);
  });
});

// ── generateInsights ─────────────────────────────────────────────────────────

describe("generateInsights", () => {
  it("retourne un insight 'Aucun prospect' quand prospects=[]", () => {
    const insights = generateInsights({ prospects: [], campagnes: [], totalAlertes: 0, urgentEcheances: 0 });
    expect(insights[0].message).toContain("Aucun prospect");
    expect(insights[0].type).toBe("info");
  });

  it("retourne au max 3 insights", () => {
    const prospects = Array.from({ length: 20 }, (_, i) => ({ ...mockProspect, id: String(i) }));
    const insights = generateInsights({ prospects, campagnes: [], totalAlertes: 5, urgentEcheances: 3 });
    expect(insights.length).toBeLessThanOrEqual(3);
  });
});
