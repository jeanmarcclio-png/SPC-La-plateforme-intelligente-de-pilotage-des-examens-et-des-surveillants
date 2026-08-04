// Logique métier PURE de la Demande client (statuts, totaux, validation,
// référence, transitions). Aucune dépendance React/DOM → testable.

import type { DemandeClient, LigneSalleDemande, StatutDemande } from "./types";

export type StatutTone = "neutral" | "attention" | "info" | "success" | "accent" | "critique";

export interface StatutConfig {
  tone: StatutTone;
  action?: string; // action principale associée
  transitions: StatutDemande[]; // statuts atteignables
}

// Couleur sémantique + action principale + transitions autorisées par statut.
export const STATUTS_DEMANDE: Record<StatutDemande, StatutConfig> = {
  "Brouillon": { tone: "neutral", action: "Compléter", transitions: ["À vérifier", "Annulée"] },
  "À vérifier": { tone: "attention", action: "Vérifier", transitions: ["Complète", "À corriger", "Annulée"] },
  "À corriger": { tone: "critique", action: "Corriger", transitions: ["À vérifier", "Complète", "Annulée"] },
  "Complète": { tone: "info", action: "Valider SPC", transitions: ["Validée SPC", "À corriger", "Annulée"] },
  "Validée SPC": { tone: "success", action: "Convertir en mission", transitions: ["Convertie en mission", "À corriger", "Archivée"] },
  "Convertie en mission": { tone: "accent", action: "Ouvrir la mission", transitions: ["Archivée"] },
  "Archivée": { tone: "neutral", transitions: [] },
  "Annulée": { tone: "critique", transitions: ["Archivée"] },
};

export const STATUTS_ACTIFS: StatutDemande[] = ["Brouillon", "À vérifier", "À corriger", "Complète", "Validée SPC"];

export function peutTransiter(de: StatutDemande, vers: StatutDemande): boolean {
  return STATUTS_DEMANDE[de].transitions.includes(vers);
}

// ── Totaux ───────────────────────────────────────────────────────────────────

export interface TotauxDemande {
  nbSalles: number;
  nbEtudiants: number;
  nbCreneaux: number;
  nbSurveillants: number;
  dateMin?: string;
  dateMax?: string;
  periodeLabel: string;
}

function ligneNonVide(l: LigneSalleDemande): boolean {
  return Boolean(l.date || l.salle || l.etudiants || l.creneau);
}

export function totauxDemande(d: DemandeClient): TotauxDemande {
  const lignes = d.lignes.filter(ligneNonVide);
  const dates = lignes.map((l) => l.date).filter((x): x is string => Boolean(x)).sort();
  const salles = new Set(lignes.map((l) => l.salle).filter(Boolean));
  const nbEtudiants = lignes.reduce((n, l) => n + (Number(l.etudiants) || 0), 0);
  const nbSurveillants = lignes.reduce((n, l) => n + (Number(l.surveillants) || 0), 0);
  const dateMin = dates[0];
  const dateMax = dates[dates.length - 1];
  let periodeLabel = "—";
  if (dateMin && dateMax) periodeLabel = dateMin === dateMax ? dateMin : `${dateMin} → ${dateMax}`;
  return {
    nbSalles: salles.size,
    nbEtudiants,
    nbCreneaux: lignes.length,
    nbSurveillants,
    dateMin,
    dateMax,
    periodeLabel,
  };
}

// ── Validation SPC ─────────────────────────────────────────────────────────

const HHMM = /^(\d{1,2}):(\d{2})$/;
function toMin(t?: string): number | null {
  if (!t) return null;
  const m = HHMM.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Liste des éléments à corriger avant validation SPC (vide = validable). */
export function validerDemande(d: DemandeClient): string[] {
  const err: string[] = [];
  if (!d.etablissement?.trim()) err.push("Établissement non renseigné");
  if (!d.demandeur?.nom?.trim()) err.push("Demandeur non renseigné");
  if (!d.demandeur?.email?.trim()) err.push("Email du demandeur manquant");
  if (!d.responsableClient?.nom?.trim()) err.push("Responsable client non renseigné");
  if (!d.responsableSpc?.trim()) err.push("Responsable SPC non renseigné");

  const lignes = d.lignes.filter(ligneNonVide);
  if (!lignes.some((l) => l.date)) err.push("Au moins une date requise");
  if (!lignes.some((l) => l.salle)) err.push("Au moins une salle requise");
  if (lignes.some((l) => !l.etudiants || l.etudiants <= 0)) err.push("Effectifs manquants sur une ou plusieurs lignes");
  if (lignes.some((l) => !l.surveillants || l.surveillants <= 0)) err.push("Nombre de surveillants manquant sur une ou plusieurs lignes");

  // Horaires cohérents (fin > début) quand renseignés.
  for (const l of lignes) {
    const de = toMin(l.debutExamen);
    const fe = toMin(l.finExamen);
    if (de != null && fe != null && fe <= de) err.push(`Horaires d'examen incohérents (${l.salle ?? "salle"})`);
    const ds = toMin(l.debutSurveillance);
    const fs = toMin(l.finSurveillance);
    if (ds != null && fs != null && fs <= ds) err.push(`Horaires de surveillance incohérents (${l.salle ?? "salle"})`);
  }

  // PMR / tiers-temps : si concernés, détails requis.
  if (d.pmrPresence && (!d.pmrNombre || d.pmrNombre <= 0)) err.push("Nombre d'étudiants PMR à préciser");
  if (d.ttPresence && (!d.ttNombre || d.ttNombre <= 0)) err.push("Nombre d'étudiants tiers-temps à préciser");

  return err;
}

// ── Référence ────────────────────────────────────────────────────────────────

/** Référence lisible DC-AAAAMMJJ-XXX (séquence sur les demandes du même jour). */
export function genererReference(dateISO: string, existantes: string[]): string {
  const compact = dateISO.slice(0, 10).replace(/-/g, "");
  const prefix = `DC-${compact}-`;
  const nums = existantes
    .filter((r) => r.startsWith(prefix))
    .map((r) => Number(r.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
