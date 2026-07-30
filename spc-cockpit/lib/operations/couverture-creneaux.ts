// Couverture par tranche horaire d'une session (SPC · §21). Fonction PURE et
// testable. Pour chaque tranche de la journée, compte les surveillants
// réellement présents et détecte les « trous » de couverture — une tranche
// sans personne à l'intérieur de la plage d'activité de la session.
//
// Sert de socle au mini-panneau de couverture de la timeline « Présence par
// créneau » : repérer d'un coup d'œil les fenêtres sous-couvertes ou vides.

import { parseTimeToMinutes } from "./engine";

export type NiveauCreneau = "complet" | "partiel" | "vide" | "hors";

export interface CreneauCouverture {
  label: string; // « 08–10h »
  debut: number; // minutes depuis minuit
  fin: number; // minutes depuis minuit (borné à dayEnd)
  presents: number; // surveillants distincts présents sur la tranche
  requis: number; // effectif requis de la session (référence de cible)
  actif: boolean; // la tranche recoupe la plage d'activité de la session
  trou: boolean; // tranche vide À L'INTÉRIEUR de la plage active → trou critique
  niveau: NiveauCreneau;
}

export interface CouvertureCreneaux {
  creneaux: CreneauCouverture[];
  trousCritiques: number; // nombre de tranches vides dans la plage active
}

export interface PresenceInput {
  id: number | string; // identifiant du surveillant (compte distinct)
  slots: Array<{ debut: string; fin: string }>;
}

const DEFAULT_START = 8 * 60; // 08:00
const DEFAULT_END = 19 * 60; // 19:00
const DEFAULT_BUCKET = 120; // 2 h

function toInterval(debut: string, fin: string): [number, number] | null {
  try {
    const d = parseTimeToMinutes(debut);
    const f = parseTimeToMinutes(fin);
    return f > d ? [d, f] : null;
  } catch {
    return null;
  }
}

function hh(min: number): string {
  return String(Math.floor(min / 60)).padStart(2, "0");
}

/**
 * Couverture par tranche horaire.
 * - `presents` : surveillants DISTINCTS ayant au moins un créneau recoupant la tranche.
 * - `trou` : tranche sans présence située strictement dans la plage active
 *   (entre le premier et le dernier créneau de la session) → réellement critique.
 * - Hors plage active, la tranche est « hors » (grisée), jamais comptée comme trou.
 */
export function couvertureParCreneau(input: {
  presences: PresenceInput[];
  requis: number;
  dayStart?: number;
  dayEnd?: number;
  bucket?: number;
}): CouvertureCreneaux {
  const dayStart = input.dayStart ?? DEFAULT_START;
  const dayEnd = input.dayEnd ?? DEFAULT_END;
  const bucket = input.bucket ?? DEFAULT_BUCKET;
  const requis = Math.max(0, Math.round(input.requis || 0));

  // Intervalles valides par surveillant + plage d'activité globale de la session.
  const parSurv = input.presences.map((p) => ({
    id: p.id,
    intervals: p.slots.map((s) => toInterval(s.debut, s.fin)).filter((x): x is [number, number] => x !== null),
  }));
  let spanStart = Infinity;
  let spanEnd = -Infinity;
  for (const p of parSurv) {
    for (const [d, f] of p.intervals) {
      if (d < spanStart) spanStart = d;
      if (f > spanEnd) spanEnd = f;
    }
  }
  const hasSpan = spanEnd > spanStart;

  const creneaux: CreneauCouverture[] = [];
  for (let b = dayStart; b < dayEnd; b += bucket) {
    const bEnd = Math.min(b + bucket, dayEnd);
    const presents = parSurv.filter((p) =>
      p.intervals.some(([d, f]) => d < bEnd && f > b)
    ).length;
    const actif = hasSpan && b < spanEnd && bEnd > spanStart;
    const trou = actif && presents === 0;
    let niveau: NiveauCreneau;
    if (!actif) niveau = "hors";
    else if (presents === 0) niveau = "vide";
    else if (requis === 0 || presents >= requis) niveau = "complet";
    else niveau = "partiel";
    creneaux.push({
      label: `${hh(b)}–${hh(bEnd)}h`,
      debut: b,
      fin: bEnd,
      presents,
      requis,
      actif,
      trou,
      niveau,
    });
  }

  return { creneaux, trousCritiques: creneaux.filter((c) => c.trou).length };
}
