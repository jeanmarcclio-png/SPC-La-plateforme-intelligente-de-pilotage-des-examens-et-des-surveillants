/**
 * Normalisation des numéros de téléphone — clé de comparaison unique.
 *
 * POURQUOI CE MODULE EXISTE
 * -------------------------
 * La recette Supabase a établi (sonde D-4b) qu'un même numéro pouvait entrer
 * DEUX FOIS dans le référentiel :
 *
 *   « +33 6 12 00 00 01 »  → chiffres « 33612000001 »
 *   « 06 12 00 00 01 »     → chiffres « 0612000001 »
 *
 * Retirer les caractères non numériques ne suffit pas : la forme internationale
 * et la forme nationale du MÊME numéro produisent deux clés différentes. Ni
 * l'index `surveillants_org_tel_uniq`, ni `chercherDoublon()` ne pouvaient les
 * rapprocher.
 *
 * Conséquence métier : deux fiches pour une même personne. Elle peut être
 * affectée deux fois au même créneau, comptée deux fois dans la couverture,
 * payée deux fois — et la purge RGPD n'en anonymiserait qu'une.
 *
 * Ce module est le PENDANT EXACT de la fonction SQL `spc_tel_cle()`
 * (migration 33). Les deux doivent rester alignés : si l'application est plus
 * stricte que la base, elle refuse des lignes que la base accepterait ; si elle
 * est plus permissive, la base rejette des saisies sans message métier. C'est
 * précisément l'écart que la recette a relevé sur les salles (sonde D-2b).
 *
 * INDICATIF RETENU : +33 (France). C'est une décision métier, pas technique.
 * Elle est écrite ici et dans `spc_tel_cle()`, aux deux mêmes endroits. La
 * changer impose de reconstruire l'index d'unicité — voir la migration 33.
 */

/** Indicatif pays traité comme équivalent au préfixe national « 0 ». */
export const INDICATIF_NATIONAL = "33";

/**
 * Clé de comparaison d'un numéro de téléphone.
 *
 * Renvoie `""` quand le numéro est vide ou ne contient aucun chiffre — cette
 * valeur ne doit JAMAIS être considérée comme un doublon : deux fiches sans
 * téléphone ne sont pas la même personne.
 */
export function cleTelephone(valeur: string | null | undefined): string {
  const chiffres = (valeur ?? "").replace(/\D/g, "");
  if (!chiffres) return "";

  // Préfixe international explicite : « 0033… » → « 0… »
  if (chiffres.startsWith("00" + INDICATIF_NATIONAL)) {
    return "0" + chiffres.slice(2 + INDICATIF_NATIONAL.length);
  }

  // « 33 » suivi des 9 chiffres d'un numéro français → « 0 » + ces 9 chiffres.
  // La contrainte de longueur évite de mutiler un numéro étranger qui
  // commencerait par 33 sans être français.
  if (
    chiffres.startsWith(INDICATIF_NATIONAL) &&
    chiffres.length === INDICATIF_NATIONAL.length + 9
  ) {
    return "0" + chiffres.slice(INDICATIF_NATIONAL.length);
  }

  return chiffres;
}

/** Deux numéros désignent-ils la même ligne ? `false` si l'un des deux est vide. */
export function memeTelephone(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ca = cleTelephone(a);
  const cb = cleTelephone(b);
  return ca !== "" && ca === cb;
}
