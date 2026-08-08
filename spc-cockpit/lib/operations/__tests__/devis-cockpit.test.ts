import { describe, it, expect } from "vitest";
import {
  construireCockpitDevis,
  appliquerFiltreRapide,
  filtrerParPeriode,
  heuresChiffreesDevis,
  tauxRevientMoyen,
  clientsDistincts,
  filtrerLignes,
  filtresActifs,
  serieExploitable,
  FILTRES_VIDES,
  joursEcoules,
  libellePeriode,
  periodeValide,
} from "../devis-cockpit";
import { mockDevis, mockDevisEquipe, mockFactures, mockSurveillants } from "../mock";
import type { Devis, DevisEquipe, Facture } from "../types";

// Référence temporelle figée : 8 juillet 2026 (date du cockpit de référence).
const NOW = new Date("2026-07-08T09:00:00");

const vue = () =>
  construireCockpitDevis({
    devis: mockDevis,
    equipe: mockDevisEquipe,
    factures: mockFactures,
    surveillants: mockSurveillants,
    aujourdhui: NOW,
  });

const ligne = (ref: string) => vue().lignes.find((l) => l.devis.reference === ref)!;

describe("devis-cockpit — KPI", () => {
  const { kpis } = vue();

  it("total, CA potentiel et CA accepté proviennent des mêmes devis", () => {
    expect(kpis.total).toBe(5);
    // Dauphine PSL — seul devis envoyé
    expect(kpis.caPotentielHT).toBeCloseTo(2600, 2);
    expect(kpis.nbEnvoyes).toBe(1);
    // Sciences Po + ICP Reims
    expect(kpis.caAccepteHT).toBeCloseTo(12544.4, 2);
    expect(kpis.nbConfirmes).toBe(2);
  });

  it("taux de transformation = devis gagnés / total (2/5 = 40 %)", () => {
    expect(kpis.tauxTransformation).toBeCloseTo(0.4, 5);
  });

  it("panier moyen HT = total HT / nombre de devis", () => {
    const totalHT = mockDevis.reduce((s, d) => s + d.montantHT, 0);
    expect(kpis.panierMoyenHT).toBeCloseTo(totalHT / 5, 2);
    expect(Math.round(kpis.panierMoyenHT)).toBe(3967);
  });

  it("ne compare rien quand le mois précédent est vide (aucun chiffre inventé)", () => {
    const seul: Devis[] = [{ ...mockDevis[0], createdAt: "2026-07-02T09:00:00Z" }];
    const k = construireCockpitDevis({ devis: seul, equipe: [], factures: [], surveillants: mockSurveillants, aujourdhui: NOW }).kpis;
    expect(k.creesCeMois).toBe(1);
    expect(k.variationCreations).toBeNull();
    expect(k.tauxTransformationMoisDernier).toBeNull();
    expect(k.panierMoyenMoisDernier).toBeNull();
  });

  it("une série sans variation réelle n'est pas exploitable en sparkline", () => {
    expect(serieExploitable([{ mois: "2026-06", label: "juin", valeur: 10, vide: false }])).toBe(false);
    expect(
      serieExploitable([
        { mois: "2026-04", label: "avr", valeur: 10, vide: false },
        { mois: "2026-05", label: "mai", valeur: 10, vide: false },
        { mois: "2026-06", label: "juin", valeur: 10, vide: false },
      ]),
    ).toBe(false);
    expect(
      serieExploitable([
        { mois: "2026-04", label: "avr", valeur: 10, vide: false },
        { mois: "2026-05", label: "mai", valeur: 40, vide: false },
        { mois: "2026-06", label: "juin", valeur: 25, vide: false },
      ]),
    ).toBe(true);
  });
});

