// Non-régression du chantier 1 — « une seule vérité par chiffre ».
// Corrige BUG-005 (deux réponses à la couverture), BUG-006 (KPI Salles contre
// son propre tableau), BUG-008 / BUG-009 (« surcharge » factuellement fausse).

import { describe, it, expect } from "vitest";
import { couvertureSession } from "../couverture";
import { buildDashboardData } from "../dashboard";
import { buildCockpitView } from "../cockpit";
import { construireVueSession } from "../planification-vue";
import { construireVueMissions } from "../missions-dashboard";
import { construireVueSalles } from "../salles-view";
import { SEUIL_SURCHARGE_H } from "../constants";
import {
  mockMissions, mockAffectations, mockSurveillants, mockSalles,
  mockDevis, mockIncidents, mockDevisEquipe, mockDevisSalles,
} from "../mock";

const ACTIVE = mockMissions.find((m) => m.statut === "En cours")!;
const NOW = new Date("2026-08-08T12:00:00");

describe("BUG-005 — tous les écrans répondent la MÊME couverture", () => {
  const attendu = { requis: 14, pourvus: 10, manquants: 4 };

  it("la fonction canonique fait foi", () => {
    const c = couvertureSession(ACTIVE, mockAffectations);
    expect({ requis: c.requis, pourvus: c.pourvus, manquants: c.manquants }).toEqual(attendu);
  });

  it("dashboard", () => {
    const { coverage } = buildDashboardData({
      missions: mockMissions, surveillants: mockSurveillants, affectations: mockAffectations,
      devis: mockDevis, incidents: mockIncidents, devisEquipe: mockDevisEquipe, now: NOW,
    });
    expect({ requis: coverage.requis, pourvus: coverage.pourvus, manquants: coverage.manquants }).toEqual(attendu);
  });

  it("cockpit", () => {
    const v = buildCockpitView({
      missions: mockMissions, affectations: mockAffectations,
      surveillants: mockSurveillants, salles: mockSalles, now: NOW,
    });
    expect({ requis: v.kpis.postesTotal, pourvus: v.kpis.postesCouverts }).toEqual({ requis: 14, pourvus: 10 });
  });

  it("planification", () => {
    const v = construireVueSession({
      mission: ACTIVE, missions: mockMissions,
      affectations: mockAffectations, surveillants: mockSurveillants,
    });
    expect({ requis: v.couverture.requis, pourvus: v.couverture.affectes, manquants: v.couverture.manque }).toEqual(attendu);
  });

  it("missions", () => {
    const v = construireVueMissions({
      missions: mockMissions, affectations: mockAffectations, devis: mockDevis,
      devisSalles: mockDevisSalles, incidents: mockIncidents, now: NOW,
    });
    expect({ requis: v.active!.couverture.requis, pourvus: v.active!.couverture.affectes }).toEqual({ requis: 14, pourvus: 10 });
  });

  it("salles — avec le contexte de session, plus de réponse divergente", () => {
    const k = construireVueSalles(mockSalles, { couverture: couvertureSession(ACTIVE, mockAffectations) }).kpis;
    expect({ requis: k.surveillantsRequis, pourvus: k.surveillantsAffectes, manquants: k.surveillantsManquants }).toEqual(attendu);
  });
});

describe("BUG-006 — le manque ne se calcule jamais par différence de totaux", () => {
  it("le manque théorique est la somme des manques PAR SALLE", () => {
    const v = construireVueSalles(mockSalles);
    const parSalle = v.salles.reduce((n, s) => n + s.surveillantsManquants, 0);
    const differenceDesTotaux = v.kpis.besoinTheorique - v.kpis.besoinTheoriqueAffectes;

    expect(v.kpis.besoinTheoriqueManquants).toBe(parSalle);
    expect(parSalle).toBe(4);
    // L'ancien calcul donnait 3 : le surplus d'une salle masquait un déficit.
    expect(differenceDesTotaux).toBe(3);
    expect(v.kpis.besoinTheoriqueManquants).not.toBe(differenceDesTotaux);
  });
});

describe("BUG-008 / BUG-009 — « surcharge » ne désigne qu'une seule chose", () => {
  const vue = buildCockpitView({
    missions: mockMissions, affectations: mockAffectations,
    surveillants: mockSurveillants, salles: mockSalles, now: NOW,
  });

  it("un surveillant sans salle est signalé « Sans salle », jamais « Charge critique »", () => {
    const moreau = vue.sessions.find((s) => s.nom === "Jean-Pierre Moreau")!;
    expect(moreau.salle).toBe("—");
    expect(moreau.statut).toBe("Sans salle");
    expect(vue.sessions.some((s) => s.statut === "Charge critique")).toBe(false);
  });

  it("aucune alerte n'annonce une surcharge pour un surveillant sous le seuil", () => {
    const moreau = mockSurveillants.find((s) => s.nom === "Jean-Pierre Moreau")!;
    expect(moreau.heures).toBeLessThan(SEUIL_SURCHARGE_H); // 61 h, très en deçà de 100 h

    const alerteMoreau = vue.alerts.find((a) => a.titre.includes("Jean-Pierre Moreau"))!;
    expect(alerteMoreau.titre).toBe("Aucune salle affectée — Jean-Pierre Moreau");
    expect(alerteMoreau.detail).not.toMatch(/surcharge/i);
  });

  it("l'action proposée est celle qui résout réellement le problème", () => {
    const action = vue.actions.find((a) => a.titre.includes("Jean-Pierre Moreau"))!;
    expect(action.titre).toBe("Affecter une salle — Jean-Pierre Moreau");
    expect(action.cta).toBe("Affecter");
  });

  it("le mot « surcharge » reste réservé au dépassement de SEUIL_SURCHARGE_H", () => {
    const surcharge = buildCockpitView({
      missions: [ACTIVE],
      affectations: [{ id: 1, missionId: ACTIVE.id, surveillantId: 99, statut: "Confirmé", salle: "A21", matin: true, matinDebut: "08:00", matinFin: "12:00", apm: false, presence: "Présent" }],
      surveillants: [{ id: 99, nom: "Sur Chargé", role: "Surveillant salle", statut: "Planifié", nbExamens: 20, heures: SEUIL_SURCHARGE_H + 5, note: 4, tauxHoraire: 18 }],
      salles: mockSalles, now: NOW,
    });
    expect(surcharge.sessions[0].statut).toBe("Surcharge");
    expect(surcharge.alerts[0].titre).toBe("Surcharge — Sur Chargé");
  });
});
