// Cycle de vie des missions (SPC) — statuts, ordre et transitions contrôlées.
// La colonne DB `statut` est en texte libre : enrichir la liste ne nécessite
// aucune migration, et les valeurs existantes restent valides.
// « Validée » est conservée : c'est l'état « planning verrouillé » (validation
// de session), inséré entre Planifiée et En cours.

import type { StatutMission } from "./types";

/** Ordre chronologique du cycle de vie (Annulée est transverse/terminale). */
export const MISSION_STATUTS: StatutMission[] = [
  "Brouillon",
  "À chiffrer",
  "Devis envoyé",
  "Acceptée",
  "Planifiée",
  "Validée",
  "En cours",
  "Terminée",
  "Facturée",
  "Archivée",
  "Annulée",
];

/** Transitions autorisées depuis chaque statut (contrôle métier). */
const TRANSITIONS: Record<StatutMission, StatutMission[]> = {
  "Brouillon": ["À chiffrer", "Annulée"],
  "À chiffrer": ["Devis envoyé", "Annulée"],
  "Devis envoyé": ["Acceptée", "Annulée"],
  "Acceptée": ["Planifiée", "Annulée"],
  "Planifiée": ["Validée", "En cours", "Annulée"],
  "Validée": ["En cours", "Planifiée", "Annulée"], // retour possible pour ré-édition
  "En cours": ["Terminée", "Annulée"],
  "Terminée": ["Facturée", "Archivée"],
  "Facturée": ["Archivée"],
  "Archivée": [],
  "Annulée": [],
};

/** Statuts vers lesquels on peut basculer depuis `current`. */
export function allowedTransitions(current: StatutMission): StatutMission[] {
  return TRANSITIONS[current] ?? [];
}

/** Options d'un sélecteur de statut : le statut courant + ses transitions valides. */
export function statutOptions(current: StatutMission): StatutMission[] {
  return [current, ...allowedTransitions(current)];
}

/** Statuts « opérationnels » (mission engagée, planifiable). */
export const STATUTS_PLANIFIABLES: StatutMission[] = ["Acceptée", "Planifiée", "Validée", "En cours"];
export const STATUTS_TERMINES: StatutMission[] = ["Terminée", "Facturée", "Archivée"];

export function estPlanifiable(s: StatutMission): boolean {
  return STATUTS_PLANIFIABLES.includes(s);
}
