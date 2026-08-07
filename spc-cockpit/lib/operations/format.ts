export const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/** Montant arrondi à l'euro — pour les zones denses (donut, mini-cartes). */
export const euroEntier = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

/** 0,085 → « +8,5 % » · -0,12 → « −12 % » (signe typographique français). */
export function pourcentSigne(fraction: number): string {
  const signe = fraction >= 0 ? "+" : "−";
  return `${signe}${Math.abs(fraction * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

/** 0,857 → « 86 % ». */
export const pourcent = (fraction: number) => `${Math.round(fraction * 100)} %`;

export function dateFR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Date courte française : "08 juil. 2026" (jour sur 2 chiffres, mois abrégé). */
export function dateCourteFR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\.$/, ".");
}

/** Heures au format français : 18 → "18,0 h" ; 14.5 → "14,5 h". */
export function heuresFR(h: number) {
  return h.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " h";
}

/** Pourcentage entier avec espace insécable : 0.71 → "71 %" (fraction 0–1). */
export function pctFR(fraction: number) {
  return Math.round(fraction * 100) + " %";
}

/** Variation signée en points de %, pour les deltas : 18.2 → "+18,2 %". */
export function deltaPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return sign + value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
}
