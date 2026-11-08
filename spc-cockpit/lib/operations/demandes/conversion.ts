// Charge utile de conversion d'une demande en mission — fonction PURE.
//
// Règle : le potentiel « indicatif » d'une demande n'est jamais un montant HT
// de mission. La mission est créée sans montant (montant_ht = 0) : le chiffrage
// reste à faire via le devis, à partir des heures réellement planifiées.

import { totauxDemande } from "./logic";
import type { DemandeClient } from "./types";

export interface PayloadMission {
  client: string;
  /** Première date d'épreuve, ISO yyyy-mm-dd, ou null si non définie. */
  dateMission: string | null;
  /** Salles distinctes (union des matin et après-midi). */
  nbSalles: number;
  /** Total des surveillants demandés sur les lignes de la demande. */
  nbSurveillants: number;
}

export function payloadMissionDepuisDemande(d: DemandeClient): PayloadMission {
  const t = totauxDemande(d);
  return {
    client: d.etablissement.trim(),
    dateMission: t.dateMin ?? null,
    nbSalles: t.nbSalles,
    nbSurveillants: t.nbSurveillants,
  };
}
