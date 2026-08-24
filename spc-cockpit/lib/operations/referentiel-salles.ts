// RÉFÉRENTIEL DES SALLES ↔ PLANNING — corrige BUG-004 de l'audit QA forensic V2.
//
// Constat de l'audit : `affectations.salle` est une colonne TEXTE LIBRE sans clé
// étrangère vers `salles`. Le rapprochement relevé sur les données réelles :
//
//   référentiel (table salles) : A21, A22, E31, Grand Amphithéâtre, B11
//   salles du planning         : A21, C14, E31, AMP, A22, F11, F12, E32
//   salles fantômes            : C14, AMP, F11, F12, E32   ← 5 inexistantes
//   salle orpheline            : B11 (référencée, utilisée par personne)
//
// Supprimer, renommer ou recapacité une salle n'avait donc AUCUN effet sur le
// planning. La migration 32 introduit la clé étrangère `affectations.salle_id`
// (`on delete restrict`) ; ce module fournit la contrepartie applicative :
//   — le rapprochement nom ↔ référentiel, seule façon de traiter l'existant ;
//   — la détection des salles fantômes et orphelines, à afficher ;
//   — le décompte d'usage, qui fonde le refus de suppression.
//
// Fonctions PURES et testables.

import type { Affectation, Salle } from "./types";

/**
 * Clé de rapprochement d'un nom de salle. Casse, accents, ponctuation et
 * préfixe « Salle » sont neutralisés : « Salle A21 », « salle a-21 » et « A21 »
 * désignent la même salle. Les alias métier (« AMP » ↔ « Grand Amphithéâtre »)
 * ne sont PAS devinés — ils relèvent d'une décision humaine, pas d'une
 * heuristique : les traiter automatiquement fabriquerait un rapprochement faux.
 */
export function normaliserNomSalle(nom: string | null | undefined): string {
  return (nom ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\s*salles?\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Nom de salle porté par une affectation, nettoyé (chaîne vide si absent). */
export function salleDeAffectation(a: Affectation): string {
  return (a.salle ?? "").trim();
}

export interface SalleFantome {
  nom: string; // nom tel qu'il figure au planning
  affectations: number; // nombre d'affectations qui le référencent
}

export interface RapprochementSalles {
  /** Salles du référentiel effectivement utilisées au planning. */
  utilisees: Salle[];
  /** Salles du référentiel qu'aucune affectation ne référence. */
  orphelines: Salle[];
  /** Noms présents au planning sans contrepartie au référentiel. */
  fantomes: SalleFantome[];
  /** Nombre d'affectations planifiées SANS aucun nom de salle. */
  sansSalle: number;
  /** true dès qu'une incohérence référentielle existe. */
  incoherent: boolean;
}

/**
 * Rapproche le référentiel `salles` et les noms de salle portés par les
 * affectations. C'est ce rapprochement — et non une jointure, qui n'existait
 * pas — qui rend l'invariant INV-004 vérifiable sur les données existantes.
 */
export function rapprocherSalles(
  salles: Salle[],
  affectations: Affectation[],
): RapprochementSalles {
  const parCle = new Map<string, Salle>();
  for (const s of salles) {
    const cle = normaliserNomSalle(s.nom);
    if (cle && !parCle.has(cle)) parCle.set(cle, s);
  }

  const usageParCle = new Map<string, number>();
  const nomAffichageParCle = new Map<string, string>();
  let sansSalle = 0;

  for (const a of affectations) {
    const nom = salleDeAffectation(a);
    if (!nom) {
      sansSalle++;
      continue;
    }
    const cle = normaliserNomSalle(nom);
    usageParCle.set(cle, (usageParCle.get(cle) ?? 0) + 1);
    if (!nomAffichageParCle.has(cle)) nomAffichageParCle.set(cle, nom);
  }

  const utilisees: Salle[] = [];
  const orphelines: Salle[] = [];
  for (const s of salles) {
    const cle = normaliserNomSalle(s.nom);
    if (usageParCle.has(cle)) utilisees.push(s);
    else orphelines.push(s);
  }

  const fantomes: SalleFantome[] = [];
  for (const [cle, nb] of usageParCle) {
    if (parCle.has(cle)) continue;
    fantomes.push({ nom: nomAffichageParCle.get(cle) ?? cle, affectations: nb });
  }
  fantomes.sort((a, b) => b.affectations - a.affectations || a.nom.localeCompare(b.nom, "fr"));

  return {
    utilisees,
    orphelines,
    fantomes,
    sansSalle,
    incoherent: fantomes.length > 0 || sansSalle > 0,
  };
}

/**
 * Nombre d'affectations référençant une salle. Fonde le refus de suppression :
 * tant que ce décompte est > 0, supprimer la salle laisserait le planning
 * pointer vers une salle inexistante — exactement la situation constatée.
 */
export function usageSalle(salle: Salle, affectations: Affectation[]): number {
  const cle = normaliserNomSalle(salle.nom);
  if (!cle) return 0;
  return affectations.filter((a) => normaliserNomSalle(salleDeAffectation(a)) === cle).length;
}

/**
 * Message d'anomalie référentielle destiné à l'écran Salles. Retourne `null`
 * quand le rapprochement est propre : aucun bandeau ne doit alors s'afficher.
 */
export function messageIncoherence(r: RapprochementSalles): string | null {
  if (!r.incoherent) return null;
  const morceaux: string[] = [];
  if (r.fantomes.length > 0) {
    const noms = r.fantomes.slice(0, 5).map((f) => f.nom).join(", ");
    const reste = r.fantomes.length > 5 ? ` (+${r.fantomes.length - 5})` : "";
    morceaux.push(
      `${r.fantomes.length} salle${r.fantomes.length > 1 ? "s" : ""} du planning ${r.fantomes.length > 1 ? "sont absentes" : "est absente"} du référentiel : ${noms}${reste}`,
    );
  }
  if (r.sansSalle > 0) {
    morceaux.push(`${r.sansSalle} affectation${r.sansSalle > 1 ? "s" : ""} sans salle`);
  }
  return `${morceaux.join(" · ")}. Créez ces salles au référentiel ou corrigez le planning : sans cela, capacités, PMR et tiers-temps ne sont pilotés nulle part.`;
}
