import type { Prospect, Campagne } from "@/lib/types";

export interface CampagneHealth {
  score: number;
  label: "Excellent" | "Bon" | "À surveiller" | "Critique";
  color: string;
  signals: { ok: boolean; text: string }[];
}

export interface ExecutiveSummary {
  headline: string;
  subline: string;
  forecast: string;
  actions: string[];
}

export function computeCampagneHealth(campagne: Campagne): CampagneHealth {
  const { score, tresChaudes, nombreProspects, joursRestants, statut } = campagne;
  let h = 0;
  const signals: { ok: boolean; text: string }[] = [];

  // BANT quality (40 pts)
  h += Math.min((score / 10) * 40, 40);
  signals.push({ ok: score >= 7, text: `Score BANT ${score}/10` });

  // Hot prospects ratio (30 pts)
  const hotRatio = nombreProspects > 0 ? (tresChaudes / nombreProspects) * 100 : 0;
  h += Math.min((hotRatio / 60) * 30, 30);
  signals.push({ ok: tresChaudes >= 5, text: `${tresChaudes}/${nombreProspects} "Très chaud"` });

  // Deadline (20 pts)
  const dPts = statut === "Terminé" ? 10 : joursRestants > 14 ? 20 : joursRestants > 7 ? 12 : joursRestants > 3 ? 6 : 2;
  h += dPts;
  signals.push({ ok: joursRestants > 7 || statut === "Terminé", text: statut === "Terminé" ? "Campagne terminée" : `J − ${joursRestants} avant deadline` });

  // Status (10 pts)
  h += statut === "Actif" ? 10 : statut === "En cours" ? 7 : 5;
  signals.push({ ok: statut === "Actif" || statut === "En cours", text: `Statut : ${statut}` });

  const rounded = Math.round(h);
  const label = rounded >= 80 ? "Excellent" : rounded >= 60 ? "Bon" : rounded >= 40 ? "À surveiller" : "Critique";
  const color = rounded >= 80 ? "#1a6b7e" : rounded >= 60 ? "#4a90d9" : rounded >= 40 ? "#f6ad55" : "#fc8181";
  return { score: rounded, label, color, signals };
}

export function generateExecutiveSummary(data: {
  prospects: Prospect[];
  campagnes: Campagne[];
  totalAlertes: number;
  urgentEcheances: number;
}): ExecutiveSummary {
  const { prospects, campagnes, totalAlertes, urgentEcheances } = data;
  const total        = prospects.length;
  const nonContactes = prospects.filter((p) => p.statut === "Non contacté").length;
  const convertis    = prospects.filter((p) => p.statut === "Converti").length;
  const enCours      = prospects.filter((p) => p.statut === "En cours").length;
  const tresChaudes  = prospects.filter((p) => p.niveau === "Très chaud").length;
  const campActives  = campagnes.filter((c) => c.statut === "Actif" || c.statut === "En cours").length;
  const contactRate  = total > 0 ? Math.round(((total - nonContactes) / total) * 100) : 0;
  const urgentCamp   = campagnes.find((c) => c.joursRestants <= 7 && c.joursRestants > 0 && c.statut !== "Terminé");

  let headline: string;
  let subline: string;
  if (contactRate < 40) {
    headline = "Pipeline à accélérer";
    subline  = `${nonContactes} prospects non contactés — taux de contact ${contactRate}% sous le seuil critique.`;
  } else if (tresChaudes >= 5) {
    headline = "Fenêtre d'opportunité ouverte";
    subline  = `${tresChaudes} prospects "Très chaud" actifs — priorité absolue au contact cette semaine.`;
  } else if (convertis > 0) {
    headline = "Conversions en cours";
    subline  = `${convertis} prospect${convertis > 1 ? "s" : ""} converti${convertis > 1 ? "s" : ""} · ${enCours} en discussion active.`;
  } else {
    headline = "Prospection en bonne voie";
    subline  = `${campActives} campagne${campActives > 1 ? "s" : ""} active${campActives > 1 ? "s" : ""} · ${total} établissements ciblés.`;
  }

  const forecast = urgentCamp
    ? `Campagne "${urgentCamp.nom}" arrive à échéance dans ${urgentCamp.joursRestants} jour${urgentCamp.joursRestants > 1 ? "s" : ""}. Accélérer les relances sur les ${tresChaudes} "Très chaud" non convertis.`
    : totalAlertes > 0
    ? `${totalAlertes} alertes actives à traiter. Pipeline global : ${contactRate}% de taux de contact.`
    : `Prochaine cible : taux de contact 80% et ${Math.max(3, Math.ceil(total * 0.15))} RDV qualifiés.`;

  const actions: string[] = [];
  if (nonContactes > 0) actions.push(`Contacter ${Math.min(nonContactes, 5)} prospects prioritaires`);
  if (enCours > 0)      actions.push(`Relancer ${enCours} prospect${enCours > 1 ? "s" : ""} en cours`);
  if (urgentEcheances > 0) actions.push(`Traiter ${urgentEcheances} deadline${urgentEcheances > 1 ? "s" : ""} urgente${urgentEcheances > 1 ? "s" : ""}`);
  if (totalAlertes > 0) actions.push(`Résoudre ${totalAlertes} alerte${totalAlertes > 1 ? "s" : ""}`);

  return { headline, subline, forecast, actions: actions.slice(0, 3) };
}

