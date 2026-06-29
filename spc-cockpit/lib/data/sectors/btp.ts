import type { SectorPack } from "./types";

export const btpPack: SectorPack = {
  id: "btp",
  dashboard: {
    headline: "9 chantiers actifs — 148 compagnons mobilisés",
    subline: "8,4M€ budget · 12 chefs d'équipe · 2 alertes sécurité actives",
    kpis: [
      { label: "Chantiers", value: 9, icon: "🏗️", color: "bg-orange-100 text-orange-700", subtext: "en cours" },
      { label: "Compagnons", value: 148, icon: "👷", color: "bg-yellow-100 text-yellow-700", subtext: "mobilisés" },
      { label: "Chefs d'équipe", value: 12, icon: "🦺", color: "bg-amber-100 text-amber-700", subtext: "responsables" },
      { label: "Retards", value: 3, icon: "⏰", color: "bg-red-100 text-red-700", subtext: "chantiers décalés" },
      { label: "Budget", value: "8,4M€", icon: "💰", color: "bg-green-100 text-green-700", subtext: "engagé ce trimestre" },
      { label: "Alertes sécurité", value: 2, icon: "⛑️", color: "bg-red-100 text-red-700", subtext: "non levées" },
    ],
    aiAlerts: [
      { level: "urgent", icon: "🔴", text: "Chantier A (Vincennes) — retard 5 jours · pénalités contractuelles à risque" },
      { level: "warning", icon: "🟠", text: "Météo défavorable jeudi — risque dalle coulée A3 · décider avant 9h" },
      { level: "warning", icon: "🟠", text: "2 équipes à réaffecter pour gros œuvre — Chantier C sous-staffé" },
    ],
  },
  planning: {
    aiHint: "Décision dalle Chantier A3 avant 9h jeudi — météo critique et fenêtre de bétonnage à saisir.",
    items: [
      { date: "30/06/2026", nom: "Réunion chantier — Vincennes A", tag: "Chantier", urgent: true },
      { date: "01/07/2026", nom: "Livraison béton — Chantier C", tag: "Logistique" },
      { date: "02/07/2026", nom: "Contrôle sécurité — Tous sites", tag: "Sécurité" },
      { date: "03/07/2026", nom: "Réception partielle — Chantier B", tag: "Réception" },
      { date: "07/07/2026", nom: "Intervention sous-traitant électricité", tag: "Sous-traitance" },
    ],
  },
  livrables: [
    { nom: "PPSPS", description: "Plan particulier de sécurité et de protection de la santé", icon: "⛑️" },
    { nom: "DOE", description: "Dossier des ouvrages exécutés — document final client", icon: "📚" },
    { nom: "Plans d'exécution", description: "Plans visés par le bureau de contrôle", icon: "📐" },
    { nom: "Comptes rendus chantier", description: "CR hebdomadaire réunion de chantier", icon: "📋" },
    { nom: "PV de réception", description: "Procès-verbal de réception — levée des réserves", icon: "✅" },
  ],
  cockpit: {
    headline: "9 chantiers actifs — 8,4M€ engagés",
    subline: "148 compagnons · 3 retards · 2 alertes sécurité non levées",
    forecast: "Si les 2 équipes sont réaffectées au Chantier C cette semaine, le retard global peut être ramené à 2 jours. Sans action, les pénalités Vincennes s'appliqueront vendredi.",
    actions: ["Réaffecter équipes Chantier C", "Décision dalle A3 avant 9h", "Lever alertes sécurité"],
  },
};
