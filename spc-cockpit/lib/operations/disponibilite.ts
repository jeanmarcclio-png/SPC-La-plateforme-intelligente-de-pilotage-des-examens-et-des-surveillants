// Charge & disponibilité mensuelle des surveillants (SPC · E2). Fonctions PURES
// et testables. On ne dispose pas d'un modèle de disponibilité déclarée par
// date : on DÉRIVE donc l'état de chaque jour de la charge réellement planifiée
// (affectations rattachées à la date de leur session). Un jour sans affectation
// est « libre » (aucune charge connue), un jour chargé est « affecté ».

import { parseTimeToMinutes } from "./engine";
import type { Affectation } from "./types";

export type EtatJour = "charge" | "demi" | "libre" | "indispo";

/** En dessous de ce total d'heures planifiées sur la journée → demi-journée. */
export const SEUIL_DEMI_H = 5;

export interface CelluleCharge {
  date: string; // ISO yyyy-mm-dd
  heures: number;
  sessions: number;
  etat: EtatJour;
}

export interface LigneCharge {
  surveillantId: number;
  nom: string;
  role: string;
  totalHeures: number;
  totalSessions: number;
  jours: CelluleCharge[]; // aligné sur `jours` fourni
}

function slotHeures(debut: string, fin: string): number {
  try {
    const m = parseTimeToMinutes(fin) - parseTimeToMinutes(debut);
    return m > 0 ? m / 60 : 0;
  } catch {
    return 0;
  }
}

/** Heures planifiées d'une affectation (matin + après-midi, multi-créneaux). */
export function heuresAffectation(a: Affectation): number {
  const matin = a.matinCreneaux?.length ? a.matinCreneaux : a.matin ? [{ debut: a.matinDebut ?? "", fin: a.matinFin ?? "" }] : [];
  const apm = a.apmCreneaux?.length ? a.apmCreneaux : a.apm ? [{ debut: a.apmDebut ?? "", fin: a.apmFin ?? "" }] : [];
  return [...matin, ...apm].reduce((n, s) => n + (s.debut && s.fin ? slotHeures(s.debut, s.fin) : 0), 0);
}

/** État d'un jour selon la charge planifiée et la disponibilité déclarée. */
export function etatJour(heures: number, indisponible: boolean): EtatJour {
  if (indisponible) return "indispo";
  if (heures <= 0) return "libre";
  if (heures < SEUIL_DEMI_H) return "demi";
  return "charge";
}

/** Liste des jours ISO d'un mois (month0 : 0 = janvier). */
export function moisJours(year: number, month0: number): string[] {
  const jours: string[] = [];
  const d = new Date(Date.UTC(year, month0, 1));
  while (d.getUTCMonth() === month0) {
    jours.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return jours;
}

/** Un jour ISO tombe-t-il un week-end ? */
export function estWeekend(iso: string): boolean {
  const j = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return j === 0 || j === 6;
}

const INDISPO_STATUTS = new Set(["Indisponible", "Annulé"]);

/**
 * Matrice charge par surveillant sur un ensemble de jours. Chaque cellule agrège
 * les heures planifiées des affectations dont la session tombe ce jour-là.
 */
export function chargeMensuelle(input: {
  surveillants: { id: number; nom: string; role: string; statut: string }[];
  affectations: Affectation[];
  missions: { id: number; dateMission?: string | null }[];
  jours: string[];
}): LigneCharge[] {
  const dateByMission = new Map(input.missions.map((m) => [m.id, m.dateMission ?? null]));
  const joursSet = new Set(input.jours);

  return input.surveillants.map((s) => {
    const heuresParJour = new Map<string, number>();
    const sessionsParJour = new Map<string, number>();
    for (const a of input.affectations) {
      if (a.surveillantId !== s.id) continue;
      const date = dateByMission.get(a.missionId);
      if (!date || !joursSet.has(date)) continue;
      heuresParJour.set(date, (heuresParJour.get(date) ?? 0) + heuresAffectation(a));
      sessionsParJour.set(date, (sessionsParJour.get(date) ?? 0) + 1);
    }
    const indispo = INDISPO_STATUTS.has(s.statut);
    let totalHeures = 0;
    let totalSessions = 0;
    const jours = input.jours.map((date): CelluleCharge => {
      const heures = heuresParJour.get(date) ?? 0;
      const sessions = sessionsParJour.get(date) ?? 0;
      totalHeures += heures;
      totalSessions += sessions;
      return { date, heures, sessions, etat: etatJour(heures, indispo && sessions === 0) };
    });
    return { surveillantId: s.id, nom: s.nom, role: s.role, totalHeures, totalSessions, jours };
  });
}
