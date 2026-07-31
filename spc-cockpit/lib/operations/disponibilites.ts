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

// Hash 32 bits déterministe → réel dans [0,1). Sert de graine stable de
// projection : aucun aléa, aucun Date.now(), reproductible en test.
function hash01(a: number, b: number): number {
  let h = (Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 1, 40503)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function celluleProjetee(s: Surveillant, jour: number): { type: TypeCellule; heures: number } {
  if (s.statut === "Annulé") return { type: "indispo", heures: 0 };
  const r = hash01(s.id, jour);
  if (s.statut === "Indisponible") {
    return r < 0.75 ? { type: "indispo", heures: 0 } : { type: "libre", heures: 0 };
  }
  // Disponible / Planifié : majorité de journées pleines, quelques demi-journées,
  // rares indisponibilités.
  if (r < 0.1) return { type: "indispo", heures: 0 };
  if (r < 0.28) return { type: "demi", heures: 4 };
  const full = hash01(s.id, jour + 100);
  const heures = full < 0.6 ? 7 : 8;
  // « Planifié » = déjà engagé sur des sessions → affecté (bleu) ; « Disponible »
  // = capacité libre (vert).
  return { type: s.statut === "Planifié" ? "affecte" : "libre", heures };
}

/**
 * Construit la grille mensuelle. Les affectations réelles tombant le jour de la
 * mission (missionJourISO) écrasent la projection : bleu « affecté » + heures
 * réelles calculées depuis les créneaux.
 */
export function buildGrilleDispo(opts: {
  surveillants: Surveillant[];
  affectations: Affectation[];
  annee: number;
  mois: number; // 0..11
  missionJourISO?: string;
  aujourdhuiISO?: string;
}): GrilleDispo {
  const { surveillants, affectations, annee, mois } = opts;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  const today = opts.aujourdhuiISO ? parseJour(opts.aujourdhuiISO, annee, mois) : null;
  const jours = Array.from({ length: nbJours }, (_, i) => {
    const jour = i + 1;
    const dow = new Date(annee, mois, jour).getDay(); // 0 = dimanche
    return { jour, dow, weekend: dow === 0 || dow === 6, aujourdhui: today === jour };
  });

  // Heures réelles par surveillant le jour de la mission (override).
  const missionJour = opts.missionJourISO ? parseJour(opts.missionJourISO, annee, mois) : null;
  const heuresReellesJourMission = new Map<number, number>();
  if (missionJour != null) {
    for (const a of affectations) {
      if (!aUnCreneau(a)) continue;
      heuresReellesJourMission.set(
        a.surveillantId,
        (heuresReellesJourMission.get(a.surveillantId) ?? 0) + heuresAffectation(a),
      );
    }
  }

  const lignes: LigneDispo[] = surveillants.map((s) => {
    let total = 0;
    const cells: CelluleDispo[] = jours.map((j) => {
      if (j.weekend) return { jour: j.jour, weekend: true, type: "non-ouvre" as const, heures: 0, aujourdhui: j.aujourdhui };
      let type: TypeCellule;
      let heures: number;
      if (missionJour === j.jour && heuresReellesJourMission.has(s.id)) {
        type = "affecte";
        heures = Math.round(heuresReellesJourMission.get(s.id)!);
      } else {
        const p = celluleProjetee(s, j.jour);
        type = p.type;
        heures = p.heures;
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
// Agrégat « présence planifiée par jour » (graphe latéral)
// ─────────────────────────────────────────────────────────────────────────────

export interface JourBesoin {
  jour: number;
  weekend: boolean;
  planifies: number; // surveillants avec une charge > 0
  confirmes: number; // surveillants « affecté » (bleu)
  heures: number; // Σ heures planifiées du jour
}

export function besoinsParJour(grille: GrilleDispo): JourBesoin[] {
  return grille.jours.map((j, idx) => {
    let planifies = 0;
    let confirmes = 0;
    let heures = 0;
    for (const ligne of grille.lignes) {
      const c = ligne.cells[idx];
      if (!c) continue;
      if (c.heures > 0) planifies += 1;
      if (c.type === "affecte") confirmes += 1;
      heures += c.heures;
    }
    return { jour: j.jour, weekend: j.weekend, planifies, confirmes, heures };
  });
}

/** Couverture moyenne (confirmés / planifiés) sur les jours ouvrés, en %. */
export function couvertureMoyenne(jours: JourBesoin[]): number {
  const ouvres = jours.filter((j) => !j.weekend && j.planifies > 0);
  if (!ouvres.length) return 0;
  const somme = ouvres.reduce((n, j) => n + j.confirmes / j.planifies, 0);
  return Math.round((somme / ouvres.length) * 100);
}
