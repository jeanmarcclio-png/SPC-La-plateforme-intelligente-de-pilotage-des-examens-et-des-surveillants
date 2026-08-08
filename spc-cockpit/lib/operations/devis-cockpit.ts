// -----------------------------------------------------------------------------
// COCKPIT COMMERCIAL — DEVIS · view-model.
//
// SOURCE DE VÉRITÉ UNIQUE de l'écran /operations/devis : KPI, pipeline, alertes
// et lignes de tableau dérivent TOUS de ce module, à partir des mêmes entrées
// (devis, équipe chiffrée, factures). Fonctions PURES : `aujourdhui` est injecté
// pour un rendu déterministe et testable.
//
// Règle absolue (Master Prompt) : aucun chiffre inventé. Une donnée absente
// (équipe non chiffrée, date de statut inconnue) produit `null` — l'interface
// affiche « — », jamais une estimation de complaisance.
// -----------------------------------------------------------------------------

import type { Devis, DevisEquipe, Facture, StatutDevis, Surveillant } from "./types";
import { analyseRentabilite } from "./rentabilite";
import {
  DELAI_RELANCE_DEVIS_J,
  SEUIL_EXPIRATION_DEVIS_J,
  STATUTS_CA_CONFIRME,
  VALIDITE_DEVIS_J,
} from "./constants";

// ── Types de sortie ──────────────────────────────────────────────────────────

/**
 * Étape de pipeline. « attente » n'est pas un statut stocké : c'est un devis
 * ENVOYÉ resté sans réponse au-delà de DELAI_RELANCE_DEVIS_J jours.
 * Les devis refusés sortent du pipeline (« refuse ») mais restent au tableau.
 */
export type EtapePipeline = "brouillon" | "envoye" | "attente" | "accepte" | "facture";
export type EtapeLigne = EtapePipeline | "refuse";

export type NiveauPriorite = "urgent" | "attention" | "suivi" | "positif" | "neutre";
export type TonAction = "urgent" | "action" | "neutre";
export type NiveauAlerteDevis = "urgent" | "attention" | "info";

/** Filtre appliqué au tableau depuis le pipeline ou une alerte. */
export type FiltreRapide =
  | { type: "etape"; valeur: EtapePipeline }
  | { type: "expiration" }
  | { type: "aFacturer" }
  | { type: "brouillonIncomplet" }
  | { type: "sansEquipe" };

export interface LigneDevis {
  devis: Devis;
  etape: EtapeLigne;
  /** Heures chiffrées sur le devis (effectif × heures/personne) — 0 si non chiffré. */
  heuresChiffrees: number;
  /** Coût de revient estimé des surveillants — null si non calculable. */
  coutEstimeHT: number | null;
  margeHT: number | null;
  /** Taux de marge 0–1 — null si les heures ou le taux de revient manquent. */
  margeTaux: number | null;
  /** Qualification de la marge (mêmes seuils que l'analyse de rentabilité). */
  margeNiveau: "saine" | "surveiller" | "critique" | null;
  /** « Créé le 29/06/2026 », « Accepté le 20/06/2026 »… */
  derniereAction: string;
  prochaineAction: { libelle: string; ton: TonAction };
  priorite: { niveau: NiveauPriorite; motif: string };
  /** Jours écoulés depuis le dernier mouvement de statut (null si date inconnue). */
  joursDepuisStatut: number | null;
  /** Jours restants avant expiration de la validité (devis envoyés uniquement). */
  joursAvantExpiration: number | null;
  aFacture: boolean;
  incomplet: boolean;
}

export interface PointSerie {
  /** Clé « 2026-06 ». */
  mois: string;
  /** Libellé court « juin ». */
  label: string;
  valeur: number;
  /** true si aucun devis ce mois-là — le point ne compte pas dans la courbe. */
  vide: boolean;
}

export interface KpisDevis {
  total: number;
  creesCeMois: number;
  /** Variation du nombre de devis créés vs mois précédent — null si mois vide. */
  variationCreations: number | null;
  caPotentielHT: number;
  nbEnvoyes: number;
  /** Devis gagnés / total des devis de la période (0–1). */
  tauxTransformation: number;
  tauxTransformationMoisDernier: number | null;
  caAccepteHT: number;
  nbConfirmes: number;
  panierMoyenHT: number;
  panierMoyenMoisDernier: number | null;
  serieCaPotentiel: PointSerie[];
  serieTaux: PointSerie[];
}

