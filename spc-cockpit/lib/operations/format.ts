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