export type Urgency  = "critical" | "high" | "medium";
export type RiskLevel = "ok" | "warning" | "critical";

export interface Recommendation {
  prospect: Prospect;
  confidence: number;
  action: string;
  reasons: string[];
  urgency: Urgency;
  todayBoost: number;
  delayPenalty: number;
}

export interface RiskSignal {
  level: RiskLevel;
  label: string;
  detail: string;
  icon: string;
}

export interface ProactiveInsight {
  type: "critical" | "opportunity" | "info";
  icon: string;
  message: string;
  metric: string;
  href: string;
}

export function computeRecommendations(prospects: Prospect[]): Recommendation[] {
  return prospects
    .filter((p) => p.statut !== "Converti")
    .map((p) => {
      let score = Math.min(p.scoreBANT * 8 + 15, 95);
      const reasons: string[] = [];

      if (p.niveau === "Très chaud") { score = Math.min(score + 10, 99); reasons.push("Très chaud — intérêt fort confirmé"); }
      else if (p.niveau === "Chaud") { score = Math.min(score + 5,  99); reasons.push("Chaud — engagement récent"); }

      if (p.priorite === "A") { score = Math.min(score + 8, 99); reasons.push("Priorité A — cible stratégique"); }

      if (p.bant) {
        if (p.bant.besoin   >= 2.0) reasons.push(`Besoin fort (${p.bant.besoin}/2.5)`);
        if (p.bant.timing   >= 2.0) reasons.push(`Timing favorable (${p.bant.timing}/2.5)`);
        if (p.bant.budget   >= 1.75) reasons.push(`Budget probable (${p.bant.budget}/2.5)`);
        if (p.bant.autorite >= 2.0) reasons.push(`Décideur identifié (${p.bant.autorite}/2.5)`);
      }

      if (p.statut === "En cours") reasons.push("Discussion en cours — à relancer");
      if (p.statut === "RDV fixé") reasons.push("RDV confirmé");
      reasons.push(`Segment ${p.segment} — cible prioritaire SPC`);

      let action  = "Contacter";
      let urgency: Urgency = "medium";
      if      (p.statut === "Non contacté") { action = "Premier contact";   urgency = p.priorite === "A" ? "critical" : "high"; }
      else if (p.statut === "En cours")     { action = "Relancer maintenant"; urgency = "high"; }
      else if (p.statut === "RDV fixé")     { action = "Préparer le RDV";    urgency = "medium"; }

      const todayBoost    = p.niveau === "Très chaud" ? 11 : p.niveau === "Chaud" ? 7 : 4;
      const delayPenalty  = p.niveau === "Très chaud" ? -8 : p.niveau === "Chaud" ? -5 : -3;

      return {
        prospect:     p,
        confidence:   Math.round(score),
        action,
        reasons:      reasons.slice(0, 4),
        urgency,
        todayBoost,
        delayPenalty,
      };
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
  const total          = prospects.length;
  const nonContacted   = prospects.filter((p) => p.statut === "Non contacté").length;
  const convertis      = prospects.filter((p) => p.statut === "Converti").length;
  const contactRate    = total > 0 ? ((total - nonContacted) / total) * 100 : 0;
  const conversionRate = total > 0 ? (convertis / total) * 100 : 0;
  const scoreMoyen     = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;

  return [
    contactRate >= 70
      ? { level: "ok",       label: "Taux de contact",    detail: `${Math.round(contactRate)}% des prospects contactés`,          icon: "🟢" }
      : contactRate >= 40
      ? { level: "warning",  label: "Taux de contact",    detail: `${Math.round(contactRate)}% seulement — accélérer`,            icon: "🟠" }
      : { level: "critical", label: "Taux de contact",    detail: `${Math.round(contactRate)}% — campagne à relancer`,            icon: "🔴" },

    scoreMoyen >= 7
      ? { level: "ok",       label: "Qualité pipeline",   detail: `Score BANT moyen ${scoreMoyen.toFixed(1)}/10 — excellent`,     icon: "🟢" }
      : scoreMoyen >= 5
      ? { level: "warning",  label: "Qualité pipeline",   detail: `Score ${scoreMoyen.toFixed(1)}/10 — à renforcer`,             icon: "🟠" }
      : { level: "critical", label: "Qualité pipeline",   detail: `Score ${scoreMoyen.toFixed(1)}/10 — pipeline faible`,         icon: "🔴" },

    conversionRate >= 15
      ? { level: "ok",       label: "Taux de conversion", detail: `${Math.round(conversionRate)}% convertis — excellent`,        icon: "🟢" }
      : conversionRate >= 5
      ? { level: "warning",  label: "Taux de conversion", detail: `${Math.round(conversionRate)}% — à améliorer`,                icon: "🟠" }
      : { level: "critical", label: "Taux de conversion", detail: `${Math.round(conversionRate)}% — relancer la machine`,        icon: "🔴" },

    totalAlertes === 0
      ? { level: "ok",       label: "Alertes actives",    detail: "Aucune alerte — opérations sous contrôle",                    icon: "🟢" }
      : totalAlertes <= 3
      ? { level: "warning",  label: "Alertes actives",    detail: `${totalAlertes} alertes en cours`,                            icon: "🟠" }
      : { level: "critical", label: "Alertes actives",    detail: `${totalAlertes} alertes — action requise`,                    icon: "🔴" },

    urgentEcheances === 0
      ? { level: "ok",       label: "Échéances urgentes", detail: "Planning sous contrôle",                                      icon: "🟢" }
      : urgentEcheances === 1
      ? { level: "warning",  label: "Échéances urgentes", detail: `${urgentEcheances} deadline urgente à traiter`,               icon: "🟠" }
      : { level: "critical", label: "Échéances urgentes", detail: `${urgentEcheances} deadlines urgentes`,                       icon: "🔴" },
  ];
}

export function generateInsights(data: {
  prospects: Prospect[];
  campagnes: Pick<Campagne, "nom" | "statut" | "score" | "joursRestants">[];
  totalAlertes: number;
  urgentEcheances: number;
}): ProactiveInsight[] {
  const { prospects, campagnes, totalAlertes, urgentEcheances } = data;
  const insights: ProactiveInsight[] = [];

  const total        = prospects.length;
  const nonContactes = prospects.filter((p) => p.statut === "Non contacté").length;
  const enCours      = prospects.filter((p) => p.statut === "En cours").length;
  const convertis    = prospects.filter((p) => p.statut === "Converti").length;
  const tresChaudes  = prospects.filter((p) => p.niveau === "Très chaud").length;
  const convRate     = total > 0 ? (convertis / total) * 100 : 0;

  const hotUncontacted = prospects.filter((p) => p.statut === "Non contacté" && p.scoreBANT >= 7);

  if (hotUncontacted.length > 0) {
    const avgScore = (hotUncontacted.reduce((s, p) => s + p.scoreBANT, 0) / hotUncontacted.length).toFixed(1);
    insights.push({
      type:    "opportunity",
      icon:    "🚀",
      message: `${hotUncontacted.length} prospect${hotUncontacted.length > 1 ? "s" : ""} à fort potentiel non contacté${hotUncontacted.length > 1 ? "s" : ""}`,
      metric:  `Score BANT moyen ${avgScore}/10 — contacter maintenant`,
      href:    "/qualification",
    });
  }

  if (tresChaudes >= 2) {
    insights.push({
      type:    "opportunity",
      icon:    "🔥",
      message: `${tresChaudes} prospects "Très chaud" — fenêtre d'opportunité ouverte`,
      metric:  "Probabilité de conversion +11% si contact aujourd'hui",
      href:    "/qualification",
    });
  }

  if (enCours >= 3) {
    insights.push({
      type:    "critical",
      icon:    "⚠️",
      message: `${enCours} prospects en cours sans relance planifiée`,
      metric:  "Risque de perte d'intérêt — relancer cette semaine",
      href:    "/qualification",
    });
  }

  if (nonContactes > total * 0.5 && total > 5) {
    insights.push({
      type:    "critical",
      icon:    "📉",
      message: `${Math.round((nonContactes / total) * 100)}% du pipeline non contacté — campagne à accélérer`,
      metric:  `${nonContactes} établissements en attente de premier contact`,
      href:    "/qualification",
    });
  }

  if (convRate < 5 && total > 8) {
    insights.push({
      type:    "critical",
      icon:    "🎯",
      message: `Taux de conversion faible (${convRate.toFixed(0)}%) — qualifier davantage les leads`,
      metric:  `${convertis} convertis sur ${total} prospects`,
      href:    "/qualification",
    });
  }

  if (totalAlertes >= 4) {
    insights.push({
      type:    "critical",
      icon:    "🚨",
      message: `${totalAlertes} alertes critiques actives — action immédiate requise`,
      metric:  "Livrables et dossiers en retard",
      href:    "/livrables",
    });
  }

  if (urgentEcheances >= 2) {
    insights.push({
      type:    "critical",
      icon:    "⏰",
      message: `${urgentEcheances} deadlines urgentes cette semaine`,
      metric:  "Planning critique — vérifier le calendrier",
      href:    "/planning",
    });
  }

  const urgentCampagne = campagnes.find((c) => c.joursRestants <= 7 && c.joursRestants > 0 && c.statut !== "Terminé");
  if (urgentCampagne) {
    insights.push({
      type:    "critical",
      icon:    "📅",
      message: `Campagne "${urgentCampagne.nom}" se termine dans ${urgentCampagne.joursRestants} jour${urgentCampagne.joursRestants > 1 ? "s" : ""}`,
      metric:  "Accélérer les relances pour maximiser les conversions",
      href:    "/campagnes",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type:    "info",
      icon:    "✅",
      message: "Pipeline en bonne santé — continuez sur cette lancée",
      metric:  "Aucun risque critique détecté",
      href:    "/dashboard",
    });
  }

  return insights.slice(0, 3);
}
