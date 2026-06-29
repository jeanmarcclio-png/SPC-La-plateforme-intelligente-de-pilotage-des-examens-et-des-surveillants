import type { SectorPack } from "./types";

export const examensPack: SectorPack = {
  id: "examens",
  dashboard: {
    headline: "327 surveillances planifiées — IDF et régions",
    subline: "42 établissements actifs · 185 salles couvertes · 612 candidats",
    kpis: [
      { label: "Surveillances", value: 327, icon: "👁️", color: "bg-teal-100 text-teal-700", subtext: "sessions planifiées" },
      { label: "Établissements", value: 42, icon: "🏫", color: "bg-blue-100 text-blue-700", subtext: "sites actifs" },
      { label: "Salles", value: 185, icon: "🚪", color: "bg-indigo-100 text-indigo-700", subtext: "capacité totale" },
      { label: "Couverture", value: "98%", icon: "✅", color: "bg-green-100 text-green-700", subtext: "taux de présence" },
      { label: "Candidats", value: 612, icon: "🎓", color: "bg-purple-100 text-purple-700", subtext: "inscrits ce mois" },
      { label: "Remplacements", value: 4, icon: "⚠️", color: "bg-red-100 text-red-700", subtext: "urgents aujourd'hui" },
    ],
    aiAlerts: [
      { level: "urgent", icon: "🔴", text: "3 surveillants risquent dépassement horaire — Paris 8 et Dauphine" },
      { level: "urgent", icon: "🔴", text: "2 salles nécessitent un renfort avant 8h30 demain" },
      { level: "warning", icon: "🟠", text: "Couverture IDF 98% mais Reims sous tension — prévoir renforts" },
    ],
  },
  planning: {
    aiHint: "3 sessions critiques cette semaine — Dauphine, ICP et ESSCA à confirmer avant 17h.",
    items: [
      { date: "30/06/2026", nom: "Session examens — Paris Dauphine", tag: "Examens", urgent: true },
      { date: "01/07/2026", nom: "Surveillance ICP Paris", tag: "Examens" },
      { date: "02/07/2026", nom: "Session CESI — Tiers temps", tag: "Examens" },
      { date: "03/07/2026", nom: "IGS — Concours entrée", tag: "Examens" },
      { date: "07/07/2026", nom: "ESSCA — Session rattrapage", tag: "Examens" },
    ],
  },
  livrables: [
    { nom: "Convocations surveillants", description: "Lettres de mission + horaires par établissement", icon: "📄" },
    { nom: "Planning surveillants", description: "Attribution des salles et horaires de présence", icon: "📅" },
    { nom: "Répartition des salles", description: "Plan de salle par session et capacité PMR", icon: "🗺️" },
    { nom: "Rapports d'incidents", description: "Compte rendu par session — à valider sous 48h", icon: "⚠️" },
    { nom: "Feuilles d'émargement", description: "Signatures électroniques par salle et candidat", icon: "✍️" },
  ],
  cockpit: {
    headline: "Opérations sous contrôle — 327 surveillances planifiées",
    subline: "Taux de couverture 98% · 4 alertes RH actives · 42 établissements mobilisés",
    forecast: "Si les 3 remplacements urgents sont confirmés avant 17h, la couverture atteint 100% pour Paris. Reims reste à risque sans renfort supplémentaire.",
    actions: ["Confirmer remplacements Paris avant 17h", "Alerter DRH pour Reims", "Valider salles avec tiers-temps"],
  },
};
