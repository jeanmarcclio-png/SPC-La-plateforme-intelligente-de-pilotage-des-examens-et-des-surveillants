// Helpers purs du module « Demandes client » — importables côté client comme
// serveur (aucune dépendance Supabase / server-only ici).

import type { DemandeClient, StatutDemande } from "./types";

export const STATUTS_DEMANDE: StatutDemande[] = [
  "Brouillon",
  "À vérifier",
  "Complète",
  "À corriger",
  "Validée SPC",
  "Convertie en mission",
  "Archivée",
  "Annulée",
];

/** Métadonnées d'affichage par statut : libellé, couleurs de pastille. */
export const STATUT_META: Record<StatutDemande, { pill: string; dot: string }> = {
  "Brouillon":            { pill: "bg-gray-100 text-gray-600",       dot: "#a0aec0" },
  "À vérifier":           { pill: "bg-amber-50 text-amber-700",      dot: "#f6ad55" },
  "Complète":             { pill: "bg-blue-50 text-blue-700",        dot: "#4a90d9" },
  "À corriger":           { pill: "bg-red-50 text-red-600",          dot: "#fc8181" },
  "Validée SPC":          { pill: "bg-teal-50 text-[var(--color-primary)]", dot: "#0f766e" },
  "Convertie en mission": { pill: "bg-indigo-50 text-indigo-700",    dot: "#667eea" },
  "Archivée":             { pill: "bg-gray-100 text-gray-400",       dot: "#cbd5e0" },
  "Annulée":              { pill: "bg-gray-100 text-gray-400 line-through", dot: "#cbd5e0" },
};

/** Suggestions de besoins particuliers (spec §8.3). */
export const BESOINS_SUGGESTIONS = [
  "Placement particulier", "Salle isolée", "Matériel spécifique", "Accès bâtiment",
  "Consignes particulières", "Présence coordinateur", "Contrôle d'identité",
  "Émargement", "Interdiction téléphone", "Documents à distribuer", "Collecte copies",
];

/** Référence lisible générée à la création : DC-AAAA-XXXX. */
export function generateDemandeReference(now: Date = new Date()): string {
  const y = now.getFullYear();
  const suffix = (now.getTime() % 10000).toString().padStart(4, "0");
  return `DC-${y}-${suffix}`;
}

function contactRenseigne(c: { nom?: string; email?: string }): boolean {
  return Boolean(c.nom?.trim() && c.email?.trim());
}

/**
 * Contrôles bloquants avant passage en « Validée SPC » (spec §12).
 * Retourne la liste des éléments à corriger (vide = validable).
 */
export function validateDemande(d: DemandeClient): string[] {
  const errors: string[] = [];
  if (!d.etablissement?.trim()) errors.push("Établissement non renseigné");
  if (!contactRenseigne(d.demandeur)) errors.push("Demandeur incomplet (nom + email requis)");
  if (!contactRenseigne(d.responsableClient)) errors.push("Responsable client incomplet (nom + email requis)");
  if (!d.responsableSpc?.nom?.trim()) errors.push("Responsable SPC non renseigné");

  const salles = d.salles.filter((s) => s.salle?.trim());
  if (salles.length === 0) errors.push("Aucune salle renseignée");
  if (!salles.some((s) => s.dateExamen)) errors.push("Aucune date d'examen renseignée");

  for (const s of salles) {
    if (s.debutSurveillance && s.finSurveillance && s.debutSurveillance >= s.finSurveillance) {
      errors.push(`Salle ${s.salle} : horaire de surveillance incohérent`);
    }
    if (s.etudiants <= 0) errors.push(`Salle ${s.salle} : effectif étudiants manquant`);
    if (s.surveillants <= 0) errors.push(`Salle ${s.salle} : nombre de surveillants manquant`);
  }

  if (d.pmrPresent && d.pmrNombre <= 0) errors.push("PMR signalé mais effectif non renseigné");
  if (d.tiersTempsPresent && d.tiersTempsNombre <= 0) errors.push("Tiers-temps signalé mais effectif non renseigné");

  return errors;
}
