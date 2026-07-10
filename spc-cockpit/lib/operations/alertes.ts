// Priorisation des alertes du cockpit (SPC · §21). Fonctions PURES et testables.
// Priorité = sévérité de base + urgence (proximité de la date de session).
// L'humain reste maître : on trie pour faire remonter l'important, sans masquer.

export type NiveauAlerte = "critique" | "avertissement" | "information";

/** Nombre de jours entre `ref` et `dateIso` (négatif si la date est passée). */
export function joursAvant(dateIso: string | undefined | null, ref: Date): number | null {
  if (!dateIso) return null;
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - ref.getTime()) / 86_400_000);
}

/**
 * Score de priorité (plus haut = plus urgent). Sévérité de base + bonus
 * d'urgence si une échéance approche (0 j → +30, dégressif jusqu'à 10 j).
 * Une session déjà passée mais non traitée reste signalée (léger malus).
 */
export function prioriteAlerte(niveau: NiveauAlerte, joursAvantEcheance: number | null): number {
  const base = niveau === "critique" ? 100 : niveau === "avertissement" ? 60 : 30;
  if (joursAvantEcheance == null) return base;
  // L'urgence ne joue que pour une échéance à venir ; une session passée non
  // traitée reçoit un léger malus (informationnelle, plus actionnable en amont).
  const urgence = joursAvantEcheance >= 0 ? Math.max(0, 30 - joursAvantEcheance * 3) : 0;
  const retard = joursAvantEcheance < 0 ? -10 : 0;
  return base + urgence + retard;
}

/** Trie une liste d'alertes par priorité décroissante (stable). */
export function trierParPriorite<T extends { priorite: number }>(alertes: T[]): T[] {
  return [...alertes].sort((a, b) => b.priorite - a.priorite);
}
