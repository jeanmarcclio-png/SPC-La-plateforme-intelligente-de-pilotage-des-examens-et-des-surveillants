// =============================================================================
// SALLES — view-model du centre de commandement des capacités.
//
// Fonctions PURES : aucun accès réseau, aucun état React, aucune date « now ».
// Les composants n'appliquent AUCUNE règle de criticité — tout est ici.
// =============================================================================

import type { Salle } from "./types";
import type { CouvertureSession } from "./couverture";
import {
  SEUIL_SALLE_VIGILANCE,
  SEUIL_SALLE_NORMALE,
  RATIO_ETUDIANTS_PAR_SURVEILLANT,
} from "./constants";

/** Niveaux visuels de la légende, du plus grave au plus calme. */
export type NiveauSalle = "critique" | "vigilance" | "normale" | "faible" | "inutilisee";

export const NIVEAU_LABEL: Record<NiveauSalle, string> = {
  critique: "Critique",
  vigilance: "Vigilance",
  normale: "Normale",
  faible: "Faible",
  inutilisee: "Non utilisée",
};

/** Ordre de tri « criticité » : le plus grave remonte en tête. */
const POIDS_NIVEAU: Record<NiveauSalle, number> = {
  critique: 0,
  vigilance: 1,
  normale: 2,
  faible: 3,
  inutilisee: 4,
};

export interface SalleVue {
  id: number;
  nom: string;
  /** Nom sans le préfixe « Salle » — les cartes sont déjà dans un contexte salles. */
  nomCourt: string;
  batiment?: string;
  etage?: string;
  capacite: number;
  etudiants: number;
  nbSurveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
  /** Taux d'occupation en % (peut dépasser 100 en cas de surcharge). */
  occupation: number;
  placesLibres: number;
  /** Besoin théorique de surveillants (ratio par défaut). */
  surveillantsRequis: number;
  /** Écart positif = postes à pourvoir. */
  surveillantsManquants: number;
  niveau: NiveauSalle;
  niveauLabel: string;
  /** Raison métier lorsqu'une salle est critique (sinon undefined). */
  motifCritique?: string;
  /** Notes/risques affichés dans le panneau latéral. */
  notes: string[];
}

export interface SallesKpis {
  sallesConfigurees: number;
  capaciteTotale: number;
  etudiantsPlanifies: number;
  /** Part de la capacité totale réellement occupée (%). */
  tauxCapacite: number;
  sallesCritiques: number;
  partCritiques: number;
  sallesSousOccupees: number;
  partSousOccupees: number;
  alertesActives: number;
  /**
   * Couverture de la SESSION — provient de la source de vérité unique
   * (`couvertureSession`) dès qu'un contexte de session est fourni, afin que la
   * page Salles ne réponde plus « manque 3 » là où les quatre autres écrans
   * répondent « manque 4 » (audit QA forensic V2, BUG-005).
   */
  surveillantsRequis: number;
  surveillantsAffectes: number;
  surveillantsManquants: number;
  /** true si les trois champs ci-dessus viennent de la session (et non du ratio). */
  couvertureDeSession: boolean;
  /**
   * BESOIN THÉORIQUE des salles : Σ ceil(étudiants / ratio). C'est une aide au
   * dimensionnement, PAS une couverture — d'où un libellé distinct à l'écran.
   * Le manque est la somme des manques PAR SALLE : un surplus en salle E31 ne
   * couvre pas un déficit en salle A21 (BUG-006).
   */
  besoinTheorique: number;
  besoinTheoriqueAffectes: number;
  besoinTheoriqueManquants: number;
}

export type AlerteTon = "critique" | "vigilance" | "info" | "ia";

export interface AlerteSalle {
  id: string;
  ton: AlerteTon;
  titre: string;
  detail: string;
  cta: string;
  /** Salles concernées — permet de filtrer la grille au clic. */
  cibles: number[];
}

