// RÉCONCILIATION DU DEVIS — corrige BUG-016 de l'audit QA forensic V2.
//
// Constat sur le devis SPC-20260728-001 (ICP Reims), recalculé avec le moteur
// du produit :
//
//   heures facturables de la grille (calculateRoomBillableHours)   23,33 h/jour
//   × 10 « jours retenus » affichés sur le devis                  233,33 h
//   heures effectivement facturées (devis_equipe.heuresPers)      262,30 h
//   ÉCART                                                          28,97 h ≈ 811 € HT
//
// Les deux blocs étaient affichés l'un sous l'autre, sur la même page, sans
// lien de calcul ni note. Un client qui additionne la grille n'obtient pas le
// total facturé.
//
// Troisième figure sur la même page : « Heures / jour » valait 8,33 h — c'est
// l'AMPLITUDE d'ouverture (matin + après-midi), pas un volume facturable. Trois
// nombres d'heures cohabitaient donc sans que rien ne les distingue.
//
// Ce module ne tranche pas à la place de l'humain : il RECALCULE depuis le
// moteur, NOMME chaque grandeur avec son périmètre, et expose l'écart. Une
// saisie manuelle reste permise — elle doit seulement cesser d'être invisible.
//
// Fonctions PURES et testables.

import { calculateSessionBillableHours } from "./engine/financial-engine";
import type { RoomPlanningInput } from "./engine/types";
import { eurosToCents, centsToEuros } from "./engine/financial-engine";
import type { Devis, DevisEquipe, DevisLigne, DevisSalle } from "./types";

/** Tolérance d'arrondi : en deçà, l'écart n'est pas une anomalie métier. */
const TOLERANCE_H = 0.5;

export function sallesVersMoteur(salles: DevisSalle[]): RoomPlanningInput[] {
  return salles.map((s) => ({
    id: String(s.id),
    period: s.session === "matin" ? "morning" : "afternoon",
    roomCode: s.salle,
    startTime: s.debut ?? null,
    endTime: s.fin ?? null,
    requiredSupervisors: Math.max(0, s.surveillants || 0),
    students: s.etudiants,
    isPMR: s.pmr,
    hasExtraTime: s.tiersTemps,
  }));
}

export type StatutReconciliation =
  | "aligne" // la grille projetée et les heures facturées coïncident
  | "ecart" // elles divergent : l'écart est chiffré et affiché
  | "non-comparable"; // il manque la grille, les jours ou les heures facturées

export interface ReconciliationDevis {
  statut: StatutReconciliation;
  /** Heures FACTURABLES d'une journée de la grille (durée × surveillants). */
  heuresGrilleJour: number;
  /** Jours retenus tels qu'affichés sur le devis. */
  joursRetenus: number | null;
  /** heuresGrilleJour × joursRetenus. */
  heuresGrilleProjetees: number | null;
  /** Heures réellement facturées (équipe chiffrée, ou lignes du devis). */
  heuresFacturees: number;
  /** heuresFacturees − heuresGrilleProjetees (positif = on facture plus). */
  ecartHeures: number | null;
  /** Valorisation de l'écart au taux horaire moyen facturé. */
  ecartMontantHT: number | null;
  tauxHoraireMoyen: number;
  /** Phrase prête à afficher, `null` quand tout coïncide. */
  message: string | null;
}

/** Heures facturables de la grille, pour UNE journée de cette configuration. */
export function heuresGrilleParJour(salles: DevisSalle[]): number {
  return calculateSessionBillableHours(sallesVersMoteur(salles));
}

/** Heures facturées : priorité à l'équipe chiffrée, repli sur les lignes en « h ». */
export function heuresFactureesDevis(equipe: DevisEquipe[], lignes: DevisLigne[]): number {
  if (equipe.length > 0) {
    return equipe.reduce((s, e) => s + Math.max(0, e.effectif) * Math.max(0, e.heuresPers), 0);
  }
  return lignes
    .filter((l) => l.unite === "h")
    .reduce((s, l) => s + Math.max(0, l.quantite), 0);
}

/** Taux horaire moyen PONDÉRÉ par les heures — jamais une moyenne de taux. */
export function tauxHoraireMoyenDevis(equipe: DevisEquipe[], lignes: DevisLigne[]): number {
  const source = equipe.length > 0
    ? equipe.map((e) => ({ h: Math.max(0, e.effectif) * Math.max(0, e.heuresPers), taux: e.tauxH }))
    : lignes.filter((l) => l.unite === "h").map((l) => ({ h: Math.max(0, l.quantite), taux: l.prixUnitaire }));
  const heures = source.reduce((s, x) => s + x.h, 0);
  if (heures <= 0) return 0;
  const cents = source.reduce((s, x) => s + eurosToCents(x.h * x.taux), 0);
  return centsToEuros(cents) / heures;
}

