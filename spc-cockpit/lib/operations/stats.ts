import type { Mission } from "./types";

const MOIS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

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