export interface EtapePipelineVue {
  cle: EtapePipeline;
  libelle: string;
  nb: number;
  montantHT: number;
}

export interface AlerteDevis {
  id: string;
  niveau: NiveauAlerteDevis;
  titre: string;
  detail: string;
  cta: string;
  filtre?: FiltreRapide;
  href?: string;
  priorite: number;
}

export interface CockpitDevis {
  lignes: LigneDevis[];
  kpis: KpisDevis;
  pipeline: EtapePipelineVue[];
  alertes: AlerteDevis[];
}

// ── Utilitaires de date (ISO complet ou yyyy-mm-dd) ──────────────────────────

const JOUR_MS = 86_400_000;

function auDebutDuJour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseISO(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Jours pleins écoulés depuis `iso` (négatif si la date est dans le futur). */
export function joursEcoules(iso: string | undefined, aujourdhui: Date): number | null {
  const d = parseISO(iso);
  if (!d) return null;
  return Math.floor((auDebutDuJour(aujourdhui).getTime() - auDebutDuJour(d).getTime()) / JOUR_MS);
}

/** Clé de mois « 2026-06 ». */
function cleMois(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMois(d: Date): string {
  return d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
}

function dateCourte(iso?: string): string | null {
  const d = parseISO(iso);
  if (!d) return null;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Date de référence du suivi : dernier changement de statut si connu, sinon
 * création. Tant que la migration 31 n'est pas appliquée, tout retombe sur
 * `createdAt` — et les libellés le disent (« Créé le … »).
 */
function dateStatut(d: Devis): string | undefined {
  return d.statutChangeAt ?? d.createdAt;
}

const estConfirme = (s: StatutDevis) => (STATUTS_CA_CONFIRME as readonly string[]).includes(s);

// ── Période d'analyse ────────────────────────────────────────────────────────

export const PERIODES = [
  { cle: "tout", libelle: "Tout l'historique", jours: null },
  { cle: "30j", libelle: "30 derniers jours", jours: 30 },
  { cle: "90j", libelle: "3 derniers mois", jours: 90 },
  { cle: "12m", libelle: "12 derniers mois", jours: 365 },
] as const;

export type ClePeriode = (typeof PERIODES)[number]["cle"];

export function periodeValide(cle?: string): ClePeriode {
  return (PERIODES.find((p) => p.cle === cle)?.cle ?? "tout") as ClePeriode;
}

/** Libellé affiché à côté du filtre « Période ». */
export function libellePeriode(cle: ClePeriode, aujourdhui: Date): string {
  const p = PERIODES.find((x) => x.cle === cle);
  if (!p || p.jours === null) return "Tout l'historique";
  const debut = new Date(auDebutDuJour(aujourdhui).getTime() - (p.jours - 1) * JOUR_MS);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(debut)} – ${fmt(aujourdhui)}`;
}

/**
 * Restreint la liste aux devis créés dans la fenêtre d'analyse. Un devis sans
 * date de création reste visible : on ne masque jamais une donnée réelle.
 */
export function filtrerParPeriode(devis: Devis[], cle: ClePeriode, aujourdhui: Date): Devis[] {
  const p = PERIODES.find((x) => x.cle === cle);
  if (!p || p.jours === null) return devis;
  return devis.filter((d) => {
    const jours = joursEcoules(d.createdAt, aujourdhui);
    return jours === null || (jours >= 0 && jours < p.jours!);
  });
}

// ── Marge estimée ────────────────────────────────────────────────────────────
//
// ATTENTION : `devis_equipe.taux_h` est le taux FACTURÉ au client (il sert à
// construire le prix de vente sur la fiche devis) — ce n'est pas un coût. La
// marge se calcule donc comme partout ailleurs dans le module (cf. dashboard,
// buildFinancials) : heures chiffrées × TAUX DE REVIENT moyen des surveillants,
// comparé au montant HT. Sans heures chiffrées ou sans taux de revient connu,
// la marge reste `null` : on n'affiche pas un chiffre qu'on n'a pas.

/** Heures chiffrées sur un devis (effectif × heures par personne). */
export function heuresChiffreesDevis(devisId: number, equipe: DevisEquipe[]): number {
  return equipe
    .filter((e) => e.devisId === devisId)
    .reduce((s, e) => s + Math.max(0, e.effectif) * Math.max(0, e.heuresPers), 0);
}

/** Taux horaire de revient moyen constaté sur les surveillants (0 si inconnu). */
export function tauxRevientMoyen(surveillants: Surveillant[]): number {
  const taux = surveillants.map((s) => s.tauxHoraire || 0).filter((t) => t > 0);
  if (taux.length === 0) return 0;
  return taux.reduce((s, t) => s + t, 0) / taux.length;
}

// ── Construction d'une ligne ─────────────────────────────────────────────────

const VERBE: Record<StatutDevis, string> = {
  Brouillon: "Créé",
  Envoyé: "Envoyé",
  Accepté: "Accepté",
  Refusé: "Refusé",
  Facturé: "Facturé",
};

function construireLigne(
  d: Devis,
  equipe: DevisEquipe[],
  factures: Facture[],
  tauxRevient: number,
  aujourdhui: Date,
): LigneDevis {
  const joursDepuisStatut = joursEcoules(dateStatut(d), aujourdhui);
  const aFacture = factures.some((f) => f.devisId === d.id);
  const incomplet = d.montantHT <= 0 || !d.dateDebut;

  // Étape de pipeline
  let etape: EtapeLigne;
  if (d.statut === "Brouillon") etape = "brouillon";
  else if (d.statut === "Refusé") etape = "refuse";
  else if (d.statut === "Accepté") etape = "accepte";
  else if (d.statut === "Facturé") etape = "facture";
  else etape = joursDepuisStatut !== null && joursDepuisStatut >= DELAI_RELANCE_DEVIS_J ? "attente" : "envoye";

  // Validité : elle court à compter de l'ENVOI — sans objet pour un brouillon
  // ou un devis déjà décidé.
  const joursAvantExpiration =
    d.statut === "Envoyé" && joursDepuisStatut !== null ? VALIDITE_DEVIS_J - joursDepuisStatut : null;

  // Marge estimée — calculable seulement si les heures ET le taux de revient
  // sont connus, et si le devis porte un montant.
  const heuresChiffrees = heuresChiffreesDevis(d.id, equipe);
  const calculable = heuresChiffrees > 0 && tauxRevient > 0 && d.montantHT > 0;
  const rent = calculable
    ? analyseRentabilite({ caHT: d.montantHT, lignes: [{ heures: heuresChiffrees, tauxHoraire: tauxRevient }] })
    : null;
  const coutEstimeHT = rent?.coutHT ?? null;
  const margeHT = rent?.margeHT ?? null;
  const margeTaux = rent?.tauxMarge ?? null;
  const margeNiveau = rent?.niveau ?? null;

  // Dernière action — le libellé suit la date réellement disponible.
  const dateSuivi = dateCourte(dateStatut(d));
  const verbe = d.statutChangeAt ? VERBE[d.statut] : "Créé";
  const derniereAction = dateSuivi ? `${verbe} le ${dateSuivi}` : "Date inconnue";

  // Prochaine action
  let prochaineAction: LigneDevis["prochaineAction"];
  if (d.statut === "Brouillon") {
    prochaineAction = { libelle: "À compléter", ton: "action" };
  } else if (d.statut === "Envoyé") {
    prochaineAction =
      etape === "attente"
        ? { libelle: `Relancer J+${joursDepuisStatut}`, ton: "urgent" }
        : { libelle: "Réponse attendue", ton: "neutre" };
  } else if (d.statut === "Accepté") {
    prochaineAction = aFacture
      ? { libelle: "Facturation en cours", ton: "neutre" }
      : { libelle: "Facturation", ton: "action" };
  } else if (d.statut === "Facturé") {
    prochaineAction = { libelle: "Suivi encaissement", ton: "neutre" };
  } else {
    prochaineAction = { libelle: "—", ton: "neutre" };
  }

  // Priorité — cascade du plus urgent au plus neutre.
  let priorite: LigneDevis["priorite"];
  if (d.prioritaire) {
    priorite = { niveau: "urgent", motif: "Devis marqué prioritaire" };
  } else if (joursAvantExpiration !== null && joursAvantExpiration < 0) {
    priorite = { niveau: "urgent", motif: `Validité expirée depuis ${-joursAvantExpiration} j` };
  } else if (joursAvantExpiration !== null && joursAvantExpiration <= SEUIL_EXPIRATION_DEVIS_J) {
    priorite = { niveau: "urgent", motif: `Validité expire dans ${joursAvantExpiration} j` };
  } else if (etape === "attente") {
    priorite = { niveau: "attention", motif: `Sans réponse depuis ${joursDepuisStatut} j` };
  } else if (d.statut === "Accepté" && !aFacture) {
    priorite = { niveau: "attention", motif: "Accepté, reste à facturer" };
  } else if (d.statut === "Brouillon" && incomplet) {
    priorite = { niveau: "attention", motif: "Brouillon incomplet (montant ou dates)" };
  } else if (d.statut === "Envoyé") {
    priorite = { niveau: "suivi", motif: "Envoyé, en attente de réponse" };
  } else if (estConfirme(d.statut)) {
    priorite = { niveau: "positif", motif: "Affaire gagnée" };
  } else {
    priorite = { niveau: "neutre", motif: "Aucune action requise" };
  }

  return {
    devis: d,
    etape,
    heuresChiffrees,
    coutEstimeHT,
    margeHT,
    margeTaux,
    margeNiveau,
    derniereAction,
    prochaineAction,
    priorite,
    joursDepuisStatut,
    joursAvantExpiration,
    aFacture,
    incomplet,
  };
}

// ── KPI ──────────────────────────────────────────────────────────────────────

function serieMensuelle(
  devis: Devis[],
  aujourdhui: Date,
  nbMois: number,
  calcul: (lot: Devis[]) => number,
): PointSerie[] {
  const points: PointSerie[] = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    const ref = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1);
    const cle = cleMois(ref);
    const lot = devis.filter((d) => {
      const c = parseISO(d.createdAt);
      return c !== null && cleMois(c) === cle;
    });
    points.push({ mois: cle, label: labelMois(ref), valeur: lot.length ? calcul(lot) : 0, vide: lot.length === 0 });
  }
  return points;
}

/** Une sparkline n'est affichée que si la série porte une information réelle. */
export function serieExploitable(serie: PointSerie[]): boolean {
  const pleins = serie.filter((p) => !p.vide);
  if (pleins.length < 3) return false;
  return new Set(pleins.map((p) => p.valeur)).size >= 2;
}

function tauxTransformation(lot: Devis[]): number {
  if (lot.length === 0) return 0;
  return lot.filter((d) => estConfirme(d.statut)).length / lot.length;
}

function construireKpis(devis: Devis[], aujourdhui: Date): KpisDevis {
  const moisCourant = cleMois(aujourdhui);
  const moisPrecedent = cleMois(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1));
  const parMois = (cle: string) =>
    devis.filter((d) => {
      const c = parseISO(d.createdAt);
      return c !== null && cleMois(c) === cle;
    });

  const ceMois = parMois(moisCourant);
  const moisDernier = parMois(moisPrecedent);

  const envoyes = devis.filter((d) => d.statut === "Envoyé");
  const confirmes = devis.filter((d) => estConfirme(d.statut));
  const totalHT = devis.reduce((s, d) => s + d.montantHT, 0);

  return {
    total: devis.length,
    creesCeMois: ceMois.length,
    variationCreations: moisDernier.length === 0 ? null : ceMois.length - moisDernier.length,
    caPotentielHT: envoyes.reduce((s, d) => s + d.montantHT, 0),
    nbEnvoyes: envoyes.length,
    tauxTransformation: tauxTransformation(devis),
    tauxTransformationMoisDernier: moisDernier.length === 0 ? null : tauxTransformation(moisDernier),
    caAccepteHT: confirmes.reduce((s, d) => s + d.montantHT, 0),
    nbConfirmes: confirmes.length,
    panierMoyenHT: devis.length === 0 ? 0 : totalHT / devis.length,
    panierMoyenMoisDernier:
      moisDernier.length === 0 ? null : moisDernier.reduce((s, d) => s + d.montantHT, 0) / moisDernier.length,
    serieCaPotentiel: serieMensuelle(devis, aujourdhui, 6, (lot) =>
      lot.filter((d) => d.statut === "Envoyé").reduce((s, d) => s + d.montantHT, 0),
    ),
    serieTaux: serieMensuelle(devis, aujourdhui, 6, (lot) => tauxTransformation(lot) * 100),
  };
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

const ETAPES: { cle: EtapePipeline; libelle: string }[] = [
  { cle: "brouillon", libelle: "Brouillons" },
  { cle: "envoye", libelle: "Envoyés" },
  { cle: "attente", libelle: "En attente" },
  { cle: "accepte", libelle: "Acceptés" },
  { cle: "facture", libelle: "Facturés" },
];

function construirePipeline(lignes: LigneDevis[]): EtapePipelineVue[] {
  return ETAPES.map((e) => {
    const lot = lignes.filter((l) => l.etape === e.cle);
    return {
      cle: e.cle,
      libelle: e.libelle,
      nb: lot.length,
      montantHT: lot.reduce((s, l) => s + l.devis.montantHT, 0),
    };
  });
}

// ── Alertes & actions prioritaires ───────────────────────────────────────────

const pluriel = (n: number, sing: string, plur: string) => (n > 1 ? plur : sing);

function construireAlertes(lignes: LigneDevis[]): AlerteDevis[] {
  const alertes: AlerteDevis[] = [];

  const sansReponse = lignes.filter((l) => l.etape === "attente");
  if (sansReponse.length > 0) {
    alertes.push({
      id: "relance",
      niveau: "attention",
      titre: `${sansReponse.length} ${pluriel(sansReponse.length, "devis est", "devis sont")} en attente de réponse depuis plus de ${DELAI_RELANCE_DEVIS_J} jours`,
      detail: "Relance recommandée",
      cta: "Relancer",
      filtre: { type: "etape", valeur: "attente" },
      priorite: 80,
    });
  }

  const expirants = lignes.filter(
    (l) => l.joursAvantExpiration !== null && l.joursAvantExpiration <= SEUIL_EXPIRATION_DEVIS_J,
  );
  if (expirants.length > 0) {
    const expires = expirants.filter((l) => (l.joursAvantExpiration ?? 0) < 0).length;
    alertes.push({
      id: "expiration",
      niveau: "urgent",
      titre:
        expires === expirants.length
          ? `${expirants.length} ${pluriel(expirants.length, "devis a dépassé", "devis ont dépassé")} sa durée de validité`
          : `${expirants.length} ${pluriel(expirants.length, "devis expire", "devis expirent")} dans les ${SEUIL_EXPIRATION_DEVIS_J} prochains jours`,
      detail: `Action requise — validité de ${VALIDITE_DEVIS_J} jours`,
      cta: "Voir",
      filtre: { type: "expiration" },
      priorite: 100,
    });
  }

  const aFacturer = lignes.filter((l) => l.devis.statut === "Accepté" && !l.aFacture);
  if (aFacturer.length > 0) {
    const total = aFacturer.reduce((s, l) => s + l.devis.montantHT, 0);
    alertes.push({
      id: "facturation",
      niveau: "info",
      titre: `${aFacturer.length} ${pluriel(aFacturer.length, "devis accepté à facturer", "devis acceptés à facturer")}`,
      detail: `Montant total : ${total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      cta: "Facturer",
      href: "/operations/facturation",
      priorite: 60,
    });
  }

  const brouillons = lignes.filter((l) => l.devis.statut === "Brouillon" && l.incomplet);
  if (brouillons.length > 0) {
    alertes.push({
      id: "brouillons",
      niveau: "attention",
      titre: `${brouillons.length} ${pluriel(brouillons.length, "brouillon incomplet", "brouillons incomplets")}`,
      detail: "Montant ou dates de session manquants",
      cta: "Compléter",
      filtre: { type: "brouillonIncomplet" },
      priorite: 45,
    });
  }

  const sansEquipe = lignes.filter((l) => l.heuresChiffrees === 0 && l.devis.statut !== "Refusé");
  if (sansEquipe.length > 0) {
    alertes.push({
      id: "marge",
      niveau: "info",
      titre: `${sansEquipe.length} ${pluriel(sansEquipe.length, "devis sans équipe chiffrée", "devis sans équipe chiffrée")}`,
      detail: "Marge estimée indisponible tant que l'équipe n'est pas saisie",
      cta: "Chiffrer",
      filtre: { type: "sansEquipe" },
      priorite: 30,
    });
  }

  return alertes.sort((a, b) => b.priorite - a.priorite);
}