export function reconcilierDevis(input: {
  salles: DevisSalle[];
  equipe: DevisEquipe[];
  lignes: DevisLigne[];
  joursRetenus: number | null;
}): ReconciliationDevis {
  const heuresGrilleJour = heuresGrilleParJour(input.salles);
  const heuresFacturees = heuresFactureesDevis(input.equipe, input.lignes);
  const tauxHoraireMoyen = tauxHoraireMoyenDevis(input.equipe, input.lignes);
  const joursRetenus = input.joursRetenus;

  const base = {
    heuresGrilleJour,
    joursRetenus,
    heuresFacturees,
    tauxHoraireMoyen,
  };

  if (heuresGrilleJour <= 0 || joursRetenus == null || joursRetenus <= 0 || heuresFacturees <= 0) {
    return {
      ...base,
      statut: "non-comparable",
      heuresGrilleProjetees: null,
      ecartHeures: null,
      ecartMontantHT: null,
      message:
        heuresGrilleJour <= 0 && heuresFacturees > 0
          ? "Aucune grille de salles exploitable : les heures facturées ne peuvent être rapprochées d'aucun détail de salle."
          : null,
    };
  }

  const heuresGrilleProjetees = heuresGrilleJour * joursRetenus;
  const ecartHeures = heuresFacturees - heuresGrilleProjetees;
  const ecartMontantHT = centsToEuros(eurosToCents(ecartHeures * tauxHoraireMoyen));

  if (Math.abs(ecartHeures) < TOLERANCE_H) {
    return {
      ...base,
      statut: "aligne",
      heuresGrilleProjetees,
      ecartHeures,
      ecartMontantHT,
      message: null,
    };
  }

  const h = (n: number) => `${Math.abs(n).toFixed(2).replace(".", ",")} h`;
  const sens = ecartHeures > 0 ? "de plus que" : "de moins que";
  return {
    ...base,
    statut: "ecart",
    heuresGrilleProjetees,
    ecartHeures,
    ecartMontantHT,
    message:
      `La grille de salles décrit ${h(heuresGrilleJour)} facturables pour une journée de cette configuration, ` +
      `soit ${h(heuresGrilleProjetees)} sur ${joursRetenus} jours retenus. Le devis facture ${h(heuresFacturees)}, ` +
      `soit ${h(ecartHeures)} ${sens} la grille — environ ${Math.abs(ecartMontantHT).toFixed(2).replace(".", ",")} € HT. ` +
      `Si la grille est une journée type et que les journées réelles varient, indiquez-le au client ; sinon, corrigez l'un des deux blocs.`,
  };
}

// ---------------------------------------------------------------------------
// Effectifs — trois nombres, trois périmètres (second constat de BUG-016)
// ---------------------------------------------------------------------------
//
// Le même devis portait 6 (colonne « surv. » de la liste), 10 (bloc « Équipe &
// volume horaire ») et 4 (total de la grille du matin). Ces trois nombres ne
// mesurent PAS la même chose : les confondre est la faute, pas leur différence.

export interface EffectifDevis {
  valeur: number;
  /** Ce que ce nombre compte, écrit pour être affiché tel quel. */
  perimetre: string;
}

export interface EffectifsDevis {
  annonce: EffectifDevis;
  equipeTotale: EffectifDevis;
  simultaneMax: EffectifDevis;
  /**
   * true quand l'effectif ANNONCÉ ne correspond à aucun des deux périmètres
   * calculés — c'est le nombre qui figure sur le document contractuel.
   */
  annonceIncoherent: boolean;
  message: string | null;
}

export function effectifsDevis(input: {
  devis: Devis;
  equipe: DevisEquipe[];
  salles: DevisSalle[];
}): EffectifsDevis {
  const annonce = Math.max(0, input.devis.nbSurveillants || 0);
  const equipeTotale = input.equipe.reduce((s, e) => s + Math.max(0, e.effectif), 0);
  const parPeriode = (p: DevisSalle["session"]) =>
    input.salles.filter((s) => s.session === p).reduce((s, x) => s + Math.max(0, x.surveillants), 0);
  const simultaneMax = Math.max(parPeriode("matin"), parPeriode("apres-midi"));

  // On ne compare que ce qui est renseigné : un devis sans équipe chiffrée et
  // sans grille ne porte aucune incohérence, seulement moins d'information.
  const references = [equipeTotale, simultaneMax].filter((n) => n > 0);
  const annonceIncoherent = annonce > 0 && references.length > 0 && !references.includes(annonce);

  return {
    annonce: { valeur: annonce, perimetre: "annoncé sur le devis" },
    equipeTotale: { valeur: equipeTotale, perimetre: "personnes mobilisées sur toute la prestation" },
    simultaneMax: { valeur: simultaneMax, perimetre: "surveillants en salle simultanément (demi-journée la plus chargée)" },
    annonceIncoherent,
    message: annonceIncoherent
      ? `L'effectif annoncé (${annonce}) ne correspond ni aux ${equipeTotale} personnes mobilisées, ni aux ${simultaneMax} surveillants présents simultanément. Alignez-le sur le périmètre voulu avant l'envoi au client.`
      : null,
  };
}