describe("devis-cockpit — pipeline", () => {
  it("répartit les devis en 5 étapes sans doublon ni perte", () => {
    const v = vue();
    const total = v.pipeline.reduce((s, e) => s + e.nb, 0);
    const refuses = v.lignes.filter((l) => l.etape === "refuse").length;
    expect(total + refuses).toBe(v.lignes.length);
    expect(v.pipeline.map((e) => e.cle)).toEqual(["brouillon", "envoye", "attente", "accepte", "facture"]);
  });

  it("un devis envoyé depuis plus de 7 jours bascule en « En attente »", () => {
    const v = vue();
    expect(ligne("SPC-20260528-001").etape).toBe("attente"); // envoyé le 28/05
    expect(v.pipeline.find((e) => e.cle === "attente")!.nb).toBe(1);
    expect(v.pipeline.find((e) => e.cle === "envoye")!.nb).toBe(0);
  });

  it("un devis envoyé il y a 2 jours reste en « Envoyés »", () => {
    const recent: Devis = {
      ...mockDevis[3],
      statutChangeAt: "2026-07-06T10:00:00Z",
    };
    const v = construireCockpitDevis({ devis: [recent], equipe: [], factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    expect(v.lignes[0].etape).toBe("envoye");
    expect(v.pipeline.find((e) => e.cle === "envoye")!.montantHT).toBeCloseTo(2600, 2);
  });

  it("les montants d'étape somment le HT des devis de l'étape", () => {
    const v = vue();
    expect(v.pipeline.find((e) => e.cle === "accepte")!.montantHT).toBeCloseTo(12544.4, 2);
    expect(v.pipeline.find((e) => e.cle === "brouillon")!.montantHT).toBeCloseTo(4692, 2);
  });
});

describe("devis-cockpit — marge estimée", () => {
  // Le taux facturé du devis n'est PAS un coût : la marge se calcule contre le
  // taux de revient moyen des surveillants, comme le dashboard financier.
  const tauxRevient = tauxRevientMoyen(mockSurveillants);

  it("compte les heures chiffrées, pas les euros facturés", () => {
    // Sciences Po : 2×10 + 16×11,25 = 200 h
    expect(heuresChiffreesDevis(1, mockDevisEquipe)).toBeCloseTo(200, 2);
  });

  it("dérive la marge des heures chiffrées × taux de revient moyen", () => {
    const l = ligne("SPC-20260514-001");
    expect(tauxRevient).toBeGreaterThan(0);
    expect(l.heuresChiffrees).toBeCloseTo(200, 2);
    expect(l.coutEstimeHT).toBeCloseTo(Math.round(200 * tauxRevient * 100) / 100, 2);
    expect(l.margeHT).toBeCloseTo(5200 - 200 * tauxRevient, 1);
    expect(l.margeTaux).toBeCloseTo((5200 - 200 * tauxRevient) / 5200, 5);
    expect(l.margeNiveau).not.toBeNull();
  });

  it("renvoie null quand l'équipe n'est pas chiffrée", () => {
    const l = ligne("SPC-20260524-001"); // ICP Paris — aucune ligne d'équipe
    expect(l.heuresChiffrees).toBe(0);
    expect(l.coutEstimeHT).toBeNull();
    expect(l.margeHT).toBeNull();
    expect(l.margeTaux).toBeNull();
    expect(l.margeNiveau).toBeNull();
  });

  it("renvoie null quand aucun taux de revient n'est connu (aucun surveillant)", () => {
    const equipe: DevisEquipe[] = [{ id: 1, devisId: 9, role: "Surveillant", effectif: 2, heuresPers: 10, tauxH: 20, ordre: 1 }];
    const d: Devis = { ...mockDevis[0], id: 9, montantHT: 1000, montantTTC: 1200 };
    const v = construireCockpitDevis({ devis: [d], equipe, factures: [], surveillants: [], aujourdhui: NOW });
    expect(v.lignes[0].heuresChiffrees).toBeCloseTo(20, 2);
    expect(v.lignes[0].margeTaux).toBeNull();
  });

  it("qualifie la marge aux seuils de l'analyse de rentabilité", () => {
    const equipe: DevisEquipe[] = [{ id: 1, devisId: 9, role: "Surveillant", effectif: 1, heuresPers: 20, tauxH: 30, ordre: 1 }];
    const d: Devis = { ...mockDevis[0], id: 9, montantHT: 1000, montantTTC: 1200 };
    const surveillants = [{ ...mockSurveillants[0], tauxHoraire: 20 }]; // 20 h × 20 € = 400 € → 60 %
    const v = construireCockpitDevis({ devis: [d], equipe, factures: [], surveillants, aujourdhui: NOW });
    expect(v.lignes[0].coutEstimeHT).toBeCloseTo(400, 2);
    expect(v.lignes[0].margeTaux).toBeCloseTo(0.6, 5);
    expect(v.lignes[0].margeNiveau).toBe("saine");
  });
});

describe("devis-cockpit — dernière et prochaine action", () => {
  it("libelle la dernière action avec la date réellement disponible", () => {
    expect(ligne("SPC-20260514-001").derniereAction).toBe("Accepté le 25/05/2026");
    expect(ligne("SPC-20260729-001").derniereAction).toBe("Créé le 29/06/2026");
  });

  it("retombe sur « Créé le … » quand aucun changement de statut n'est horodaté", () => {
    const sansSuivi: Devis = { ...mockDevis[1], statutChangeAt: undefined };
    const v = construireCockpitDevis({ devis: [sansSuivi], equipe: [], factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    expect(v.lignes[0].derniereAction).toBe("Créé le 05/06/2026");
  });

  it("propose l'action commerciale suivante selon le statut", () => {
    expect(ligne("SPC-20260729-001").prochaineAction.libelle).toBe("À compléter");
    expect(ligne("SPC-20260528-001").prochaineAction.libelle).toBe("Relancer J+41");
    expect(ligne("SPC-20260514-001").prochaineAction.libelle).toBe("Facturation en cours"); // facture liée
    expect(ligne("SPC-20260605-001").prochaineAction.libelle).toBe("Facturation en cours");
  });

  it("signale la facturation à faire quand aucune facture n'est rattachée", () => {
    const v = construireCockpitDevis({ devis: mockDevis, equipe: mockDevisEquipe, factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    const l = v.lignes.find((x) => x.devis.reference === "SPC-20260514-001")!;
    expect(l.prochaineAction.libelle).toBe("Facturation");
    expect(l.priorite.niveau).toBe("attention");
  });
});

describe("devis-cockpit — priorité et validité", () => {
  it("un devis épinglé manuellement passe en priorité urgente", () => {
    expect(ligne("SPC-20260729-001").devis.prioritaire).toBe(true);
    expect(ligne("SPC-20260729-001").priorite.niveau).toBe("urgent");
  });

  it("la validité de 30 jours ne court que pour les devis envoyés", () => {
    expect(ligne("SPC-20260524-001").joursAvantExpiration).toBeNull(); // brouillon
    expect(ligne("SPC-20260514-001").joursAvantExpiration).toBeNull(); // accepté
    expect(ligne("SPC-20260528-001").joursAvantExpiration).toBe(30 - 41);
  });

  it("un devis envoyé dont la validité approche devient urgent", () => {
    const d: Devis = { ...mockDevis[3], statutChangeAt: "2026-06-12T09:00:00Z" }; // 26 jours
    const v = construireCockpitDevis({ devis: [d], equipe: [], factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    expect(v.lignes[0].joursAvantExpiration).toBe(4);
    expect(v.lignes[0].priorite.niveau).toBe("urgent");
  });
});

describe("devis-cockpit — alertes", () => {
  const { alertes } = vue();

  it("trie les alertes par priorité décroissante", () => {
    for (let i = 1; i < alertes.length; i++) {
      expect(alertes[i - 1].priorite).toBeGreaterThanOrEqual(alertes[i].priorite);
    }
  });

  it("remonte la relance, l'expiration de validité et les devis non chiffrés", () => {
    expect(alertes.some((a) => a.id === "relance")).toBe(true);
    expect(alertes.some((a) => a.id === "expiration")).toBe(true);
    expect(alertes.some((a) => a.id === "marge")).toBe(true);
    // Les deux devis acceptés sont déjà facturés : pas d'alerte de facturation.
    expect(alertes.some((a) => a.id === "facturation")).toBe(false);
  });

  it("chiffre l'alerte de facturation à partir des devis acceptés non facturés", () => {
    const v = construireCockpitDevis({ devis: mockDevis, equipe: mockDevisEquipe, factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    const a = v.alertes.find((x) => x.id === "facturation")!;
    expect(a.titre).toContain("2 devis acceptés à facturer");
    // Formatage français : espaces fines insécables entre les groupes.
    expect(a.detail.replace(/\s/g, " ")).toContain("12 544,40 €");
  });

  it("aucune alerte quand rien n'est actionnable", () => {
    const facture: Facture = { id: 1, reference: "FA-1", client: "X", statut: "Payée", montantHT: 100, montantTTC: 120, devisId: 7 };
    const d: Devis = {
      ...mockDevis[2],
      id: 7,
      statut: "Facturé",
      prioritaire: false,
      createdAt: "2026-07-01T09:00:00Z",
      statutChangeAt: "2026-07-05T09:00:00Z",
    };
    const equipe: DevisEquipe[] = [{ id: 1, devisId: 7, role: "Surveillant", effectif: 1, heuresPers: 10, tauxH: 25, ordre: 1 }];
    const v = construireCockpitDevis({ devis: [d], equipe, factures: [facture], surveillants: mockSurveillants, aujourdhui: NOW });
    expect(v.alertes).toHaveLength(0);
  });
});

describe("devis-cockpit — filtres rapides et période", () => {
  it("le filtre d'étape restitue exactement les lignes de l'étape", () => {
    const v = vue();
    const attente = appliquerFiltreRapide(v.lignes, { type: "etape", valeur: "attente" });
    expect(attente.map((l) => l.devis.reference)).toEqual(["SPC-20260528-001"]);
  });

  it("le filtre « sans équipe chiffrée » exclut les devis refusés", () => {
    const refuse: Devis = { ...mockDevis[0], id: 42, statut: "Refusé" };
    const v = construireCockpitDevis({ devis: [refuse], equipe: [], factures: [], surveillants: mockSurveillants, aujourdhui: NOW });
    expect(appliquerFiltreRapide(v.lignes, { type: "sansEquipe" })).toHaveLength(0);
  });

  it("la période borne sur la date de création et conserve les devis sans date", () => {
    const sansDate: Devis = { ...mockDevis[0], id: 99, createdAt: undefined };
    const liste = [...mockDevis, sansDate];
    expect(filtrerParPeriode(liste, "tout", NOW)).toHaveLength(6);
    const trenteJours = filtrerParPeriode(liste, "30j", NOW);
    expect(trenteJours.map((d) => d.reference)).toContain("SPC-20260729-001"); // créé le 29/06
    expect(trenteJours.map((d) => d.id)).toContain(99); // date inconnue : jamais masquée
    expect(trenteJours.map((d) => d.reference)).not.toContain("SPC-20260514-001"); // 14/05
  });

  it("normalise la clé de période et sait la libeller", () => {
    expect(periodeValide("n-importe-quoi")).toBe("tout");
    expect(periodeValide("30j")).toBe("30j");
    expect(libellePeriode("tout", NOW)).toBe("Tout l'historique");
    expect(libellePeriode("30j", NOW)).toBe("9 juin 2026 – 8 juillet 2026");
  });

  it("recherche sur référence, client et session", () => {
    const l = vue().lignes;
    expect(filtrerLignes(l, { ...FILTRES_VIDES, recherche: "reims" }, NOW)).toHaveLength(1);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, recherche: "SPC-20260514" }, NOW)).toHaveLength(1);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, recherche: "rattrapages" }, NOW)).toHaveLength(2);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, recherche: "inexistant" }, NOW)).toHaveLength(0);
  });

  it("combine statut, client, montant et épingle", () => {
    const l = vue().lignes;
    expect(filtrerLignes(l, { ...FILTRES_VIDES, statut: "Brouillon" }, NOW)).toHaveLength(2);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, client: "ICN" }, NOW)).toHaveLength(1);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, montantMin: "3000" }, NOW)).toHaveLength(3);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, montantMin: "3000", montantMax: "5000" }, NOW)).toHaveLength(1);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, prioritaires: true }, NOW)).toHaveLength(1);
    expect(filtresActifs({ ...FILTRES_VIDES, statut: "Envoyé", prioritaires: true })).toBe(2);
  });

  it("filtre sur la période de session, sans montrer les devis sans date d'examen", () => {
    const l = vue().lignes;
    // Au 8 juillet 2026 : ICN (07/09) et ICP Paris (08/07) sont à venir.
    expect(filtrerLignes(l, { ...FILTRES_VIDES, periodeSession: "avenir" }, NOW).map((x) => x.devis.client).sort())
      .toEqual(["ICN", "ICP Paris"]);
    expect(filtrerLignes(l, { ...FILTRES_VIDES, periodeSession: "passees" }, NOW)).toHaveLength(3);
    const sansDate = [{ ...l[0], devis: { ...l[0].devis, dateDebut: undefined } }];
    expect(filtrerLignes(sansDate, { ...FILTRES_VIDES, periodeSession: "avenir" }, NOW)).toHaveLength(0);
    expect(filtrerLignes(sansDate, FILTRES_VIDES, NOW)).toHaveLength(1);
  });

  it("liste les clients distincts triés", () => {
    expect(clientsDistincts(vue().lignes)).toEqual(["Dauphine PSL", "ICN", "ICP Paris", "ICP Reims", "Sciences Po"]);
  });

  it("compte les jours écoulés en jours pleins, quel que soit le format de date", () => {
    expect(joursEcoules("2026-07-01", NOW)).toBe(7);
    expect(joursEcoules("2026-07-01T23:30:00Z", NOW)).toBe(7);
    expect(joursEcoules(undefined, NOW)).toBeNull();
  });
});
