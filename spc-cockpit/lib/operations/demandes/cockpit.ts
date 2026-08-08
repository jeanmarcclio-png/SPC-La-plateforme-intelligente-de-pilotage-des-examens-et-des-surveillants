// Pilotage décisionnel du portefeuille de demandes clients — fonctions PURES.
// Aucune dépendance React/DOM : tout ce que le cockpit affiche (complétude,
// urgence, prochaine action, potentiel, synthèse) est calculé ici et testé.
//
// Règle produit : le devis n'est JAMAIS calculé depuis une demande. Le
// « potentiel HT » exposé ici est une pondération indicative du pipeline
// commercial (VALEUR_INDICATIVE_ETUDIANT_EUR), pas un montant contractuel.

import {
  OBJECTIF_CONVERSION_DEMANDES,
  SEUIL_URGENCE_DEMANDE_J,
  VALEUR_INDICATIVE_ETUDIANT_EUR,
} from "../constants";
import { totauxDemande } from "./logic";
import type { DemandeClient, LigneSalleDemande, StatutDemande } from "./types";

const MS_JOUR = 86_400_000;

/** Statuts qui ne pèsent plus dans le portefeuille actif. */
const STATUTS_CLOS: StatutDemande[] = ["Archivée", "Annulée"];

/** Statuts ayant franchi la validation SPC (pipeline converti ou convertible). */
const STATUTS_VALIDES: StatutDemande[] = ["Validée SPC", "Convertie en mission"];

export function estClose(d: DemandeClient): boolean {
  return STATUTS_CLOS.includes(d.statut);
}

function ligneNonVide(l: LigneSalleDemande): boolean {
  return Boolean(l.date || l.salle || l.etudiants || l.creneau);
}

function jourISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Complétude — 11 blocs métier (Master Prompt §25), pondérés sur 100.
// ---------------------------------------------------------------------------

export interface BlocCompletude {
  cle: string;
  /** Libellé affiché dans le détail de complétude. */
  label: string;
  /** Formulation utilisable dans une phrase d'action (« Vérifier les salles »). */
  sujet: string;
  poids: number;
  /** 0 → absent · 1 → complet · valeur intermédiaire → partiellement renseigné. */
  score: number;
}

export interface Completude {
  /** Pourcentage entier 0–100. */
  pct: number;
  blocs: BlocCompletude[];
  /** Blocs incomplets, du plus pénalisant au moins pénalisant. */
  manquants: BlocCompletude[];
}

/** Score d'un bloc « oui / non / partiellement renseigné ». */
function scoreBesoin(present: boolean | undefined, nombre: number | undefined): number {
  if (present === undefined) return 0; // question jamais tranchée
  if (!present) return 1; // « non concerné » est une réponse complète
  return nombre && nombre > 0 ? 1 : 0.5;
}

/** Fraction des lignes satisfaisant un prédicat (0 si aucune ligne exploitable). */
function fraction(lignes: LigneSalleDemande[], ok: (l: LigneSalleDemande) => boolean): number {
  if (!lignes.length) return 0;
  return lignes.filter(ok).length / lignes.length;
}

