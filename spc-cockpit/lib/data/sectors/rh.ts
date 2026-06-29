import type { SectorPack } from "./types";

export const rhPack: SectorPack = {
  id: "rh",
  dashboard: {
    headline: "142 candidats en vivier — 31 missions ouvertes",
    subline: "27 placements · 92% remplissage · 18 entreprises clientes",
    kpis: [
      { label: "Candidats", value: 142, icon: "👥", color: "bg-purple-100 text-purple-700", subtext: "vivier actif" },
      { label: "Missions ouvertes", value: 31, icon: "📋", color: "bg-indigo-100 text-indigo-700", subtext: "à pourvoir" },
      { label: "Entreprises", value: 18, icon: "🏢", color: "bg-violet-100 text-violet-700", subtext: "clientes" },
      { label: "Placements", value: 27, icon: "✅", color: "bg-green-100 text-green-700", subtext: "ce mois" },
      { label: "Remplissage", value: "92%", icon: "📊", color: "bg-blue-100 text-blue-700", subtext: "taux de couverture" },
      { label: "Urgences RH", value: 6, icon: "⚠️", color: "bg-red-100 text-red-700", subtext: "non pourvues <48h" },
    ],
    aiAlerts: [
      { level: "urgent", icon: "🔴", text: "3 missions non pourvues sous 48h — manutention et accueil événementiel" },
      { level: "warning", icon: "🟠", text: "Seulement 68% des besoins couverts en logistique — relancer candidats" },
      { level: "info", icon: "🟡", text: "Pic saisonnier juillet — anticiper vivier accueil et manutention" },
    ],
  },
  planning: {
    aiHint: "3 urgences à couvrir avant mercredi — prioriser les candidats manutention et accueil disponibles.",
    items: [
      { date: "30/06/2026", nom: "Entretiens candidats — Logistique", tag: "Recrutement", urgent: true },
      { date: "01/07/2026", nom: "Signature contrats — Carrefour ×4", tag: "Contrats" },
      { date: "02/07/2026", nom: "Visites entreprises — Nouveaux clients", tag: "Commercial" },
      { date: "03/07/2026", nom: "Intégrations — 6 nouveaux intérimaires", tag: "Intégration" },
      { date: "07/07/2026", nom: "Relances candidats inactifs", tag: "Vivier" },
    ],
  },
  livrables: [
    { nom: "Contrats de mission", description: "Contrats intérim et CDD par mission et salarié", icon: "📝" },
    { nom: "DPAE", description: "Déclarations préalables à l'embauche — à transmettre sous 24h", icon: "📤" },
    { nom: "Fiches de poste", description: "Descriptifs de poste par mission et entreprise cliente", icon: "📋" },
    { nom: "CV anonymisés", description: "Profils candidats conformes RGPD pour envoi client", icon: "👤" },
    { nom: "Comptes rendus placement", description: "Synthèse placement et évaluation à chaud", icon: "📊" },
  ],
  cockpit: {
    headline: "142 candidats en vivier — 92% remplissage missions",
    subline: "31 missions ouvertes · 6 urgences RH · 27 placements ce mois",
    forecast: "Si les 3 urgences logistique sont pourvues avant mercredi, le taux de remplissage dépasse 95%. Le pic juillet nécessite 20 candidats supplémentaires dans le vivier.",
    actions: ["Pourvoir urgences logistique", "Anticiper vivier juillet", "Relancer candidats inactifs"],
  },
};
