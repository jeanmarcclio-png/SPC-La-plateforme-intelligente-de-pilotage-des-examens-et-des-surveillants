import type { SectorPack } from "./types";

export const securitePack: SectorPack = {
  id: "securite",
  dashboard: {
    headline: "214 agents déployés — 57 sites sous contrat",
    subline: "99,2% couverture · 18 rondes actives · 7 incidents traités",
    kpis: [
      { label: "Agents", value: 214, icon: "🛡️", color: "bg-red-100 text-red-700", subtext: "déployés" },
      { label: "Sites", value: 57, icon: "📍", color: "bg-orange-100 text-orange-700", subtext: "sous contrat" },
      { label: "Rondes", value: 18, icon: "🔄", color: "bg-yellow-100 text-yellow-700", subtext: "actives ce soir" },
      { label: "Couverture", value: "99,2%", icon: "✅", color: "bg-green-100 text-green-700", subtext: "taux de présence" },
      { label: "Incidents", value: 7, icon: "🚨", color: "bg-red-100 text-red-700", subtext: "traités ce mois" },
      { label: "Sites sensibles", value: 3, icon: "⚠️", color: "bg-orange-100 text-orange-700", subtext: "surveillance renforcée" },
    ],
    aiAlerts: [
      { level: "urgent", icon: "🔴", text: "2 sites nécessitent un renfort pour ce week-end — réponse avant 16h" },
      { level: "urgent", icon: "🔴", text: "La Défense sous-effectif nuit — 3 postes non pourvus jeudi-vendredi" },
      { level: "warning", icon: "🟠", text: "4 rondes non confirmées avant 20h — relancer agents concernés" },
    ],
  },
  planning: {
    aiHint: "Week-end chargé — confirmer les renforts avant 16h pour La Défense et Vélizy.",
    items: [
      { date: "30/06/2026", nom: "Rondes nocturnes — La Défense", tag: "Sécurité", urgent: true },
      { date: "01/07/2026", nom: "Astreinte week-end — Vélizy", tag: "Sécurité", urgent: true },
      { date: "02/07/2026", nom: "Contrôle accès — Siège Renault", tag: "Sécurité" },
      { date: "03/07/2026", nom: "Vacations événementiel — Bercy", tag: "Événement" },
      { date: "07/07/2026", nom: "Briefing mensuel agents", tag: "RH" },
    ],
  },
  livrables: [
    { nom: "Main courante", description: "Journal de bord par site — incidents et rondes", icon: "📓" },
    { nom: "Rapport d'incident", description: "Compte rendu détaillé avec photos et témoins", icon: "🚨" },
    { nom: "Consignes de sécurité", description: "Procédures par site et niveau de menace", icon: "📋" },
    { nom: "Planning équipes", description: "Rotation des agents par site et vacation", icon: "📅" },
    { nom: "Registre de sécurité", description: "Document réglementaire — contrôles et audits", icon: "📁" },
  ],
  cockpit: {
    headline: "214 agents mobilisés — couverture 99,2%",
    subline: "57 sites · 3 sites sensibles · 2 alertes renforts urgents",
    forecast: "Si les renforts La Défense sont confirmés avant 16h, la couverture week-end atteint 100%. Sans action, 3 postes resteront vacants vendredi nuit.",
    actions: ["Confirmer renforts La Défense", "Pourvoir postes nuit jeudi-vendredi", "Relancer rondes non confirmées"],
  },
};
