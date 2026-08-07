import { describe, it, expect } from "vitest";
import {
  buildDashboardData,
  buildFinancials,
  buildCoverage,
  buildRisks,
  buildActions,
  couvertureSession,
  missionActive,
} from "../dashboard";
import {
  mockMissions,
  mockSurveillants,
  mockAffectations,
  mockDevis,
  mockIncidents,
  mockDevisEquipe,
} from "../mock";

const NOW = new Date("2026-07-30T09:00:00");

const inputs = {
  missions: mockMissions,
  surveillants: mockSurveillants,
  affectations: mockAffectations,
  devis: mockDevis,
  incidents: mockIncidents,
  devisEquipe: mockDevisEquipe,
  now: NOW,
};

describe("dashboard — mission active", () => {
  it("sélectionne la mission En cours (ICP Paris)", () => {
    const active = missionActive(mockMissions);
    expect(active?.client).toBe("ICP Paris");
    expect(active?.statut).toBe("En cours");
  });
});

describe("dashboard — finance (source unique = devis gagnés)", () => {
  const fin = buildFinancials(mockDevis, mockMissions, mockSurveillants, mockDevisEquipe, NOW);
  it("CA confirmé HT = somme des devis Accepté/Facturé", () => {
    expect(fin.caConfirmeHT).toBeCloseTo(12544.4, 2);
  });
  it("CA TTC confirmé = somme des TTC des devis gagnés", () => {
    expect(fin.caTTC).toBeCloseTo(15053.28, 2);
  });
  it("marge HT positive et taux cohérent (0–1)", () => {
    expect(fin.margeHT).toBeGreaterThan(0);
    expect(fin.tauxMarge).toBeGreaterThan(0);
    expect(fin.tauxMarge).toBeLessThan(1);
    // marge = CA − coût estimé des surveillants
    expect(fin.margeHT).toBeLessThan(fin.caConfirmeHT);
  });
  it("évolution mensuelle en progression, variation positive", () => {
    expect(fin.evolutionMensuelle.length).toBeGreaterThanOrEqual(2);
    expect(fin.variationCA).not.toBeNull();
    expect(fin.variationCA!).toBeGreaterThan(0);
  });
});

describe("dashboard — couverture (identique KPI/donut/risques §14.2)", () => {
  const cov = buildCoverage(mockMissions, mockAffectations, NOW);
  it("14 postes requis, 10 pourvus, 4 manquants → 71 %", () => {
    expect(cov.requis).toBe(14);
    expect(cov.pourvus).toBe(10);
    expect(cov.manquants).toBe(4);
    expect(Math.round(cov.taux * 100)).toBe(71);
  });
  it("le manque affiché est le même que le risque « postes non pourvus »", () => {
    const risks = buildRisks(cov, mockMissions, mockAffectations, mockIncidents, NOW);
    const postes = risks.find((r) => r.key === "postes");
    expect(postes?.valeur).toBe(cov.manquants);
  });
});

describe("dashboard — couverture de session", () => {
  it("mission verrouillée sans affectation détaillée = couverte à 100 %", () => {
    const terminee = mockMissions.find((m) => m.statut === "Terminée")!;
    const c = couvertureSession(terminee, mockAffectations);
    expect(c.taux).toBe(1);
    expect(c.etat).toBe("complet");
  });
  it("mission à planifier sans affectation = état à-planifier (jamais faux 100 %)", () => {
    const planif = mockMissions.find((m) => m.statut === "Planifiée")!;
    const c = couvertureSession(planif, mockAffectations);
    expect(c.etat).toBe("a-planifier");
  });
});

describe("dashboard — risques", () => {
  const cov = buildCoverage(mockMissions, mockAffectations, NOW);
  const risks = buildRisks(cov, mockMissions, mockAffectations, mockIncidents, NOW);
  it("4 tuiles : postes, J-48, conflits, incidents", () => {
    expect(risks.map((r) => r.key)).toEqual(["postes", "j48", "conflits", "incidents"]);
  });
  it("2 conflits de planning (postes pourvus sans salle — volants à confirmer)", () => {
    expect(risks.find((r) => r.key === "conflits")?.valeur).toBe(2);
  });
  it("1 incident ouvert", () => {
    expect(risks.find((r) => r.key === "incidents")?.valeur).toBe(1);
  });
});

describe("dashboard — actions immédiates priorisées", () => {
  const cov = buildCoverage(mockMissions, mockAffectations, NOW);
  const actions = buildActions(cov, mockMissions, mockAffectations, mockIncidents, mockDevis, NOW);
  it("l'action la plus prioritaire est « Pourvoir les postes manquants »", () => {
    expect(actions[0].titre).toContain("Pourvoir");
    expect(actions[0].severite).toBe("critique");
  });
  it("triées par priorité décroissante", () => {
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i - 1].priorite).toBeGreaterThanOrEqual(actions[i].priorite);
    }
  });
  it("inclut le devis en attente de réponse (Dauphine PSL, envoyé)", () => {
    expect(actions.some((a) => a.detail.includes("Dauphine PSL"))).toBe(true);
  });
});

describe("dashboard — agrégat complet", () => {
  const data = buildDashboardData(inputs);
  it("expose toutes les zones du dashboard", () => {
    expect(data.financials).toBeTruthy();
    expect(data.coverage).toBeTruthy();
    expect(data.sessions.length).toBeGreaterThan(0);
    expect(data.workload.length).toBeGreaterThan(0);
    expect(data.calendar.length).toBe(7);
    expect(data.quotes.length).toBeGreaterThan(0);
  });
  it("missions à venir = missions planifiables dans la fenêtre (> 0)", () => {
    expect(data.missionsAVenir).toBeGreaterThan(0);
  });
  it("le calendrier contient la mission active dans la semaine courante", () => {
    const jours = data.calendar.flatMap((d) => d.sessions.map((s) => s.client));
    expect(jours).toContain("ICP Paris");
  });
  it("devis récents : le plus récent est en tête (ICN)", () => {
    expect(data.quotes[0].client).toBe("ICN");
  });
  it("charge : la surcharge est détectée (≥ seuil)", () => {
    expect(data.workload.some((w) => w.surcharge)).toBe(true);
  });
});