export function completudeDemande(d: DemandeClient): Completude {
  const lignes = d.lignes.filter(ligneNonVide);
  const contact = (nom?: string, email?: string) =>
    ((nom?.trim() ? 1 : 0) + (email?.trim() ? 1 : 0)) / 2;

  const blocs: BlocCompletude[] = [
    { cle: "client", label: "Client", sujet: "le client", poids: 8, score: d.etablissement?.trim() ? 1 : 0 },
    { cle: "demandeur", label: "Demandeur", sujet: "le demandeur", poids: 10, score: contact(d.demandeur?.nom, d.demandeur?.email) },
    {
      cle: "responsables",
      label: "Responsables",
      sujet: "les responsables",
      poids: 10,
      score: ((d.responsableClient?.nom?.trim() ? 1 : 0) + (d.responsableSpc?.trim() ? 1 : 0)) / 2,
    },
    { cle: "periode", label: "Période", sujet: "les dates", poids: 12, score: fraction(lignes, (l) => Boolean(l.date)) },
    { cle: "campus", label: "Campus", sujet: "le campus", poids: 6, score: (d.campus ?? d.ville)?.trim() ? 1 : 0 },
    { cle: "salles", label: "Salles", sujet: "les salles", poids: 14, score: fraction(lignes, (l) => Boolean(l.salle?.trim())) },
    { cle: "effectifs", label: "Effectifs", sujet: "les effectifs", poids: 12, score: fraction(lignes, (l) => Number(l.etudiants) > 0) },
    {
      cle: "horaires",
      label: "Horaires",
      sujet: "les horaires",
      poids: 12,
      score: fraction(lignes, (l) => Boolean(l.debutExamen && l.finExamen)),
    },
    { cle: "pmr", label: "PMR", sujet: "le volet PMR", poids: 6, score: scoreBesoin(d.pmrPresence, d.pmrNombre) },
    { cle: "tiersTemps", label: "Tiers-temps", sujet: "le tiers-temps", poids: 6, score: scoreBesoin(d.ttPresence, d.ttNombre) },
    {
      cle: "infos",
      label: "Informations complémentaires",
      sujet: "les informations complémentaires",
      poids: 4,
      score: d.observations?.trim() || d.besoinsParticuliers?.length ? 1 : 0,
    },
  ];

  const total = blocs.reduce((n, b) => n + b.poids * b.score, 0);
  const manquants = blocs
    .filter((b) => b.score < 1)
    .sort((a, b) => b.poids * (1 - b.score) - a.poids * (1 - a.score));

  return { pct: Math.round(total), blocs, manquants };
}

// ---------------------------------------------------------------------------
// Échéance et urgence
// ---------------------------------------------------------------------------

export interface Echeance {
  /** Date ISO de la première épreuve. */
  dateISO: string;
  /** Jours restants (négatif = épreuve passée). */
  jours: number;
  depassee: boolean;
}

/** Première date d'épreuve de la demande, exprimée en jours restants. */
export function echeanceDemande(d: DemandeClient, now: Date = new Date()): Echeance | null {
  const { dateMin } = totauxDemande(d);
  if (!dateMin) return null;
  const cible = Date.parse(`${dateMin}T00:00:00Z`);
  if (Number.isNaN(cible)) return null;
  const aujourdhui = Date.parse(`${jourISO(now)}T00:00:00Z`);
  const jours = Math.round((cible - aujourdhui) / MS_JOUR);
  return { dateISO: dateMin, jours, depassee: jours < 0 };
}

/**
 * Une demande est urgente quand l'épreuve approche (ou est dépassée) ET que le
 * dossier n'est pas prêt : incomplet, ou pas encore validé par SPC (§26).
 */
export function estUrgente(d: DemandeClient, now: Date = new Date()): boolean {
  if (estClose(d) || d.statut === "Convertie en mission") return false;
  const e = echeanceDemande(d, now);
  if (!e || e.jours > SEUIL_URGENCE_DEMANDE_J) return false;
  return completudeDemande(d).pct < 100 || d.statut !== "Validée SPC";
}

// ---------------------------------------------------------------------------
// Prochaine action attendue
// ---------------------------------------------------------------------------

export interface ProchaineAction {
  label: string;
  detail: string;
}

export function prochaineActionDemande(d: DemandeClient): ProchaineAction {
  const { manquants } = completudeDemande(d);
  const premier = manquants[0]?.sujet;
  const second = manquants[1]?.sujet;

  switch (d.statut) {
    case "Validée SPC":
      return { label: "Convertir en mission", detail: "Proposition prête" };
    case "Convertie en mission":
      return { label: "Suivre la mission", detail: d.missionRef ?? "Mission créée" };
    case "Archivée":
      return { label: "Aucune action", detail: "Dossier archivé" };
    case "Annulée":
      return { label: "Aucune action", detail: "Demande annulée" };
    case "Complète":
      return { label: "Valider la demande", detail: "Contrôle SPC final" };
    case "Brouillon":
      return {
        label: "Compléter les infos",
        detail: manquants.slice(0, 2).map((b) => b.label).join(" & ") || "Finaliser la saisie",
      };
    default:
      // « À vérifier » / « À corriger » : on nomme les deux plus gros trous.
      return {
        label: premier ? `Vérifier ${premier}` : "Vérifier la demande",
        detail: second ? `Compléter ${second}` : "Contrôle final avant validation",
      };
  }
}

