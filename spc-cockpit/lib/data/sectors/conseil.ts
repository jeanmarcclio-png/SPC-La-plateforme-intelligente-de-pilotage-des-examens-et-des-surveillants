import type { SectorPack } from "./types";

export const conseilPack: SectorPack = {
  id: "conseil",
  dashboard: {
    headline: "18 missions actives — 6 clients en portefeuille",
    subline: "410k€ CA en cours · 84 jours vendus · 96% satisfaction clients",
    kpis: [
      { label: "Missions", value: 18, icon: "💼", color: "bg-blue-100 text-blue-700", subtext: "en cours" },
      { label: "Clients actifs", value: 6, icon: "🏢", color: "bg-indigo-100 text-indigo-700", subtext: "portefeuille" },
      { label: "Jours vendus", value: 84, icon: "📆", color: "bg-sky-100 text-sky-700", subtext: "ce trimestre" },
      { label: "Satisfaction", value: "96%", icon: "⭐", color: "bg-green-100 text-green-700", subtext: "NPS clients" },
      { label: "CA en cours", value: "410k€", icon: "💰", color: "bg-purple-100 text-purple-700", subtext: "estimé annuel" },
      { label: "Risques dérive", value: 2, icon: "⚠️", color: "bg-orange-100 text-orange-700", subtext: "missions à surveiller" },
    ],
    aiAlerts: [
      { level: "urgent", icon: "🔴", text: "TotalEnergies — risque dépassement budgétaire +18% · arbitrage requis" },
      { level: "warning", icon: "🟠", text: "Carrefour +14% charge non facturée — avenant à signer avant vendredi" },
      { level: "info", icon: "🟡", text: "CODIR vendredi — préparer restitution Roadmap transformation digitale" },
    ],
  },
  planning: {
    aiHint: "Restitution CODIR vendredi — préparer slides et synthèse exécutive avant jeudi 18h.",
    items: [
      { date: "30/06/2026", nom: "Comité stratégique — TotalEnergies", tag: "Mission", urgent: true },
      { date: "01/07/2026", nom: "Atelier Lean — Carrefour", tag: "Mission" },
      { date: "02/07/2026", nom: "Audit process — SNCF", tag: "Mission" },
      { date: "03/07/2026", nom: "Restitution Roadmap — Renault", tag: "Rapport" },
      { date: "07/07/2026", nom: "Kick-off — Nouveau client Decathlon", tag: "Mission" },
    ],
  },
  livrables: [
    { nom: "Audit organisationnel", description: "Diagnostic complet processus et structure", icon: "🔍" },
    { nom: "Diagnostic stratégique", description: "Analyse SWOT et positionnement concurrentiel", icon: "📊" },
    { nom: "Roadmap transformation", description: "Plan d'actions 12/24 mois avec jalons", icon: "🗺️" },
    { nom: "Plan d'action opérationnel", description: "Fiche action par chantier avec KPIs", icon: "📋" },
    { nom: "Présentation CODIR", description: "Slides exécutifs pour comité de direction", icon: "📈" },
  ],
  cockpit: {
    headline: "18 missions actives — portefeuille 410k€ CA",
    subline: "96% satisfaction · 2 risques dérive · CODIR vendredi",
    forecast: "Si l'avenant Carrefour est signé avant vendredi, le CA trimestriel dépasse l'objectif de 12%. TotalEnergies reste le risque principal à adresser en priorité.",
    actions: ["Arbitrage budget TotalEnergies", "Signer avenant Carrefour", "Préparer CODIR vendredi"],
  },
};