// ── Point d'entrée ───────────────────────────────────────────────────────────

export function construireCockpitDevis(input: {
  devis: Devis[];
  equipe: DevisEquipe[];
  factures: Facture[];
  /** Base du taux de revient utilisé pour la marge estimée. */
  surveillants: Surveillant[];
  aujourdhui: Date;
}): CockpitDevis {
  const { devis, equipe, factures, surveillants, aujourdhui } = input;
  const tauxRevient = tauxRevientMoyen(surveillants);
  const lignes = devis.map((d) => construireLigne(d, equipe, factures, tauxRevient, aujourdhui));
  return {
    lignes,
    kpis: construireKpis(devis, aujourdhui),
    pipeline: construirePipeline(lignes),
    alertes: construireAlertes(lignes),
  };
}

/** Applique un filtre rapide (pipeline / alerte) à la liste des lignes. */
export function appliquerFiltreRapide(lignes: LigneDevis[], filtre: FiltreRapide | null): LigneDevis[] {
  if (!filtre) return lignes;
  switch (filtre.type) {
    case "etape":
      return lignes.filter((l) => l.etape === filtre.valeur);
    case "expiration":
      return lignes.filter(
        (l) => l.joursAvantExpiration !== null && l.joursAvantExpiration <= SEUIL_EXPIRATION_DEVIS_J,
      );
    case "aFacturer":
      return lignes.filter((l) => l.devis.statut === "Accepté" && !l.aFacture);
    case "brouillonIncomplet":
      return lignes.filter((l) => l.devis.statut === "Brouillon" && l.incomplet);
    case "sansEquipe":
      return lignes.filter((l) => l.heuresChiffrees === 0 && l.devis.statut !== "Refusé");
  }
}

