// AUDIT QA FORENSIC — recalcul INDÉPENDANT des chiffres affichés à l'écran.
// Chaque test compare « VALEUR SYSTÈME » (ce que la page affiche, relevé lors
// du crawl) à « VALEUR RECALCULÉE » (recalcul direct depuis les données source).
// Ces tests documentent l'état constaté : ils ne prétendent pas que l'état est correct.

import { describe, it, expect } from "vitest";
import {
  mockMissions, mockAffectations, mockDevis, mockSalles, mockSurveillants, mockDevisEquipe, mockDevisSalles,
} from "@/lib/operations/mock";
import { construireVueSalles } from "@/lib/operations/salles-view";
import { calculateRoomBillableHours } from "@/lib/operations/engine";

const MISSION_ACTIVE = mockMissions.find((m) => m.statut === "En cours")!;
const AFF = mockAffectations.filter((a) => a.missionId === MISSION_ACTIVE.id);

const toMin = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);

describe("INV-005 — TTC = HT + TVA sur tous les devis", () => {
  it("chaque devis respecte TTC = HT × 1,20 (au centime)", () => {
    for (const d of mockDevis) {
      const attendu = Math.round(d.montantHT * 1.2 * 100) / 100;
      expect(`${d.reference}:${d.montantTTC}`).toBe(`${d.reference}:${attendu}`);
    }
  });
});

describe("INV-001 — candidats mission = somme candidats salles", () => {
  it("le modèle Mission ne porte AUCUN compteur de candidats", () => {
    expect(Object.keys(MISSION_ACTIVE)).not.toContain("nbCandidats");
    expect(Object.keys(MISSION_ACTIVE)).not.toContain("etudiants");
    // → l'invariant est structurellement invérifiable dans le produit.
  });
});

describe("INV-SALLE — référentiel Salles vs salles réellement planifiées", () => {
  it("des salles du planning n'existent pas dans le référentiel Salles", () => {
    const referentiel = new Set(mockSalles.map((s) => s.nom.replace(/^Salle\s+/i, "")));
    const planifiees = [...new Set(AFF.map((a) => a.salle).filter(Boolean) as string[])];
    const orphelines = planifiees.filter((s) => !referentiel.has(s));
    expect({ referentiel: [...referentiel], planifiees, orphelines }).toEqual({
      referentiel: ["A21", "A22", "E31", "Grand Amphithéâtre", "B11"],
      planifiees: ["A21", "C14", "E31", "AMP", "A22", "F11", "F12", "E32"],
      orphelines: ["C14", "AMP", "F11", "F12", "E32"], // 5 salles fantômes
    });
  });

  it("nbSalles de la mission ≠ nombre de salles réellement affectées", () => {
    const affectees = new Set(AFF.map((a) => a.salle).filter(Boolean)).size;
    expect({ declare: MISSION_ACTIVE.nbSalles, affectees }).toEqual({ declare: 6, affectees: 8 });
  });

  it("une salle du référentiel (B11) n'est utilisée par aucune affectation", () => {
    const planifiees = new Set(AFF.map((a) => a.salle));
    expect(planifiees.has("B11")).toBe(false);
  });
});

describe("COUVERTURE — trois réponses différentes pour la même session", () => {
  it("dashboard / planification / cockpit : 14 requis, 10 pourvus, manque 4", () => {
    const requis = MISSION_ACTIVE.nbSurveillants;
    const pourvus = AFF.filter((a) => a.matin || a.apm).length;
    expect({ requis, pourvus, manque: requis - pourvus }).toEqual({ requis: 14, pourvus: 10, manque: 4 });
  });

  it("page Salles : 19 requis, 16 affectés, manque 3 — calcul totalement indépendant", () => {
    const k = construireVueSalles(mockSalles).kpis;
    expect({
      requis: k.surveillantsRequis,
      affectes: k.surveillantsAffectes,
      manque: k.surveillantsManquants,
    }).toEqual({ requis: 19, affectes: 16, manque: 3 });
  });

  it("BUG — le « manque » global des Salles (3) contredit la somme par salle (4)", () => {
    const v = construireVueSalles(mockSalles);
    const sommeParSalle = v.salles.reduce((n, s) => n + s.surveillantsManquants, 0);
    expect(v.kpis.surveillantsManquants).toBe(3); // KPI affiché
    expect(sommeParSalle).toBe(4); // somme des « −1 / −2 / −1 » du tableau
    // Le surplus d'une salle (E31 : 2 affectés pour 1 requis) compense
    // silencieusement le déficit d'une autre — impossible sur le terrain.
  });
});

