// Copilote d'affectation (SPC · §21) — suggestions explicables et contrôlées.
// Fonctions PURES (testables, sans Supabase). Le score n'est jamais une boîte
// noire : chaque suggestion porte ses raisons, et l'humain décide.
// On ne suggère jamais un surveillant Indisponible ou Annulé.

import type { Surveillant } from "./types";

export interface Suggestion {
  surveillant: Surveillant;
  score: number; // 0–100
  fiabilite: number; // 0–100 (qualité intrinsèque : note + disponibilité)
  reasons: string[]; // explications lisibles
}

const CHARGE_LOURDE_H = 120; // au-delà, charge considérée comme pleine

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Score de fiabilité d'un surveillant (0–100) : combine la note de satisfaction
 * (70 %) et sa disponibilité déclarée (30 %). Indépendant d'une session donnée.
 */
export function fiabilite(s: Surveillant): number {
  const note = clamp01((s.note ?? 0) / 5) * 70;
  const dispo = s.statut === "Disponible" ? 30 : s.statut === "Planifié" ? 18 : 0;
  return Math.round(note + dispo);
}

/**
 * Score d'adéquation d'un surveillant pour une nouvelle affectation (0–100),
 * avec ses raisons. Combine disponibilité (35), note (35) et charge (30, moins
 * chargé = mieux, pour équilibrer les heures).
 */
export function scoreAffectation(s: Surveillant): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const dispoPts = s.statut === "Disponible" ? 35 : s.statut === "Planifié" ? 18 : 0;
  reasons.push(s.statut === "Disponible" ? "Disponible" : s.statut === "Planifié" ? "Déjà planifié·e" : s.statut);

  const notePts = clamp01((s.note ?? 0) / 5) * 35;
  if (s.note > 0) reasons.push(`Note ${s.note.toFixed(1)}/5`);

  const chargePts = 30 * (1 - clamp01((s.heures ?? 0) / CHARGE_LOURDE_H));
  reasons.push(s.heures <= 50 ? "Charge faible" : s.heures <= 90 ? "Charge modérée" : "Charge élevée");

  const role = (s.role ?? "").toLowerCase();
  if (role.includes("coordinat")) reasons.push("Profil coordination");
  else if (role.includes("pmr")) reasons.push("Profil PMR / tiers-temps");
  else if (role.includes("volant")) reasons.push("Renfort mobile");

  if (s.zone) reasons.push(`Zone ${s.zone}`);

  return { score: Math.round(dispoPts + notePts + chargePts), reasons };
}

/**
 * Classe les surveillants mobilisables pour une session, du plus adapté au
 * moins adapté. Exclut les déjà-affectés (`exclureIds`), les statuts
 * Indisponible / Annulé, et — CONTRAINTE DURE — les surveillants déclarés
 * indisponibles pour la date/créneau visé (`indisponibleIds`, calculé depuis la
 * table `disponibilites` du portail). Un indisponible n'est JAMAIS suggéré.
 */
export function suggererSurveillants(
  surveillants: Surveillant[],
  opts: { exclureIds?: number[]; indisponibleIds?: number[]; limite?: number } = {}
): Suggestion[] {
  const exclus = new Set(opts.exclureIds ?? []);
  const indispo = new Set(opts.indisponibleIds ?? []);
  const suggestions = surveillants
    .filter(
      (s) =>
        !exclus.has(s.id) &&
        !indispo.has(s.id) &&
        s.statut !== "Indisponible" &&
        s.statut !== "Annulé"
    )
    .map((s) => {
      const { score, reasons } = scoreAffectation(s);
      return { surveillant: s, score, fiabilite: fiabilite(s), reasons };
    })
    .sort((a, b) => b.score - a.score || b.fiabilite - a.fiabilite);
  return typeof opts.limite === "number" ? suggestions.slice(0, opts.limite) : suggestions;
}
