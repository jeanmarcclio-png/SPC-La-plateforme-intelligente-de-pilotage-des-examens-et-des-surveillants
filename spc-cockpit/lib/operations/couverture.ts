// COUVERTURE SURVEILLANTS — SOURCE DE VÉRITÉ UNIQUE (SPC · §21).
//
// L'audit QA forensic V2 (BUG-005) a établi que quatre écrans répondaient
// « 14 requis / 10 pourvus / manque 4 » là où la page Salles répondait
// « 19 / 16 / manque 3 », à partir d'un calcul totalement indépendant. Toute
// couverture affichée dans le produit dérive désormais de CE module.
//
// Définition retenue, valable partout :
//   requis  = nombre de surveillants portés par la session (mission.nbSurveillants)
//   pourvus = surveillants DISTINCTS disposant d'au moins un créneau réel
//
// Fonctions PURES et testables.

import type { Affectation, Mission, StatutMission } from "./types";

export interface Couverture {
  requis: number;
  affectes: number;
  manque: number; // surveillants à trouver (0 si couvert)
  tauxCouverture: number; // 0–1 (1 = complet ; pas de requis → considéré couvert)
  niveau: "complet" | "tendu" | "sous-effectif";
}

const SEUIL_TENDU = 0.8; // en-dessous de 80 % → sous-effectif

export function analyseCouverture(input: { requis: number; affectes: number }): Couverture {
  const requis = Math.max(0, Math.round(input.requis || 0));
  const affectes = Math.max(0, Math.round(input.affectes || 0));
  const manque = Math.max(0, requis - affectes);
  const tauxCouverture = requis > 0 ? affectes / requis : 1;

  let niveau: Couverture["niveau"];
  if (tauxCouverture >= 1) niveau = "complet";
  else if (tauxCouverture >= SEUIL_TENDU) niveau = "tendu";
  else niveau = "sous-effectif";

  return { requis, affectes, manque, tauxCouverture, niveau };
}

// ---------------------------------------------------------------------------
// Couverture d'une session — LA définition partagée par tous les écrans
// ---------------------------------------------------------------------------

/** État affichable, commun au dashboard, au cockpit et aux missions. */
export type EtatCouverture = "complet" | "attention" | "risque" | "a-planifier";

export interface CouvertureSession {
  requis: number;
  pourvus: number;
  manquants: number;
  taux: number; // 0–1
  etat: EtatCouverture;
}

/** Planning verrouillé : la session est engagée, sa couverture fait foi. */
const STATUTS_VERROUILLES: StatutMission[] = ["Validée", "En cours", "Terminée", "Facturée", "Archivée"];

export function etatDepuisTaux(taux: number): EtatCouverture {
  if (taux >= 1) return "complet";
  if (taux >= 0.8) return "attention";
  return "risque";
}

/** Affectations disposant d'au moins un créneau horaire réel. */
export function affectationsAvecCreneau(affectations: Affectation[]): Affectation[] {
  return affectations.filter(
    (a) => a.matin || a.apm || !!a.matinCreneaux?.length || !!a.apmCreneaux?.length,
  );
}

/**
 * Couverture d'une session. Priorité aux affectations réelles (postes pourvus =
 * surveillants distincts disposant d'un créneau). Sans affectation détaillée :
 * une session au planning verrouillé est considérée couverte ; une session
 * encore à planifier est marquée « à planifier » (jamais un faux 0 alarmant,
 * jamais un faux 100 %).
 */
export function couvertureSession(
  mission: Mission,
  affectations: Affectation[],
): CouvertureSession {
  const requis = Math.max(0, mission.nbSurveillants || 0);
  const rows = affectations.filter((a) => a.missionId === mission.id);

  if (rows.length > 0) {
    const avecCreneau = affectationsAvecCreneau(rows);
    const pourvus = new Set(avecCreneau.map((a) => a.surveillantId)).size;
    // Une session peut porter plus d'affectations que de postes déclarés :
    // le dénominateur suit alors le réel plutôt que la déclaration.
    const req = Math.max(requis, rows.length);
    const taux = req > 0 ? pourvus / req : 1;
    return { requis: req, pourvus, manquants: Math.max(0, req - pourvus), taux, etat: etatDepuisTaux(taux) };
  }

  if (STATUTS_VERROUILLES.includes(mission.statut)) {
    return { requis, pourvus: requis, manquants: 0, taux: 1, etat: "complet" };
  }
  return { requis, pourvus: 0, manquants: requis, taux: 0, etat: "a-planifier" };
}
