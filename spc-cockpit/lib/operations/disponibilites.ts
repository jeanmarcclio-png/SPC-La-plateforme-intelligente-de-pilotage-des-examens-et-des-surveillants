// Disponibilités & KPIs de l'équipe surveillante (page « Surveillants »).
//
// Toute la logique métier de la page vit ici : fonctions PURES, déterministes
// et testables (aucune dépendance React). Deux responsabilités :
//   1. KPIs de la mission active (couverture, postes restants, heures, alertes) ;
//   2. grille de charge planifiée par jour/surveillant + agrégat « par jour ».
//
// La grille est une PROJECTION de charge dérivée de champs réels du surveillant
// (statut, heures, id) : elle est déterministe (même entrée → même sortie) et
// ancrée sur les affectations réelles le jour de la mission. Elle ne fabrique
// aucune donnée nominative — elle visualise une charge prévisionnelle.

import type { Affectation, Surveillant } from "./types";
import { analyseCouverture } from "./couverture";

// ─────────────────────────────────────────────────────────────────────────────
// Heures d'une affectation (somme des créneaux matin + après-midi)
// ─────────────────────────────────────────────────────────────────────────────

function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Durée d'un créneau « HH:MM »–« HH:MM » en heures (0 si invalide/négatif). */
export function dureeCreneauHeures(debut?: string | null, fin?: string | null): number {
  const a = toMinutes(debut);
  const b = toMinutes(fin);
  if (a == null || b == null || b <= a) return 0;
  return (b - a) / 60;
}

/** Total d'heures d'une affectation, tous créneaux confondus. */
export function heuresAffectation(a: Affectation): number {
  const matin = a.matinCreneaux?.length
    ? a.matinCreneaux
    : a.matin
      ? [{ debut: a.matinDebut, fin: a.matinFin }]
      : [];
  const apm = a.apmCreneaux?.length
    ? a.apmCreneaux
    : a.apm
      ? [{ debut: a.apmDebut, fin: a.apmFin }]
      : [];
  let h = 0;
  for (const c of matin) h += dureeCreneauHeures(c.debut, c.fin);
  for (const c of apm) h += dureeCreneauHeures(c.debut, c.fin);
  return Math.round(h * 100) / 100;
}

