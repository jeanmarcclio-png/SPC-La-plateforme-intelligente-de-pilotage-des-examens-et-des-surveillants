// Moteur de calcul financier SPC — fonctions pures, source de vérité unique.
//
// Règles de précision :
//  - durées manipulées en MINUTES ENTIÈRES ;
//  - montants manipulés en CENTIMES ENTIERS ;
//  - un seul point d'arrondi monétaire : roundCents (arrondi au centime,
//    demi-centime arrondi au supérieur, symétrique pour les négatifs) ;
//  - les heures décimales ne servent qu'à l'affichage ou à l'agrégation finale.
//
// Formules (Product Bible §7) :
//  Heures facturables salle = (fin − début) × surveillants requis
//  Montant brut HT          = heures facturables × taux horaire
//  Montant ajusté HT        = brut × coefficient (1.00 = aucun ajustement)
//  Total HT                 = ajusté + frais facturables
//  TVA                      = total HT × taux TVA
//  Total TTC                = total HT + TVA

import type { FinancialEstimate, FinancialInput, Period, RoomPlanningInput } from "./types";

export const TVA_RATE = 0.2;

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

// ---------------------------------------------------------------------------
// Durées et heures facturables
// ---------------------------------------------------------------------------

/** "08:30" → 510. Lève une erreur contrôlée sur format invalide. */
export function parseTimeToMinutes(time: string): number {
  const m = TIME_RE.exec(time?.trim() ?? "");
  if (!m) throw new Error(`Horaire invalide : « ${time} » (format attendu HH:mm)`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Durée en minutes entières. Erreur si fin ≤ début ou format invalide. */
export function calculateRoomDurationMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) throw new Error(`Créneau invalide : fin (${endTime}) doit être après début (${startTime})`);
  return end - start;
}

export function calculateRoomDurationHours(startTime: string, endTime: string): number {
  return calculateRoomDurationMinutes(startTime, endTime) / 60;
}

/**
 * Heures facturables d'une salle = durée × surveillants requis.
 * Salle sans horaires ou sans surveillant → 0 (les anomalies sont signalées
 * par validateRoom, jamais masquées par un faux total).
 */
export function calculateRoomBillableHours(room: RoomPlanningInput): number {
  if (!room.startTime || !room.endTime || room.requiredSupervisors <= 0) return 0;
  let minutes: number;
  try {
    minutes = calculateRoomDurationMinutes(room.startTime, room.endTime);
  } catch {
    return 0;
  }
  return (minutes * room.requiredSupervisors) / 60;
}

/** Total facturable d'une période (matin OU après-midi, indépendantes). */
export function calculatePeriodBillableHours(rooms: RoomPlanningInput[], period: Period): number {
  return rooms.filter((r) => r.period === period).reduce((sum, r) => sum + calculateRoomBillableHours(r), 0);
}

/** Total session = matin + après-midi, calculés séparément puis agrégés. */
export function calculateSessionBillableHours(rooms: RoomPlanningInput[]): number {
  return calculatePeriodBillableHours(rooms, "morning") + calculatePeriodBillableHours(rooms, "afternoon");
}

export function calculateMissionBillableHours(sessions: Array<{ rooms: RoomPlanningInput[] }>): number {
  return sessions.reduce((sum, s) => sum + calculateSessionBillableHours(s.rooms), 0);
}

// ---------------------------------------------------------------------------
// Monnaie — centimes entiers
// ---------------------------------------------------------------------------