// ---------------------------------------------------------------------------
// Potentiel commercial (indicatif — jamais un devis)
// ---------------------------------------------------------------------------

/** Potentiel HT indicatif d'une demande : effectif × valeur indicative étudiant. */
export function potentielIndicatifHT(d: DemandeClient): number {
  return totauxDemande(d).nbEtudiants * VALEUR_INDICATIVE_ETUDIANT_EUR;
}

// ---------------------------------------------------------------------------
// Ancienneté de la dernière mise à jour
// ---------------------------------------------------------------------------

export type FraicheurTon = "frais" | "attention" | "obsolete";

export interface Fraicheur {
  label: string; // « Il y a 2 h »
  ton: FraicheurTon;
  heures: number;
}

/** Ancienneté lisible de `updatedAt` (« Il y a 2 h », « Il y a 3 j »). */
export function fraicheurDemande(d: DemandeClient, now: Date = new Date()): Fraicheur {
  const t = Date.parse(d.updatedAt);
  if (Number.isNaN(t)) return { label: "—", ton: "obsolete", heures: Number.POSITIVE_INFINITY };
  const heures = Math.max(0, (now.getTime() - t) / 3_600_000);
  const ton: FraicheurTon = heures < 24 ? "frais" : heures < 72 ? "attention" : "obsolete";
  if (heures < 1) return { label: "À l'instant", ton, heures };
  if (heures < 24) return { label: `Il y a ${Math.floor(heures)} h`, ton, heures };
  const jours = Math.floor(heures / 24);
  return { label: `Il y a ${jours} j`, ton, heures };
}

// ---------------------------------------------------------------------------
// Vue décisionnelle d'une ligne du portefeuille
// ---------------------------------------------------------------------------

export interface LigneCockpit {
  demande: DemandeClient;
  completude: Completude;
  echeance: Echeance | null;
  urgente: boolean;
  action: ProchaineAction;
  fraicheur: Fraicheur;
  potentielHT: number;
  nbEtudiants: number;
  nbSalles: number;
  nbJours: number;
  periodeLabel: string;
}

/** Libellé « 16 → 18 juin 2026 » à partir des bornes ISO. */
function libellePeriode(dateMin?: string, dateMax?: string): string {
  if (!dateMin) return "—";
  const fmt = (iso: string, avecMois = true) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
      day: "numeric",
      ...(avecMois ? { month: "long" as const, year: "numeric" as const } : {}),
      timeZone: "UTC",
    });
  if (!dateMax || dateMin === dateMax) return fmt(dateMin);
  const memeMois = dateMin.slice(0, 7) === dateMax.slice(0, 7);
  return memeMois ? `${fmt(dateMin, false)}–${fmt(dateMax)}` : `${fmt(dateMin)} → ${fmt(dateMax)}`;
}

export function ligneCockpit(d: DemandeClient, now: Date = new Date()): LigneCockpit {
  const t = totauxDemande(d);
  const jours = new Set(d.lignes.filter(ligneNonVide).map((l) => l.date).filter(Boolean));
  return {
    demande: d,
    completude: completudeDemande(d),
    echeance: echeanceDemande(d, now),
    urgente: estUrgente(d, now),
    action: prochaineActionDemande(d),
    fraicheur: fraicheurDemande(d, now),
    potentielHT: potentielIndicatifHT(d),
    nbEtudiants: t.nbEtudiants,
    nbSalles: t.nbSalles,
    nbJours: jours.size,
    periodeLabel: libellePeriode(t.dateMin, t.dateMax),
  };
}

// ---------------------------------------------------------------------------
// Synthèse du portefeuille
// ---------------------------------------------------------------------------

export interface SynthesePortefeuille {
  total: number;
  brouillons: number;
  aVerifier: number;
  valides: number;
  converties: number;
  urgentes: number;
  nbEtudiants: number;
  potentielHT: number;
  /** Part des demandes ayant atteint au moins « Validée SPC », en %. */
  tauxConversion: number;
  objectifConversion: number;
  /** Délai moyen création → dernière mise à jour, en jours, sur les traitées. */
  delaiMoyenJours: number | null;
  /** Demande la plus urgente (échéance la plus proche). */
  urgente: LigneCockpit | null;
  /** Demande incomplète la plus avancée : prochaine action prioritaire. */
  prochaine: LigneCockpit | null;
  /** Demande validée prête à convertir (opportunité). */
  opportunite: LigneCockpit | null;
  /** Cumuls sur les demandes validées prêtes à convertir. */
  opportuniteEtudiants: number;
  opportunitePotentielHT: number;
  opportuniteCount: number;
  /** Évolution du stock par statut sur 7 jours (%). */
  evolution: Record<"brouillons" | "aVerifier" | "valides" | "converties", number>;
}

