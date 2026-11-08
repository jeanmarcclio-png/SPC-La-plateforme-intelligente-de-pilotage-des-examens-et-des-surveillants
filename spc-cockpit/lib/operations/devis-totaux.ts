// Totaux affichés d'un devis — fonction PURE (aucune dépendance serveur).
//
// Le HT et le TTC stockés en base ne sont plus une source de vérité : ils
// représentent la base saisie. Chaque lecture recalcule les totaux via le
// moteur (lib/operations/engine), à partir de la base, des lignes ou de
// l'équipe, du coefficient, des frais et de la remise.

import { calculateDevisTotauxComplets } from "./engine";
import type { Devis, DevisEquipe, DevisLigne } from "./types";

/**
 * Renvoie le devis avec ses totaux recalculés :
 *  - `montantHTBase` : base saisie (avant coefficient, frais et remise) ;
 *  - `montantHT` / `montantTTC` : totaux calculés par le moteur.
 */
export function appliquerTotauxDevis(
  devis: Devis,
  lignes: DevisLigne[],
  equipe: DevisEquipe[],
): Devis {
  const totaux = calculateDevisTotauxComplets({
    montantHTBase: devis.montantHT,
    coefficient: devis.coefficient,
    fraisDeplacement: devis.fraisDeplacement,
    fraisCoordination: devis.fraisCoordination,
    remise: devis.remise,
    lignes: lignes.filter((l) => l.devisId === devis.id),
    equipe: equipe.filter((e) => e.devisId === devis.id),
  });
  return {
    ...devis,
    montantHTBase: devis.montantHT,
    montantHT: totaux.ht,
    montantTTC: totaux.ttc,
  };
}
