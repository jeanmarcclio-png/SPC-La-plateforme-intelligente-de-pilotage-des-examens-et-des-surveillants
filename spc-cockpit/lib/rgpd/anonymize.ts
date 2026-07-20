// Règles d'anonymisation d'un surveillant (droit à l'effacement + purge auto).
// Fonction pure = testable et source unique de vérité, alignée sur la migration
// SQL `spc_purge_rgpd()` (supabase/migrations/25_rgpd-purges.sql).
//
// PRINCIPE RGPD : on efface les données IDENTIFIANTES (nom, prénom, email,
// téléphone, zone, disponibilités) mais on PRÉSERVE les agrégats nécessaires aux
// obligations légales de paie (heures / taux_horaire / nb_examens, conservés 5 ans).

/** Champs mis à jour pour anonymiser un surveillant (identité effacée). */
export function anonymizedSurveillantFields(surveillantId: number): Record<string, unknown> {
  return {
    nom: "Compte supprimé",
    prenom: null,
    email: `supprime-${surveillantId}@anonymise.invalid`,
    telephone: null,
    zone: null,
    dispo_matin: null,
    dispo_apm: null,
    heures_matin: null, // plage horaire (texte identifiant un créneau) — effacée
    heures_aprem: null,
    user_id: null,
  };
}

// Colonnes d'agrégats de paie qui NE DOIVENT JAMAIS être touchées par l'anonymisation.
export const PAYROLL_AGGREGATE_COLUMNS = ["heures", "taux_horaire", "nb_examens"] as const;