export interface SallesView {
  salles: SalleVue[];
  kpis: SallesKpis;
  alertes: AlerteSalle[];
  batiments: string[];
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/** Taux d'occupation d'une salle, arrondi. Capacité nulle → 0. */
export function occupationSalle(s: Pick<Salle, "capacite" | "etudiants">): number {
  if (s.capacite <= 0) return 0;
  return Math.round((s.etudiants / s.capacite) * 100);
}

/** Besoin théorique en surveillants : 1 par tranche entamée, minimum 1 si occupée. */
export function surveillantsRequisPour(etudiants: number): number {
  if (etudiants <= 0) return 0;
  return Math.max(1, Math.ceil(etudiants / RATIO_ETUDIANTS_PAR_SURVEILLANT));
}

/**
 * Classement d'une salle. Le rouge (critique) est volontairement restrictif :
 * il signale une anomalie bloquante, pas un simple remplissage maximal.
 */
export function classerSalle(s: Salle): { niveau: NiveauSalle; motif?: string } {
  const occ = occupationSalle(s);

  // Anomalie 1 — dépassement réel de la capacité physique.
  if (s.capacite > 0 && s.etudiants > s.capacite) {
    return { niveau: "critique", motif: `Capacité dépassée de ${s.etudiants - s.capacite} étudiant(s)` };
  }
  // Anomalie 2 — salle occupée sans aucune surveillance.
  if (s.etudiants > 0 && s.nbSurveillants <= 0) {
    return { niveau: "critique", motif: "Aucun surveillant affecté" };
  }
  // Anomalie 3 — salle occupée sans capacité renseignée (configuration invalide).
  if (s.etudiants > 0 && s.capacite <= 0) {
    return { niveau: "critique", motif: "Capacité non renseignée" };
  }

  if (s.etudiants === 0) return { niveau: "inutilisee" };
  if (occ >= SEUIL_SALLE_VIGILANCE) return { niveau: "vigilance" };
  if (occ >= SEUIL_SALLE_NORMALE) return { niveau: "normale" };
  return { niveau: "faible" };
}

function construireSalleVue(s: Salle): SalleVue {
  const occupation = occupationSalle(s);
  const { niveau, motif } = classerSalle(s);
  const requis = surveillantsRequisPour(s.etudiants);
  const manquants = Math.max(0, requis - s.nbSurveillants);

  const notes: string[] = [];
  if (motif) notes.push(motif);
  if (!motif && occupation === 100) notes.push("Occupation maximale atteinte");
  if (manquants > 0 && !motif) notes.push(`${manquants} surveillant(s) à affecter`);
  if ((s.pmr || s.tiersTemps) && occupation >= SEUIL_SALLE_VIGILANCE) {
    notes.push("Aménagement à vérifier — salle sous tension");
  }

  return {
    id: s.id,
    nom: s.nom,
    nomCourt: s.nom.replace(/^Salle\s+/i, ""),
    batiment: s.batiment,
    etage: s.etage,
    capacite: s.capacite,
    etudiants: s.etudiants,
    nbSurveillants: s.nbSurveillants,
    pmr: s.pmr,
    tiersTemps: s.tiersTemps,
    occupation,
    placesLibres: Math.max(0, s.capacite - s.etudiants),
    surveillantsRequis: requis,
    surveillantsManquants: manquants,
    niveau,
    niveauLabel: NIVEAU_LABEL[niveau],
    motifCritique: motif,
    notes,
  };
}

/** Tri par criticité décroissante, puis par occupation décroissante, puis nom. */
export function trierParCriticite(a: SalleVue, b: SalleVue): number {
  const d = POIDS_NIVEAU[a.niveau] - POIDS_NIVEAU[b.niveau];
  if (d !== 0) return d;
  if (b.occupation !== a.occupation) return b.occupation - a.occupation;
  return a.nom.localeCompare(b.nom, "fr");
}

function construireAlertes(salles: SalleVue[]): AlerteSalle[] {
  const alertes: AlerteSalle[] = [];

  const surcharge = salles.filter((s) => s.capacite > 0 && s.etudiants > s.capacite);
  if (surcharge.length > 0) {
    alertes.push({
      id: "surcharge",
      ton: "critique",
      titre: "Surcharge détectée",
      detail: `${surcharge.length} salle${surcharge.length > 1 ? "s dépassent" : " dépasse"} 100 %`,
      cta: "Rééquilibrer",
      cibles: surcharge.map((s) => s.id),
    });
  }

  const sousOccupees = salles.filter((s) => s.niveau === "faible" || s.niveau === "inutilisee");
  if (sousOccupees.length > 0) {
    alertes.push({
      id: "sous-occupation",
      ton: "vigilance",
      titre: "Sous-occupation",
      detail: `${sousOccupees.length} salle${sousOccupees.length > 1 ? "s sous-utilisées" : " sous-utilisée"}`,
      cta: "Optimiser",
      cibles: sousOccupees.map((s) => s.id),
    });
  }

  const amenagements = salles.filter(
    (s) => (s.pmr || s.tiersTemps) && (s.niveau === "critique" || s.niveau === "vigilance"),
  );
  if (amenagements.length > 0) {
    alertes.push({
      id: "pmr",
      ton: "info",
      titre: "PMR / Tiers-temps",
      detail: `${amenagements.length} aménagement${amenagements.length > 1 ? "s à vérifier" : " à vérifier"}`,
      cta: "Consulter",
      cibles: amenagements.map((s) => s.id),
    });
  }

  const aCompleter = salles.filter((s) => s.surveillantsManquants > 0);
  if (aCompleter.length > 0) {
    alertes.push({
      id: "surveillants",
      ton: "vigilance",
      titre: "Surveillants manquants",
      detail: `${aCompleter.length} salle${aCompleter.length > 1 ? "s à compléter" : " à compléter"}`,
      cta: "Affecter",
      cibles: aCompleter.map((s) => s.id),
    });
  }

  // Proposition d'optimisation : pertinente seulement s'il y a matière à
  // rééquilibrer, c'est-à-dire des salles tendues ET des salles creuses.
  const tendues = salles.filter((s) => s.niveau === "critique" || s.niveau === "vigilance");
  if (tendues.length > 0 && sousOccupees.length > 0) {
    alertes.push({
      id: "ia",
      ton: "ia",
      titre: "Optimisation IA disponible",
      detail: "Améliorer la répartition globale",
      cta: "Lancer l’IA",
      cibles: [],
    });
  }

  return alertes;
}

/** Couverture réelle de la session courante, injectée par la page. */
export interface ContexteSessionSalles {
  couverture: CouvertureSession;
}

/**
 * Construit la vue complète de la page Salles à partir des salles brutes.
 * Entrée vide → vue vide cohérente (aucune division par zéro).
 *
 * `contexte` porte la couverture RÉELLE de la session : sans lui, la page ne
 * peut afficher qu'un besoin théorique, jamais une couverture.
 */
export function construireVueSalles(salles: Salle[], contexte?: ContexteSessionSalles): SallesView {
  const vues = salles.map(construireSalleVue).sort(trierParCriticite);
  const alertes = construireAlertes(vues);

  const capaciteTotale = vues.reduce((n, s) => n + s.capacite, 0);
  const etudiantsPlanifies = vues.reduce((n, s) => n + s.etudiants, 0);
  const surveillantsAffectes = vues.reduce((n, s) => n + s.nbSurveillants, 0);
  const surveillantsRequis = vues.reduce((n, s) => n + s.surveillantsRequis, 0);
  const critiques = vues.filter((s) => s.niveau === "critique").length;
  const sousOccupees = vues.filter((s) => s.niveau === "faible" || s.niveau === "inutilisee").length;

  // Manque théorique = somme des manques PAR SALLE. On ne soustrait JAMAIS deux
  // totaux : le surplus d'une salle ne couvre pas le déficit d'une autre.
  const besoinTheoriqueManquants = vues.reduce((n, s) => n + s.surveillantsManquants, 0);

  const batiments = Array.from(
    new Set(vues.map((s) => s.batiment).filter((b): b is string => !!b)),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  return {
    salles: vues,
    alertes,
    batiments,
    kpis: {
      sallesConfigurees: vues.length,
      capaciteTotale,
      etudiantsPlanifies,
      tauxCapacite: pct(etudiantsPlanifies, capaciteTotale),
      sallesCritiques: critiques,
      partCritiques: pct(critiques, vues.length),
      sallesSousOccupees: sousOccupees,
      partSousOccupees: pct(sousOccupees, vues.length),
      alertesActives: alertes.filter((a) => a.ton !== "ia").length,
      surveillantsRequis: contexte ? contexte.couverture.requis : surveillantsRequis,
      surveillantsAffectes: contexte ? contexte.couverture.pourvus : surveillantsAffectes,
      surveillantsManquants: contexte ? contexte.couverture.manquants : besoinTheoriqueManquants,
      couvertureDeSession: !!contexte,
      besoinTheorique: surveillantsRequis,
      besoinTheoriqueAffectes: surveillantsAffectes,
      besoinTheoriqueManquants,
    },
  };
}
