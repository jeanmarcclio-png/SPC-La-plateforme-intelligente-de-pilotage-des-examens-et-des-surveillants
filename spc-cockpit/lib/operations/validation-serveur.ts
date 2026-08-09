// VALIDATION CÔTÉ SERVEUR — corrige BUG-022 de l'audit QA forensic V2.
//
// Les formulaires portaient `min="1"` / `min="0"`, ce qui bloque bien la saisie
// dans le navigateur (vérifié : 0 requête envoyée avec −5). Mais les Server
// Actions sont des points d'entrée RÉSEAU : un appel direct contournait toute
// vérification, et `parseForm` appliquait `Number(x) || repli`, transformant
// silencieusement 0 en 1 et une saisie non numérique en 0 €.
//
// Fonctions PURES : chaque lecture de champ dit ce qu'elle refuse et pourquoi.

export type Validation<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const NOMBRE_RE = /^-?\d+(?:[.,]\d+)?$/;

function enNombre(brut: FormDataEntryValue | null): number | null {
  if (brut === null) return null;
  const texte = String(brut).trim().replace(",", ".");
  if (texte === "" || !NOMBRE_RE.test(texte)) return null;
  const n = Number(texte);
  return Number.isFinite(n) ? n : null;
}

/**
 * Entier ≥ min. Une saisie vide retombe sur `defaut` ; une saisie NON NUMÉRIQUE
 * est refusée au lieu d'être silencieusement convertie.
 */
export function entier(
  fd: FormData,
  champ: string,
  { min, max, defaut, libelle }: { min: number; max?: number; defaut?: number; libelle: string },
): Validation<number> {
  const brut = fd.get(champ);
  if (brut === null || String(brut).trim() === "") {
    if (defaut === undefined) return { ok: false, erreur: `${libelle} est obligatoire` };
    return { ok: true, valeur: defaut };
  }
  const n = enNombre(brut);
  if (n === null) return { ok: false, erreur: `${libelle} doit être un nombre` };
  if (!Number.isInteger(n)) return { ok: false, erreur: `${libelle} doit être un nombre entier` };
  if (n < min) return { ok: false, erreur: `${libelle} doit être supérieur ou égal à ${min}` };
  if (max !== undefined && n > max) return { ok: false, erreur: `${libelle} ne peut pas dépasser ${max}` };
  return { ok: true, valeur: n };
}

/** Montant décimal ≥ min (deux décimales max côté métier). */
export function montant(
  fd: FormData,
  champ: string,
  { min = 0, defaut, libelle }: { min?: number; defaut?: number; libelle: string },
): Validation<number> {
  const brut = fd.get(champ);
  if (brut === null || String(brut).trim() === "") {
    if (defaut === undefined) return { ok: false, erreur: `${libelle} est obligatoire` };
    return { ok: true, valeur: defaut };
  }
  const n = enNombre(brut);
  if (n === null) return { ok: false, erreur: `${libelle} doit être un montant valide` };
  if (n < min) return { ok: false, erreur: `${libelle} doit être supérieur ou égal à ${min}` };
  return { ok: true, valeur: Math.round(n * 100) / 100 };
}

/** Texte obligatoire, borné en longueur. */
export function texteRequis(
  fd: FormData,
  champ: string,
  { libelle, maxLongueur = 200 }: { libelle: string; maxLongueur?: number },
): Validation<string> {
  const valeur = (fd.get(champ) as string | null)?.trim() ?? "";
  if (!valeur) return { ok: false, erreur: `${libelle} est obligatoire` };
  if (valeur.length > maxLongueur) {
    return { ok: false, erreur: `${libelle} ne peut pas dépasser ${maxLongueur} caractères` };
  }
  return { ok: true, valeur };
}

/**
 * Agrège plusieurs validations : retourne la PREMIÈRE erreur rencontrée, afin
 * que l'utilisateur corrige un champ à la fois avec un message précis.
 */
export function premiereErreurDe(...validations: Validation<unknown>[]): string | null {
  for (const v of validations) if (!v.ok) return v.erreur;
  return null;
}

// ---------------------------------------------------------------------------
// Traduction des erreurs PostgreSQL — corrige BUG-024
// ---------------------------------------------------------------------------

/**
 * Transforme un message PostgreSQL brut en message métier répondant aux trois
 * questions attendues (que s'est-il passé / pourquoi / que faire). Le message
 * technique reste journalisé côté serveur, il n'est plus jeté à l'écran.
 */
export function messageMetier(operation: string, technique: string): string {
  const t = technique.toLowerCase();
  if (t.includes("duplicate key") || t.includes("unique constraint") || t.includes("23505")) {
    return `${operation} impossible : un enregistrement portant la même référence existe déjà. Modifiez la référence ou ouvrez la fiche existante.`;
  }
  if (t.includes("foreign key") || t.includes("violates foreign key") || t.includes("23503")) {
    return `${operation} impossible : cet élément est encore utilisé ailleurs (session, planning ou facture). Détachez-le d'abord, ou désactivez-le plutôt que de le supprimer.`;
  }
  if (t.includes("row-level security") || t.includes("permission denied") || t.includes("42501")) {
    return `${operation} refusée : vos droits ne permettent pas cette action sur l'organisation active. Contactez un administrateur.`;
  }
  if (t.includes("not-null") || t.includes("23502")) {
    return `${operation} impossible : un champ obligatoire est vide. Complétez le formulaire puis réessayez.`;
  }
  if (t.includes("fetch failed") || t.includes("network") || t.includes("timeout")) {
    return `${operation} impossible : la base de données est injoignable. Réessayez dans un instant ; si le problème persiste, signalez-le à l'administrateur.`;
  }
  return `${operation} impossible. Réessayez ; si le problème persiste, signalez-le à l'administrateur en précisant l'heure de la tentative.`;
}