describe("HEURES — total planifié de la session active", () => {
  it("66,25 h par somme de minutes exactes", () => {
    let min = 0;
    for (const a of AFF) {
      const cr = [
        ...(a.matinCreneaux ?? (a.matin && a.matinDebut && a.matinFin ? [{ debut: a.matinDebut, fin: a.matinFin }] : [])),
        ...(a.apmCreneaux ?? (a.apm && a.apmDebut && a.apmFin ? [{ debut: a.apmDebut, fin: a.apmFin }] : [])),
      ];
      for (const c of cr) min += toMin(c.fin) - toMin(c.debut);
    }
    expect(min).toBe(3975);
    expect(min / 60).toBe(66.25); // conforme à l'affichage
  });
});

describe("MARGE — deux moteurs concurrents pour le même mot", () => {
  it("marge session (planification) = 69 % ; marge société (dashboard) = 30 %", () => {
    // Session : heures réellement planifiées × taux horaire de chaque surveillant.
    const parSurv = new Map(mockSurveillants.map((s) => [s.id, s.tauxHoraire ?? 0]));
    let coutSession = 0;
    for (const a of AFF) {
      const cr = [
        ...(a.matinCreneaux ?? (a.matin && a.matinDebut && a.matinFin ? [{ debut: a.matinDebut, fin: a.matinFin }] : [])),
        ...(a.apmCreneaux ?? (a.apm && a.apmDebut && a.apmFin ? [{ debut: a.apmDebut, fin: a.apmFin }] : [])),
      ];
      const h = cr.reduce((n, c) => n + (toMin(c.fin) - toMin(c.debut)), 0) / 60;
      coutSession += h * (parSurv.get(a.surveillantId) ?? 0);
    }
    const margeSession = MISSION_ACTIVE.montantHT - coutSession;
    expect(Math.round((margeSession / MISSION_ACTIVE.montantHT) * 100)).toBe(69);

    // Société : heures de l'équipe chiffrée × taux horaire MOYEN de tout l'effectif.
    const confirmes = mockDevis.filter((d) => d.statut === "Accepté");
    const caHT = confirmes.reduce((s, d) => s + d.montantHT, 0);
    const tauxMoyen = mockSurveillants.reduce((s, x) => s + (x.tauxHoraire || 0), 0) / mockSurveillants.length;
    const heures = confirmes.reduce(
      (s, d) => s + mockDevisEquipe.filter((e) => e.devisId === d.id).reduce((n, e) => n + e.effectif * e.heuresPers, 0), 0);
    const margeSociete = caHT - heures * tauxMoyen;
    expect(Math.round((margeSociete / caHT) * 100)).toBe(30);
    // Même libellé « marge », deux formules, deux périmètres, aucun lien affiché.
  });
});

describe("DEVIS 4 — la grille de salles ne reconstitue pas le total facturé", () => {
  it("heures facturables recalculées depuis les salles ≠ heures facturées", () => {
    const salles = mockDevisSalles.filter((s) => s.devisId === 4);
    const hParJour = salles.reduce(
      (n, s) => n + calculateRoomBillableHours({
        id: String(s.id), roomCode: s.salle, period: s.session === "matin" ? "morning" : "afternoon",
        startTime: s.debut!, endTime: s.fin!, requiredSupervisors: s.surveillants,
      }), 0);
    const joursRetenus = 10;
    const recalcule = Math.round(hParJour * joursRetenus * 100) / 100;
    const systeme = mockDevisEquipe
      .filter((e) => e.devisId === 4)
      .reduce((n, e) => n + e.effectif * e.heuresPers, 0);
    expect({ hParJour, recalcule, systeme }).toEqual({
      hParJour: 23.333333333333332,
      recalcule: 233.33,
      systeme: 262.3,
    });
    // Écart 28,97 h ≈ 811 € HT : les heures facturées proviennent d'une saisie
    // manuelle (devis_equipe.heuresPers), pas du moteur appliqué à la grille.
  });

  it("trois effectifs différents affichés pour le même devis", () => {
    const d = mockDevis.find((x) => x.id === 4)!;
    const equipe = mockDevisEquipe.filter((e) => e.devisId === 4).reduce((n, e) => n + e.effectif, 0);
    const sallesMatin = mockDevisSalles.filter((s) => s.devisId === 4 && s.session === "matin")
      .reduce((n, s) => n + s.surveillants, 0);
    expect({ enTeteListe: d.nbSurveillants, equipe, sallesMatin }).toEqual({
      enTeteListe: 6, equipe: 10, sallesMatin: 4,
    });
  });
});

describe("TEMPOREL — le cockpit traite une session passée comme « en direct »", () => {
  it("la mission « En cours » est datée dans le passé", () => {
    const aujourdhui = "2026-08-08"; // date du système au moment de l'audit
    expect(MISSION_ACTIVE.dateMission!).toBe("2026-07-30");
    expect(MISSION_ACTIVE.dateMission! < aujourdhui).toBe(true);
    // buildCockpitView ne compare jamais dateMission à `now` : il affiche une
    // frise horaire « maintenant » et des « prises de poste à venir ».
  });
});
