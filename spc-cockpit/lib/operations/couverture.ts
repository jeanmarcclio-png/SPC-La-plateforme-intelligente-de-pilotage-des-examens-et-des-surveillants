// Prédiction de sous-effectif d'une session (SPC · §21). Fonction PURE et
// testable. Compare les surveillants requis aux surveillants réellement
// affectés (avec un créneau) pour anticiper un manque AVANT le jour J.

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
