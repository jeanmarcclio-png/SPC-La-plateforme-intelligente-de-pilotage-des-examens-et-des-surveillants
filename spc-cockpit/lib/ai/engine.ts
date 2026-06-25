import type { Prospect } from "@/lib/types";

export type Urgency = "critical" | "high" | "medium";
export type RiskLevel = "ok" | "warning" | "critical";

export interface Recommendation {
  prospect: Prospect;
  confidence: number;
  action: string;
  reasons: string[];
  urgency: Urgency;
}

export interface RiskSignal {
  level: RiskLevel;
  label: string;
  detail: string;
  icon: string;
}

export function computeRecommendations(prospects: Prospect[]): Recommendation[] {
  return prospects
    .filter((p) => p.statut !== "Converti")
    .map((p) => {
      let score = Math.min(p.scoreBANT * 8 + 15, 95);
      const reasons: string[] = [];

      if (p.niveau === "Très chaud") { score = Math.min(score + 10, 99); reasons.push(`Très chaud — intérêt fort confirmé`); }
      else if (p.niveau === "Chaud")  { score = Math.min(score + 5,  99); reasons.push(`Chaud — engagement récent`); }

      if (p.priorite === "A") { score = Math.min(score + 8, 99); reasons.push("Priorité A — cible stratégique"); }

      if (p.bant) {
        if (p.bant.besoin  >= 8) reasons.push(`Besoin fort (${p.bant.besoin}/10)`);
        if (p.bant.timing  >= 8) reasons.push(`Timing favorable (${p.bant.timing}/10)`);
        if (p.bant.budget  >= 7) reasons.push(`Budget probable (${p.bant.budget}/10)`);
        if (p.bant.autorite >= 8) reasons.push(`Décideur identifié (${p.bant.autorite}/10)`);
      }

      if (p.statut === "En cours") reasons.push("Discussion en cours — à relancer");
      if (p.statut === "RDV fixé") reasons.push("RDV confirmé");
      reasons.push(`Segment ${p.segment} — cible prioritaire SPC`);

      let action = "Contacter";
      let urgency: Urgency = "medium";
      if (p.statut === "Non contacté") { action = "Premier contact"; urgency = p.priorite === "A" ? "critical" : "high"; }
      else if (p.statut === "En cours") { action = "Relancer maintenant"; urgency = "high"; }
      else if (p.statut === "RDV fixé") { action = "Préparer le RDV"; urgency = "medium"; }

      return { prospect: p, confidence: Math.round(score), action, reasons: reasons.slice(0, 4), urgency };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function detectRisks(data: {
  prospects: Prospect[];
  totalAlertes: number;
  urgentEcheances: number;
}): RiskSignal[] {
  const { prospects, totalAlertes, urgentEcheances } = data;
  const total = prospects.length;
  const nonContacted = prospects.filter((p) => p.statut === "Non contacté").length;
  const convertis    = prospects.filter((p) => p.statut === "Converti").length;
  const contactRate  = total > 0 ? ((total - nonContacted) / total) * 100 : 0;
  const conversionRate = total > 0 ? (convertis / total) * 100 : 0;
  const scoreMoyen   = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;

  return [
    contactRate >= 70
      ? { level: "ok",       label: "Taux de contact",     detail: `${Math.round(contactRate)}% des prospects contactés`,     icon: "🟢" }
      : contactRate >= 40
      ? { level: "warning",  label: "Taux de contact",     detail: `${Math.round(contactRate)}% seulement — accélérer`,       icon: "🟠" }
      : { level: "critical", label: "Taux de contact",     detail: `${Math.round(contactRate)}% — campagne à relancer`,       icon: "🔴" },

    scoreMoyen >= 7
      ? { level: "ok",       label: "Qualité pipeline",    detail: `Score BANT moyen ${scoreMoyen.toFixed(1)}/10 — excellent`, icon: "🟢" }
      : scoreMoyen >= 5
      ? { level: "warning",  label: "Qualité pipeline",    detail: `Score ${scoreMoyen.toFixed(1)}/10 — qualification à renforcer`, icon: "🟠" }
      : { level: "critical", label: "Qualité pipeline",    detail: `Score ${scoreMoyen.toFixed(1)}/10 — pipeline faible`,    icon: "🔴" },

    conversionRate >= 15
      ? { level: "ok",       label: "Taux de conversion",  detail: `${Math.round(conversionRate)}% convertis — excellent`,   icon: "🟢" }
      : conversionRate >= 5
      ? { level: "warning",  label: "Taux de conversion",  detail: `${Math.round(conversionRate)}% — à améliorer`,           icon: "🟠" }
      : { level: "critical", label: "Taux de conversion",  detail: `${Math.round(conversionRate)}% — relancer la machine`,   icon: "🔴" },

    totalAlertes === 0
      ? { level: "ok",       label: "Alertes actives",     detail: "Aucune alerte — opérations sous contrôle",               icon: "🟢" }
      : totalAlertes <= 3
      ? { level: "warning",  label: "Alertes actives",     detail: `${totalAlertes} alertes en cours`,                       icon: "🟠" }
      : { level: "critical", label: "Alertes actives",     detail: `${totalAlertes} alertes — action requise`,               icon: "🔴" },

    urgentEcheances === 0
      ? { level: "ok",       label: "Échéances urgentes",  detail: "Planning sous contrôle",                                 icon: "🟢" }
      : urgentEcheances === 1
      ? { level: "warning",  label: "Échéances urgentes",  detail: `${urgentEcheances} deadline urgente à traiter`,          icon: "🟠" }
      : { level: "critical", label: "Échéances urgentes",  detail: `${urgentEcheances} deadlines urgentes`,                  icon: "🔴" },
  ];
}
