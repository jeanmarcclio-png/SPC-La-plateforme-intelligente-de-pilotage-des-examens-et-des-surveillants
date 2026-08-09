import type { Mission } from "./types";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONG_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export interface PointTendance {
  key: string;   // yyyy-mm
  label: string; // "Mai 26"
  total: number; // montant HT cumulé du mois
}

// CA HT par mois de mission (missions non annulées), 6 derniers mois avec données.
export function tendanceCA(missions: Mission[]): PointTendance[] {
  const parMois = new Map<string, number>();
  for (const m of missions) {
    if (m.statut === "Annulée" || !m.dateMission) continue;
    const key = m.dateMission.slice(0, 7);
    parMois.set(key, (parMois.get(key) ?? 0) + m.montantHT);
  }
  return [...parMois.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => ({
      key,
      label: `${MOIS_FR[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`,
      total,
    }));
}

// ---------------------------------------------------------------------------
// Variation mensuelle du CA RÉALISÉ — corrige BUG-007
// ---------------------------------------------------------------------------
//
// L'audit a relevé la tuile « CA CONFIRMÉ HT · 12 544,40 € · −56,2 % vs mois
// précédent ». Deux défauts superposés :
//
//   1. les deux nombres venaient de SÉRIES DIFFÉRENTES — la valeur était le
//      portefeuille de devis acceptés (un STOCK, sans notion de mois), la
//      variation celle du CA réalisé des missions (un FLUX mensuel) ;
//   2. la comparaison opposait un mois PARTIEL (1–8 août) à un mois COMPLET
//      (juillet), ce qui la rend structurellement négative en début de mois.
//
// Ce module ne calcule donc qu'une chose, et la nomme : la variation du CA
// réalisé, À PÉRIODE ÉQUIVALENTE.

export interface VariationCA {
  /** Variation signée en %, ex. −12.4. */
  pourcentage: number;
  /** Total de la période courante. */
  courant: number;
  /** Total de la période de référence, même nombre de jours. */
  precedent: number;
  /**
   * Libellé EXACT de ce qui est comparé, destiné à être affiché tel quel :
   * « CA réalisé · 1–9 août vs 1–9 juillet ».
   */
  libelle: string;
  /** true quand le mois courant n'est pas terminé (comparaison tronquée). */
  periodePartielle: boolean;
}

function totalEntre(missions: Mission[], debut: Date, fin: Date): number {
  let total = 0;
  for (const m of missions) {
    if (m.statut === "Annulée" || !m.dateMission) continue;
    const d = new Date(m.dateMission + "T00:00:00");
    if (Number.isNaN(d.getTime())) continue;
    if (d >= debut && d <= fin) total += m.montantHT;
  }
  return total;
}

/**
 * Variation du CA réalisé entre le mois courant et le précédent, bornée au même
 * nombre de jours des deux côtés. Retourne `null` quand la référence est nulle :
 * une variation en pourcentage n'a alors aucun sens et ne doit pas être inventée.
 */
export function variationCAMensuelle(missions: Mission[], now: Date): VariationCA | null {
  const jour = now.getDate();
  const annee = now.getFullYear();
  const mois = now.getMonth();

  const debutCourant = new Date(annee, mois, 1);
  const finCourant = new Date(annee, mois, jour, 23, 59, 59);

  // Même tranche de jours le mois précédent. Si ce mois est plus court (le 31
  // face à février), on s'arrête à son dernier jour : jamais de débordement sur
  // le mois d'après, qui gonflerait artificiellement la référence.
  const debutPrecedent = new Date(annee, mois - 1, 1);
  const dernierJourPrecedent = new Date(annee, mois, 0).getDate();
  const jourPrecedent = Math.min(jour, dernierJourPrecedent);
  const finPrecedent = new Date(annee, mois - 1, jourPrecedent, 23, 59, 59);

  const courant = totalEntre(missions, debutCourant, finCourant);
  const precedent = totalEntre(missions, debutPrecedent, finPrecedent);
  if (precedent <= 0) return null;

  const moisCourantFin = new Date(annee, mois + 1, 0).getDate();
  const periodePartielle = jour < moisCourantFin;
  const nomCourant = MOIS_LONG_FR[mois];
  const nomPrecedent = MOIS_LONG_FR[(mois + 11) % 12];

  const libelle = periodePartielle
    ? `CA réalisé · 1–${jour} ${nomCourant} vs 1–${jourPrecedent} ${nomPrecedent}`
    : `CA réalisé · ${nomCourant} vs ${nomPrecedent}`;

  return {
    pourcentage: Math.round(((courant - precedent) / precedent) * 1000) / 10,
    courant,
    precedent,
    libelle,
    periodePartielle,
  };
}
