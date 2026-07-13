// Score de santé d'une session (SPC · §21) — synthèse explicable qui agrège la
// couverture en surveillants, la rentabilité et les alertes de planning en un
// indicateur unique /100, assorti de recommandations concrètes. Fonction PURE.

export interface SanteInput {
  tauxCouverture: number; // 0–1 (surveillants affectés / requis)
  manqueSurveillants: number;
  tauxMarge: number; // 0–1 (peut être négatif)
  margeNiveau: "saine" | "surveiller" | "critique";
  nbAlertes: number; // alertes de planning bloquantes (salle/créneau/conflit)
}

export interface SanteSession {
  score: number; // 0–100
  niveau: "prête" | "à consolider" | "à risque";
  recommandations: string[];
  detail: { couverture: number; marge: number; alertes: number }; // points par axe
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Pondération : la couverture prime (on ne surveille pas sans effectif),
// puis les alertes bloquantes, puis la marge.
const POIDS_COUVERTURE = 40;
const POIDS_ALERTES = 35;
const POIDS_MARGE = 25;
const MARGE_CIBLE = 0.3; // 30 % de marge = plein score sur cet axe

export function scoreSanteSession(input: SanteInput): SanteSession {
  const couverture = POIDS_COUVERTURE * clamp01(input.tauxCouverture);
  const alertes = POIDS_ALERTES * clamp01(1 - Math.max(0, input.nbAlertes) / 5);
  const marge = POIDS_MARGE * clamp01(input.tauxMarge / MARGE_CIBLE);
  const score = Math.round(couverture + alertes + marge);

  const niveau: SanteSession["niveau"] = score >= 80 ? "prête" : score >= 55 ? "à consolider" : "à risque";

  const recommandations: string[] = [];
  if (input.manqueSurveillants > 0) {
    recommandations.push(`Mobiliser ${input.manqueSurveillants} surveillant${input.manqueSurveillants > 1 ? "s" : ""} supplémentaire${input.manqueSurveillants > 1 ? "s" : ""}`);
  }
  if (input.nbAlertes > 0) {
    recommandations.push(`Corriger ${input.nbAlertes} alerte${input.nbAlertes > 1 ? "s" : ""} de planning (salle / créneau / conflit)`);
  }
  if (input.margeNiveau === "critique") {
    recommandations.push("Vérifier la marge : coût des surveillants trop élevé face au CA");
  } else if (input.margeNiveau === "surveiller") {
    recommandations.push("Marge à surveiller — arbitrer les renforts si possible");
  }
  if (recommandations.length === 0) {
    recommandations.push("Session prête à valider — aucun point de blocage détecté");
  }

  return {
    score,
    niveau,
    recommandations,
    detail: { couverture: Math.round(couverture), marge: Math.round(marge), alertes: Math.round(alertes) },
  };
}