/** Point d'arrondi monétaire unique : au centime le plus proche. */
export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** 3650.5 € → 365050 centimes. */
export function eurosToCents(euros: number): number {
  return roundCents(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

// ---------------------------------------------------------------------------
// Calculs financiers
// ---------------------------------------------------------------------------

export function calculateBaseHTCents(billableHours: number, hourlyRateCents: number): number {
  return roundCents(billableHours * hourlyRateCents);
}

export function calculateAdjustedHTCents(baseHTCents: number, adjustmentCoefficient: number): number {
  if (!(adjustmentCoefficient > 0)) throw new Error(`Coefficient d'ajustement invalide : ${adjustmentCoefficient}`);
  return roundCents(baseHTCents * adjustmentCoefficient);
}

/** TVA calculée UNE seule fois, sur le total HT. */
export function calculateVATCents(totalHTCents: number, vatRate: number = TVA_RATE): number {
  if (vatRate < 0) throw new Error(`Taux de TVA invalide : ${vatRate}`);
  return roundCents(totalHTCents * vatRate);
}

/** TTC = HT + TVA, toujours. */
export function calculateTTCents(totalHTCents: number, vatCents: number): number {
  return totalHTCents + vatCents;
}

/** Estimation complète : brut → ajusté → +frais → TVA → TTC. */
export function calculateFinancialEstimate(input: FinancialInput): FinancialEstimate {
  if (input.billableHours < 0) throw new Error(`Heures facturables invalides : ${input.billableHours}`);
  if (input.hourlyRateCents < 0) throw new Error(`Taux horaire invalide : ${input.hourlyRateCents}`);
  const baseHTCents = calculateBaseHTCents(input.billableHours, input.hourlyRateCents);
  const adjustedHTCents = calculateAdjustedHTCents(baseHTCents, input.adjustmentCoefficient);
  const expensesCents = roundCents(input.billableExpensesCents);
  const totalHTCents = adjustedHTCents + expensesCents;
  const vatCents = calculateVATCents(totalHTCents, input.vatRate);
  return {
    billableHours: input.billableHours,
    baseHTCents,
    adjustedHTCents,
    expensesCents,
    totalHTCents,
    vatCents,
    totalTTCents: calculateTTCents(totalHTCents, vatCents),
  };
}

/**
 * Récapitulatif d'un devis SPC : base brute HT (euros) × coefficient
 * d'ajustement (1.00 = aucun ajustement, appliqué UNE seule fois, avant
 * les frais) + frais − remise → HT / TVA / TTC en euros exacts.
 */
export function calculateDevisTotals(input: {
  baseBruteHT: number;
  coefficient?: number;
  fraisDeplacement?: number;
  fraisCoordination?: number;
  remise?: number;
  vatRate?: number;
}): { baseAjustee: number; ht: number; tva: number; ttc: number } {
  const ajusteeCents = calculateAdjustedHTCents(eurosToCents(input.baseBruteHT), input.coefficient ?? 1);
  const htCents =
    ajusteeCents +
    eurosToCents(input.fraisDeplacement ?? 0) +
    eurosToCents(input.fraisCoordination ?? 0) -
    eurosToCents(input.remise ?? 0);
  const vatCents = calculateVATCents(htCents, input.vatRate ?? TVA_RATE);
  return {
    baseAjustee: centsToEuros(ajusteeCents),
    ht: centsToEuros(htCents),
    tva: centsToEuros(vatCents),
    ttc: centsToEuros(calculateTTCents(htCents, vatCents)),
  };
}

/** TTC depuis un HT en euros (TVA 20 % par défaut) — pour les formulaires. */
export function ttcFromHT(htEuros: number, vatRate: number = TVA_RATE): number {
  const htCents = eurosToCents(htEuros);
  return centsToEuros(calculateTTCents(htCents, calculateVATCents(htCents, vatRate)));
}

// ---------------------------------------------------------------------------
// Totaux et plages d'un devis — source unique pour la liste, la fiche,
// les KPI et la facturation. Aucune page ne recalcule ces montants.
// ---------------------------------------------------------------------------

export interface DevisLigneCalcul {
  quantite: number;
  prixUnitaire: number;
}

export interface DevisEquipeCalcul {
  effectif: number;
  heuresPers: number;
  tauxH: number;
}

export interface TotauxDevis {
  baseBruteHT: number;
  baseAjustee: number;
  ht: number;
  tva: number;
  ttc: number;
}

/**
 * Base brute HT d'un devis, en centimes :
 *  - équipe saisie → Σ effectif × heures × taux horaire ;
 *  - sinon lignes saisies → Σ quantité × prix unitaire ;
 *  - sinon → le montant de base saisi sur le devis.
 * Chaque ligne est arrondie au centime une seule fois.
 */
export function calculateDevisBaseBruteCents(input: {
  montantHTBase: number;
  lignes: DevisLigneCalcul[];
  equipe: DevisEquipeCalcul[];
}): number {
  if (input.equipe.length > 0) {
    return input.equipe.reduce((s, e) => s + roundCents(e.effectif * e.heuresPers * e.tauxH * 100), 0);
  }
  if (input.lignes.length > 0) {
    return input.lignes.reduce((s, l) => s + roundCents(l.quantite * l.prixUnitaire * 100), 0);
  }
  return eurosToCents(input.montantHTBase);
}

/**
 * Totaux complets d'un devis : base (équipe > lignes > montant saisi) →
 * coefficient (une seule fois) → + frais − remise → TVA → TTC.
 */
export function calculateDevisTotauxComplets(input: {
  montantHTBase: number;
  coefficient?: number;
  fraisDeplacement?: number;
  fraisCoordination?: number;
  remise?: number;
  lignes?: DevisLigneCalcul[];
  equipe?: DevisEquipeCalcul[];
  vatRate?: number;
}): TotauxDevis {
  const baseCents = calculateDevisBaseBruteCents({
    montantHTBase: input.montantHTBase,
    lignes: input.lignes ?? [],
    equipe: input.equipe ?? [],
  });
  const baseBruteHT = centsToEuros(baseCents);
  const totaux = calculateDevisTotals({
    baseBruteHT,
    coefficient: input.coefficient,
    fraisDeplacement: input.fraisDeplacement,
    fraisCoordination: input.fraisCoordination,
    remise: input.remise,
    vatRate: input.vatRate,
  });
  return { baseBruteHT, ...totaux };
}

export interface PlageHoraire {
  debutMinutes: number;
  finMinutes: number;
  heures: number;
}

/**
 * Plage couverte par un ensemble de créneaux : du plus tôt au plus tard.
 * Les horaires absents ou invalides sont ignorés. Renvoie null si aucune
 * plage exploitable (horaires manquants ou fin ≤ début).
 */
export function calculatePlageHoraire(
  creneaux: Array<{ debut?: string | null; fin?: string | null }>,
): PlageHoraire | null {
  const debuts: number[] = [];
  const fins: number[] = [];
  for (const c of creneaux) {
    try { if (c.debut) debuts.push(parseTimeToMinutes(c.debut)); } catch { /* horaire invalide : ignoré */ }
    try { if (c.fin) fins.push(parseTimeToMinutes(c.fin)); } catch { /* horaire invalide : ignoré */ }
  }
  if (!debuts.length || !fins.length) return null;
  const debutMinutes = Math.min(...debuts);
  const finMinutes = Math.max(...fins);
  if (finMinutes <= debutMinutes) return null;
  return { debutMinutes, finMinutes, heures: (finMinutes - debutMinutes) / 60 };
}

/** Heures d'une ligne d'équipe = effectif × heures par personne. */
export function calculateEquipeHeures(e: DevisEquipeCalcul): number {
  return e.effectif * e.heuresPers;
}

/** Montant d'une ligne d'équipe (euros, arrondi au centime). */
export function calculateEquipeLigneEuros(e: DevisEquipeCalcul): number {
  return centsToEuros(roundCents(e.effectif * e.heuresPers * e.tauxH * 100));
}

/** Total de l'équipe (euros) : même règle que la base brute du devis. */
export function calculateEquipeTotalEuros(equipe: DevisEquipeCalcul[]): number {
  return centsToEuros(calculateDevisBaseBruteCents({ montantHTBase: 0, lignes: [], equipe }));
}

/** Heures d'une journée = heures du matin + heures de l'après-midi (Product Bible §9.2). */
export function calculateDayHours(matinHeures: number, apmHeures: number): number {
  return matinHeures + apmHeures;
}

// ---------------------------------------------------------------------------
// Formatage d'affichage (jamais utilisé dans les calculs)
// ---------------------------------------------------------------------------

/** 125000 → "1 250,00 €" */
export function formatCurrencyFromCents(cents: number, locale: string = "fr-FR"): string {
  return (cents / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/** 6.5 → "6 h 30" ; 3 → "3 h" */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