/**
 * Évolution (%) du stock d'un statut par rapport aux demandes déjà ouvertes il
 * y a 7 jours. Approximation assumée : l'historique de statut n'est pas
 * rejoué, on compare le stock actuel aux demandes créées avant J-7.
 * 0 → stable · 100 → le stock a doublé (ou est apparu depuis J-7).
 */
export function evolutionStatut7j(
  demandes: DemandeClient[],
  statut: StatutDemande,
  now: Date = new Date(),
): number {
  const seuil = now.getTime() - 7 * MS_JOUR;
  const enStatut = demandes.filter((d) => !estClose(d) && d.statut === statut);
  const actuel = enStatut.length;
  const base = enStatut.filter((d) => Date.parse(d.createdAt) <= seuil).length;
  if (base === 0) return actuel > 0 ? 100 : 0;
  return Math.round(((actuel - base) / base) * 100);
}

export function synthesePortefeuille(
  demandes: DemandeClient[],
  now: Date = new Date(),
): SynthesePortefeuille {
  const lignes = demandes.filter((d) => !estClose(d)).map((d) => ligneCockpit(d, now));
  const parStatut = (s: StatutDemande) => lignes.filter((l) => l.demande.statut === s).length;

  const urgentes = lignes.filter((l) => l.urgente);
  const aConvertir = lignes.filter((l) => l.demande.statut === "Validée SPC");
  const aTraiter = lignes
    .filter((l) => ["Brouillon", "À vérifier", "À corriger", "Complète"].includes(l.demande.statut))
    .sort((a, b) => b.completude.pct - a.completude.pct);

  const valides = lignes.filter((l) => STATUTS_VALIDES.includes(l.demande.statut)).length;

  // Délai de traitement : uniquement les demandes sorties du brouillon.
  const traitees = demandes.filter((d) => d.statut !== "Brouillon");
  const delais = traitees
    .map((d) => (Date.parse(d.updatedAt) - Date.parse(d.createdAt)) / MS_JOUR)
    .filter((n) => Number.isFinite(n) && n >= 0);
  const delaiMoyenJours = delais.length
    ? Math.round((delais.reduce((a, b) => a + b, 0) / delais.length) * 10) / 10
    : null;

  const tri = [...urgentes].sort(
    (a, b) => (a.echeance?.jours ?? Infinity) - (b.echeance?.jours ?? Infinity),
  );

  return {
    total: lignes.length,
    brouillons: parStatut("Brouillon"),
    aVerifier: parStatut("À vérifier") + parStatut("À corriger"),
    valides: parStatut("Validée SPC"),
    converties: parStatut("Convertie en mission"),
    urgentes: urgentes.length,
    nbEtudiants: lignes.reduce((n, l) => n + l.nbEtudiants, 0),
    potentielHT: aConvertir.reduce((n, l) => n + l.potentielHT, 0),
    tauxConversion: lignes.length ? Math.round((valides / lignes.length) * 100) : 0,
    objectifConversion: OBJECTIF_CONVERSION_DEMANDES,
    delaiMoyenJours,
    urgente: tri[0] ?? null,
    prochaine: aTraiter[0] ?? null,
    opportunite: aConvertir[0] ?? null,
    opportuniteEtudiants: aConvertir.reduce((n, l) => n + l.nbEtudiants, 0),
    opportunitePotentielHT: aConvertir.reduce((n, l) => n + l.potentielHT, 0),
    opportuniteCount: aConvertir.length,
    evolution: {
      brouillons: evolutionStatut7j(demandes, "Brouillon", now),
      aVerifier: evolutionStatut7j(demandes, "À vérifier", now),
      valides: evolutionStatut7j(demandes, "Validée SPC", now),
      converties: evolutionStatut7j(demandes, "Convertie en mission", now),
    },
  };
}