/** Une affectation « active » = au moins un créneau posé (matin ou après-midi). */
export function aUnCreneau(a: Affectation): boolean {
  return Boolean(a.matin || a.apm || a.matinCreneaux?.length || a.apmCreneaux?.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// KPIs de la mission active (bandeau supérieur)
// ─────────────────────────────────────────────────────────────────────────────

export interface MissionKpis {
  requis: number; // postes à couvrir
  affectes: number; // surveillants avec au moins un créneau
  couverturePct: number; // 0..100
  postesRestants: number; // requis − affectés (jamais négatif)
  heuresPlanifiees: number; // Σ heures des affectations posées (arrondi)
  nbCreneaux: number; // nombre de demi-journées posées
  postesCritiques: number; // postes non couverts (= postesRestants)
  risqueFatigue: number; // surveillants ≥ seuil de surcharge
  fatigueNoms: string[]; // noms concernés (aide-décision)
}

export function computeMissionKpis(opts: {
  missionRequis: number;
  affectations: Affectation[];
  surveillants: Surveillant[];
  seuilSurcharge: number;
}): MissionKpis {
  const actives = opts.affectations.filter(aUnCreneau);
  const affectes = new Set(actives.map((a) => a.surveillantId)).size;
  // Le besoin ne peut pas être inférieur à ce qui est déjà affecté.
  const requis = Math.max(Math.round(opts.missionRequis || 0), affectes);
  const cov = analyseCouverture({ requis, affectes });
  const heuresPlanifiees = Math.round(actives.reduce((n, a) => n + heuresAffectation(a), 0));
  const surcharge = opts.surveillants.filter((s) => s.heures >= opts.seuilSurcharge);

  return {
    requis,
    affectes,
    couverturePct: Math.round(cov.tauxCouverture * 100),
    postesRestants: cov.manque,
    heuresPlanifiees,
    nbCreneaux: actives.length,
    postesCritiques: cov.manque,
    risqueFatigue: surcharge.length,
    fatigueNoms: surcharge.map((s) => s.nom),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Grille de charge planifiée par jour et par surveillant
// ─────────────────────────────────────────────────────────────────────────────

export type TypeCellule = "non-ouvre" | "libre" | "demi" | "affecte" | "indispo";

export interface CelluleDispo {
  jour: number; // 1..31
  weekend: boolean;
  type: TypeCellule;
  heures: number; // charge de la cellule (0 si vide/indispo)
  aujourdhui?: boolean;
}

export interface LigneDispo {
  surveillantId: number;
  nom: string;
  cells: CelluleDispo[];
  totalHeures: number;
}

export interface GrilleDispo {
  annee: number;
  mois: number; // 0..11
  jours: { jour: number; dow: number; weekend: boolean; aujourdhui: boolean }[];
  lignes: LigneDispo[];
}

// Interprète un champ de disponibilité texte libre (« Oui », « Non »,
// « 08:00–13:00 », «  »). Retourne true = dispo · false = indispo · null = inconnu.
function dispoValeur(txt?: string): boolean | null {
  if (txt == null || txt.trim() === "") return null;
  return /\b(non|indispo|indisponible|absent|no|aucune?)\b/i.test(txt) ? false : true;
}

// Cellule « de base » d'un jour ouvré ordinaire (sans affectation réelle) :
// dérivée UNIQUEMENT du statut et des disponibilités déclarées. Aucune heure
// inventée — la charge chiffrée ne provient que des affectations réelles.
function celluleBase(s: Surveillant): TypeCellule {
  if (s.statut === "Annulé" || s.statut === "Indisponible") return "indispo";
  const demi = [dispoValeur(s.dispoMatin), dispoValeur(s.dispoApm)];
  const off = demi.filter((v) => v === false).length;
  if (off === 2) return "indispo"; // matin ET après-midi indisponibles
  if (off === 1) return "demi"; // une seule demi-journée indisponible
  return "libre"; // disponible (ou disponibilité non renseignée)
}

/**
 * Construit la grille mensuelle à partir des DONNÉES RÉELLES :
 *  - les affectations (toutes missions) tombant dans le mois peignent le jour
 *    correspondant en « affecté » (bleu) avec les heures réelles des créneaux ;
 *  - les autres jours ouvrés reflètent la disponibilité déclarée (statut +
 *    dispoMatin/dispoApm) sans charge chiffrée inventée.
 * `missionDates` mappe missionId → date ISO (yyyy-mm-dd) de la mission.
 */
export function buildGrilleDispo(opts: {
  surveillants: Surveillant[];
  affectations: Affectation[];
  missionDates?: Record<number, string | undefined>;
  annee: number;
  mois: number; // 0..11
  aujourdhuiISO?: string;
}): GrilleDispo {
  const { surveillants, affectations, missionDates = {}, annee, mois } = opts;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  const today = opts.aujourdhuiISO ? parseJour(opts.aujourdhuiISO, annee, mois) : null;
  const jours = Array.from({ length: nbJours }, (_, i) => {
    const jour = i + 1;
    const dow = new Date(annee, mois, jour).getDay(); // 0 = dimanche
    return { jour, dow, weekend: dow === 0 || dow === 6, aujourdhui: today === jour };
  });

  // Heures réelles par (surveillant, jour) issues des affectations du mois.
  // Clé « surveillantId:jour » → heures cumulées.
  const heuresParSurvJour = new Map<string, number>();
  for (const a of affectations) {
    if (!aUnCreneau(a)) continue;
    const jour = parseJour(missionDates[a.missionId] ?? "", annee, mois);
    if (jour == null) continue;
    const key = `${a.surveillantId}:${jour}`;
    heuresParSurvJour.set(key, (heuresParSurvJour.get(key) ?? 0) + heuresAffectation(a));
  }

  const lignes: LigneDispo[] = surveillants.map((s) => {
    const base = celluleBase(s);
    let total = 0;
    const cells: CelluleDispo[] = jours.map((j) => {
      if (j.weekend) return { jour: j.jour, weekend: true, type: "non-ouvre" as const, heures: 0, aujourdhui: j.aujourdhui };
      const heuresReelles = heuresParSurvJour.get(`${s.id}:${j.jour}`);
      let type: TypeCellule;
      let heures: number;
      if (heuresReelles != null && heuresReelles > 0) {
        type = "affecte";
        heures = Math.round(heuresReelles);
      } else {
        type = base;
        heures = 0;
      }
      total += heures;
      return { jour: j.jour, weekend: false, type, heures, aujourdhui: j.aujourdhui };
    });
    return { surveillantId: s.id, nom: s.nom, cells, totalHeures: total };
  });

  return { annee, mois, jours, lignes };
}

// « yyyy-mm-dd » → numéro de jour s'il tombe dans (annee, mois), sinon null.
function parseJour(iso: string, annee: number, mois: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (y !== annee || mo !== mois) return null;
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agrégat « disponibilité par jour » (graphe latéral)
// ─────────────────────────────────────────────────────────────────────────────

export interface JourBesoin {
  jour: number;
  weekend: boolean;
  disponibles: number; // surveillants mobilisables ce jour (libre + demi + affecté)
  affectes: number; // surveillants réellement affectés (bleu)
  heures: number; // Σ heures réelles du jour
}

export function besoinsParJour(grille: GrilleDispo): JourBesoin[] {
  return grille.jours.map((j, idx) => {
    let disponibles = 0;
    let affectes = 0;
    let heures = 0;
    for (const ligne of grille.lignes) {
      const c = ligne.cells[idx];
      if (!c) continue;
      if (c.type === "libre" || c.type === "demi" || c.type === "affecte") disponibles += 1;
      if (c.type === "affecte") affectes += 1;
      heures += c.heures;
    }
    return { jour: j.jour, weekend: j.weekend, disponibles, affectes, heures };
  });
}

/** Couverture moyenne (affectés / disponibles) sur les jours ouvrés, en %. */
export function couvertureMoyenne(jours: JourBesoin[]): number {
  const ouvres = jours.filter((j) => !j.weekend && j.disponibles > 0);
  if (!ouvres.length) return 0;
  const somme = ouvres.reduce((n, j) => n + j.affectes / j.disponibles, 0);
  return Math.round((somme / ouvres.length) * 100);
}