// ── Filtres du tableau ───────────────────────────────────────────────────────

/** Période d'EXAMEN (date de session), distincte de la période d'analyse. */
export type PeriodeSession = "" | "avenir" | "mois" | "passees";

export interface FiltresDevis {
  recherche: string;
  statut: string; // "" = tous
  periodeSession: PeriodeSession;
  client: string; // "" = tous
  montantMin: string;
  montantMax: string;
  prioritaires: boolean;
}

export const FILTRES_VIDES: FiltresDevis = {
  recherche: "",
  statut: "",
  periodeSession: "",
  client: "",
  montantMin: "",
  montantMax: "",
  prioritaires: false,
};

export function filtresActifs(f: FiltresDevis): number {
  return [
    f.recherche.trim() !== "",
    f.statut !== "",
    f.periodeSession !== "",
    f.client !== "",
    f.montantMin !== "",
    f.montantMax !== "",
    f.prioritaires,
  ].filter(Boolean).length;
}

function correspondPeriodeSession(l: LigneDevis, periode: PeriodeSession, aujourdhui: Date): boolean {
  if (periode === "") return true;
  const debut = parseISO(l.devis.dateDebut);
  if (!debut) return false; // pas de date de session : hors de tout filtre de session
  const jour = auDebutDuJour(aujourdhui);
  if (periode === "avenir") return debut >= jour;
  if (periode === "passees") return debut < jour;
  return cleMois(debut) === cleMois(aujourdhui);
}

