// Jetons visuels du cockpit des demandes clients — thème « Dark Graphite ».
// Source de vérité unique de la page : aucune couleur en dur ailleurs.
// Le reste du module Opérations reste sur le thème clair ; ce thème est
// volontairement local à la route /operations/demandes-client.

export const DG = {
  // Fonds
  page: "#06131F",
  pageAlt: "#071827",
  surface1: "#0B1926",
  surface2: "#0D1D2B",
  surface3: "#102231",
  surfaceHover: "#12283A",

  // Bordures
  borderSoft: "rgba(148, 163, 184, 0.14)",
  borderMedium: "rgba(148, 163, 184, 0.22)",
  borderFocus: "rgba(105, 82, 255, 0.55)",

  // Texte
  textPrimary: "#F6F8FC",
  textSecondary: "#B4BECC",
  textTertiary: "#7E8C9F",
  textMuted: "#647386",

  // Marque et sémantique
  violet: "#5A3FFF",
  violetLight: "#735DFF",
  violetDark: "#3925C9",
  blue: "#2496FF",
  warning: "#FF8A00",
  success: "#17D98B",
  danger: "#FF3F55",
} as const;

/** Accent sémantique d'une carte, d'un badge ou d'un segment. */
export type Accent = "violet" | "blue" | "warning" | "success" | "danger" | "neutral";

export interface AccentStyle {
  /** Couleur de trait / texte accentué. */
  color: string;
  /** Fond translucide de pastille. */
  soft: string;
  /** Bordure teintée. */
  ring: string;
  /** Halo diffus (cartes critiques). */
  glow: string;
}

export const ACCENTS: Record<Accent, AccentStyle> = {
  violet: { color: DG.violetLight, soft: "rgba(115, 93, 255, 0.14)", ring: "rgba(115, 93, 255, 0.30)", glow: "rgba(90, 63, 255, 0.16)" },
  blue: { color: DG.blue, soft: "rgba(36, 150, 255, 0.14)", ring: "rgba(36, 150, 255, 0.28)", glow: "rgba(36, 150, 255, 0.14)" },
  warning: { color: DG.warning, soft: "rgba(255, 138, 0, 0.14)", ring: "rgba(255, 138, 0, 0.28)", glow: "rgba(255, 138, 0, 0.14)" },
  success: { color: DG.success, soft: "rgba(23, 217, 139, 0.13)", ring: "rgba(23, 217, 139, 0.26)", glow: "rgba(23, 217, 139, 0.13)" },
  danger: { color: DG.danger, soft: "rgba(255, 63, 85, 0.14)", ring: "rgba(255, 63, 85, 0.30)", glow: "rgba(255, 63, 85, 0.16)" },
  neutral: { color: DG.textSecondary, soft: "rgba(148, 163, 184, 0.12)", ring: "rgba(148, 163, 184, 0.22)", glow: "rgba(148, 163, 184, 0.10)" },
};

/** Ombre standard des surfaces (§19 — sobre, jamais caricaturale). */
export const OMBRE_CARTE = "0 8px 24px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.025)";

/** Lueur réservée au CTA principal. */
export const GLOW_CTA = "0 0 0 1px rgba(114,91,255,.22), 0 8px 20px rgba(76,48,220,.20)";

/** Anneau de focus clavier, homogène sur tous les contrôles de la page. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#735DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06131F]";

/** Surface de carte réutilisable (bordure fine + fond graphite). */
export const CARTE = "rounded-xl border";

/** Accent associé à chaque statut de demande. */
export const ACCENT_STATUT: Record<string, Accent> = {
  "Brouillon": "neutral",
  "À vérifier": "warning",
  "À corriger": "danger",
  "Complète": "blue",
  "Validée SPC": "success",
  "Convertie en mission": "violet",
  "Archivée": "neutral",
  "Annulée": "danger",
};

/** Accent d'un anneau de complétude selon son niveau. */
export function accentCompletude(pct: number): Accent {
  if (pct >= 100) return "success";
  if (pct >= 60) return "warning";
  return "blue";
}
