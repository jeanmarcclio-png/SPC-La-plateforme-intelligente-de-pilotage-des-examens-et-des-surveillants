// Jetons de la direction « Dark Navy Command Center + bandeaux blancs »
// (prompt PMR §20). Regroupés ici pour que les quatre panneaux de la page
// partagent exactement les mêmes valeurs.

export const PMR = {
  fondApp: "#071B30",
  fondPanneau: "#0B223A",
  fondPanneau2: "#0C2741",
  fondHover: "#102F4D",

  surfaceClaire: "#F8FAFC",
  surfaceClaireAlt: "#F5F7FA",
  bordureClaire: "#D8E0E8",

  texteClairPrimaire: "#111827",
  texteClairSecondaire: "#5F6B7A",

  texteSombrePrimaire: "#F8FAFC",
  texteSombreSecondaire: "#B7C2CF",
  texteSombreTertiaire: "#8FA0B2",
  bordureSombre: "rgba(255,255,255,0.10)",

  primaire: "#2563EB",
  primaireHover: "#1D4ED8",
  violet: "#5B4CF5",
  cyan: "#0EA5E9",
  turquoise: "#14B8A6",
  succes: "#10B981",
  alerte: "#F59E0B",
  critique: "#F43F5E",
  orange: "#F97316",
} as const;

/** Ombre des seules surfaces claires (§15). */
export const OMBRE_CLAIRE = "0 4px 14px rgba(2, 12, 27, 0.10), 0 1px 2px rgba(2, 12, 27, 0.06)";
