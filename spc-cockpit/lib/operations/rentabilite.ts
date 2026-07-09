// Analyse de rentabilité d'une session (SPC · §21). Fonction PURE et testable.
// Marge = CA HT − coût estimé des surveillants (heures planifiées × taux horaire
// de chacun). Aide à la décision : jamais de chiffre inventé, tout est dérivé
// des heures réelles et des taux en base.

export interface LigneCout {
  heures: number;
  tauxHoraire: number;
}

export interface Rentabilite {
  caHT: number; // chiffre d'affaires HT (montant de la mission)
  coutHT: number; // coût estimé des surveillants
  margeHT: number; // caHT − coutHT
  tauxMarge: number; // marge / CA (0–1 ; peut être négatif) ; 0 si CA nul
  heuresTotal: number; // heures planifiées cumulées
  niveau: "saine" | "surveiller" | "critique";
}

/** Seuils de marge (part du CA). */
const SEUIL_SAINE = 0.3;
const SEUIL_SURVEILLER = 0.12;

export function analyseRentabilite(input: { caHT: number; lignes: LigneCout[] }): Rentabilite {
  const caHT = Math.max(0, input.caHT || 0);
  const coutHT = input.lignes.reduce((s, l) => s + Math.max(0, l.heures) * Math.max(0, l.tauxHoraire), 0);
  const heuresTotal = input.lignes.reduce((s, l) => s + Math.max(0, l.heures), 0);
  const margeHT = caHT - coutHT;
  const tauxMarge = caHT > 0 ? margeHT / caHT : 0;

  let niveau: Rentabilite["niveau"];
  if (caHT === 0 || tauxMarge < SEUIL_SURVEILLER) niveau = "critique";
  else if (tauxMarge < SEUIL_SAINE) niveau = "surveiller";
  else niveau = "saine";

  return {
    caHT,
    coutHT: Math.round(coutHT * 100) / 100,
    margeHT: Math.round(margeHT * 100) / 100,
    tauxMarge,
    heuresTotal: Math.round(heuresTotal * 100) / 100,
    niveau,
  };
}
