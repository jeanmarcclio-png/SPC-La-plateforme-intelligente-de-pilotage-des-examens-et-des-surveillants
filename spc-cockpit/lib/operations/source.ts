// ORIGINE DES DONNÉES — corrige BUG-001 / BUG-002 de l'audit QA forensic V2.
//
// Avant : chaque lecture appliquait `if (error || !data?.length) return mock…`,
// ce qui confondait TROIS situations distinctes et affichait des données de
// démonstration crédibles (surveillants nommés, montants, couverture) sans
// jamais le signaler :
//   · la table est vide           → il faut un état vide ;
//   · la requête a échoué          → il faut un message d'erreur ;
//   · la RLS a refusé la lecture   → il faut un message d'erreur.
//
// Désormais chaque lecture retourne son ORIGINE, et le jeu de démonstration
// n'est servi que si `SPC_DEMO=1` est explicitement positionné.

/**
 * D'où viennent les lignes affichées.
 *  · `base`   — lues dans Supabase ;
 *  · `demo`   — jeu de démonstration (SPC_DEMO=1) ; l'écran DOIT le signaler ;
 *  · `vide`   — la requête a réussi et n'a retourné aucune ligne ;
 *  · `erreur` — la requête a échoué (réseau, RLS, table absente).
 */
export type OrigineDonnees = "base" | "demo" | "vide" | "erreur";

export interface Jeu<T> {
  lignes: T[];
  origine: OrigineDonnees;
  /** Message technique — journalisé et affiché en détail repliable, jamais brut. */
  erreur?: string;
}

/** Le jeu de démonstration n'est servi QUE sur activation explicite. */
export function demoActif(): boolean {
  return process.env.SPC_DEMO === "1";
}

export function jeuBase<T>(lignes: T[]): Jeu<T> {
  return { lignes, origine: "base" };
}

export function jeuDemo<T>(lignes: T[]): Jeu<T> {
  return { lignes, origine: "demo" };
}

export function jeuVide<T>(): Jeu<T> {
  return { lignes: [], origine: "vide" };
}

export function jeuErreur<T>(erreur: string): Jeu<T> {
  return { lignes: [], origine: "erreur", erreur };
}

/**
 * Origine d'un écran qui agrège plusieurs lectures.
 * Priorité : une erreur prime sur tout (l'écran est incomplet et doit le dire),
 * puis la démonstration, puis les données réelles ; « vide » n'est retenu que
 * si AUCUNE lecture n'a ramené de ligne.
 */
export function origineGlobale(...jeux: { origine: OrigineDonnees; lignes: unknown[] }[]): OrigineDonnees {
  if (jeux.some((j) => j.origine === "erreur")) return "erreur";
  if (jeux.some((j) => j.origine === "demo")) return "demo";
  if (jeux.some((j) => j.lignes.length > 0)) return "base";
  return "vide";
}

/** Premier message d'erreur rencontré (pour le détail repliable). */
export function premiereErreur(...jeux: { erreur?: string }[]): string | undefined {
  return jeux.find((j) => j.erreur)?.erreur;
}