/** Filtrage du tableau — pur et testable, appliqué APRÈS le filtre rapide. */
export function filtrerLignes(lignes: LigneDevis[], f: FiltresDevis, aujourdhui: Date): LigneDevis[] {
  const q = f.recherche.trim().toLowerCase();
  const min = f.montantMin === "" ? null : Number(f.montantMin);
  const max = f.montantMax === "" ? null : Number(f.montantMax);

  return lignes.filter((l) => {
    const d = l.devis;
    if (q) {
      const champs = [d.reference, d.client, d.session ?? "", d.contact ?? "", d.ville ?? ""];
      if (!champs.some((c) => c.toLowerCase().includes(q))) return false;
    }
    if (f.statut && d.statut !== f.statut) return false;
    if (f.client && d.client !== f.client) return false;
    if (f.prioritaires && !d.prioritaire) return false;
    if (min !== null && !Number.isNaN(min) && d.montantHT < min) return false;
    if (max !== null && !Number.isNaN(max) && d.montantHT > max) return false;
    return correspondPeriodeSession(l, f.periodeSession, aujourdhui);
  });
}

/** Liste triée des clients présents, pour le filtre « Tous clients ». */
export function clientsDistincts(lignes: LigneDevis[]): string[] {
  return [...new Set(lignes.map((l) => l.devis.client))].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Libellé du filtre rapide actif, affiché dans la barre de filtres. */
export function libelleFiltreRapide(filtre: FiltreRapide): string {
  switch (filtre.type) {
    case "etape":
      return ETAPES.find((e) => e.cle === filtre.valeur)?.libelle ?? "Étape";
    case "expiration":
      return "Validité proche de l'échéance";
    case "aFacturer":
      return "Acceptés à facturer";
    case "brouillonIncomplet":
      return "Brouillons incomplets";
    case "sansEquipe":
      return "Sans équipe chiffrée";
  }
}
