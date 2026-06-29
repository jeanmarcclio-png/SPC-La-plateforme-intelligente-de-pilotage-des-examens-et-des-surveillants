import type { TenantConfig } from "./types";

export const CONFIGS: Record<string, TenantConfig> = {

  examens: {
    secteur:  "examens",
    nom:      "Surveillance d'examens",
    emoji:    "🎓",
    couleur:  "#1a6b7e",
    vocabulaire: {
      mission:   "Campagne",
      ressource: "Établissement",
      pipeline:  "Pipeline",
      livrable:  "Livrable",
    },
    segments:   ["Commerce", "Santé", "CPGE", "Université"],
    clusters:   ["Lyon/RA", "Paris IDF", "Lille/HdF", "Bordeaux/NA", "Nancy/GE", "PACA"],
    segment_ca: { Commerce: 38, Santé: 32, CPGE: 20, Université: 48 },
    scoring: {
      labels:     ["Très chaud", "Chaud", "Tiède", "Froid"],
      dimensions: ["Budget", "Autorité", "Besoin", "Timing"],
    },
    interlocuteurs: ["Resp. examens", "Dir. scolarité", "Dir. opér. acad.", "Coord. examens"],
    risques:        ["Interlocuteur non nominatif", "Cycle décision long", "Prestataire sortant"],
    points_forts:   ["Tiers-temps non géré", "Réseau CHU x4", "Session semestrielle urgente"],
    email: {
      expediteur: "JMC <onboarding@resend.dev>",
      j0_sujet:   "JMC — Solution de surveillance d'examens pour votre établissement",
      j7_sujet:   "JMC — Audit gratuit 30 min pour votre direction des examens",
      j15_sujet:  "Dernière tentative — Surveillance d'examens JMC",
    },
  },

  conseil: {
    secteur:  "conseil",
    nom:      "Cabinet de conseil",
    emoji:    "💼",
    couleur:  "#2563eb",
    vocabulaire: {
      mission:   "Mission",
      ressource: "Client",
      pipeline:  "Affaires",
      livrable:  "Rapport",
    },
    segments:   ["Industrie", "Finance", "Digital", "RH", "Stratégie"],
    clusters:   ["Paris IDF", "Lyon/RA", "Bordeaux/NA", "Lille/HdF", "International"],
    segment_ca: { Industrie: 85, Finance: 120, Digital: 65, RH: 45, Stratégie: 95 },
    scoring: {
      labels:     ["Qualifié", "Intéressé", "À explorer", "Froid"],
      dimensions: ["Budget", "Décideur", "Besoin", "Urgence"],
    },
    interlocuteurs: ["DG", "DAF", "DRH", "DSI", "Dir. transformation"],
    risques:        ["Budget non validé", "Appel d'offres en cours", "Concurrent en place"],
    points_forts:   ["Transformation urgente", "ROI démontrable", "Équipe interne saturée"],
    email: {
      expediteur: "JMC Conseil <onboarding@resend.dev>",
      j0_sujet:   "JMC — Accompagnement conseil pour votre transformation",
      j7_sujet:   "JMC — Diagnostic gratuit 45 min pour votre direction",
      j15_sujet:  "Dernière tentative — Mission conseil JMC",
    },
  },

  securite: {
    secteur:  "securite",
    nom:      "Société de sécurité",
    emoji:    "🛡️",
    couleur:  "#dc2626",
    vocabulaire: {
      mission:   "Contrat",
      ressource: "Site",
      pipeline:  "Prospects",
      livrable:  "Main courante",
    },
    segments:   ["Retail", "Événementiel", "Entreprise", "Résidentiel", "Secteur public"],
    clusters:   ["Paris IDF", "Lyon/RA", "PACA", "Bordeaux/NA", "Lille/HdF"],
    segment_ca: { Retail: 28, Événementiel: 45, Entreprise: 72, Résidentiel: 18, "Secteur public": 55 },
    scoring: {
      labels:     ["Très chaud", "Chaud", "Tiède", "Froid"],
      dimensions: ["Budget", "Autorité", "Besoin", "Timing"],
    },
    interlocuteurs: ["Dir. sécurité", "Dir. opérations", "RSI", "Facility manager", "DG"],
    risques:        ["Contrat en cours chez concurrent", "Budget sécurité gelé", "Interlocuteur incertain"],
    points_forts:   ["Incident récent", "Renouvellement contrat imminent", "Extension de site"],
    email: {
      expediteur: "JMC Sécurité <onboarding@resend.dev>",
      j0_sujet:   "JMC — Solution de sécurité pour votre site",
      j7_sujet:   "JMC — Audit sécurité gratuit pour vos installations",
      j15_sujet:  "Dernière tentative — Sécurité JMC",
    },
  },

  btp: {
    secteur:  "btp",
    nom:      "BTP / Construction",
    emoji:    "🏗️",
    couleur:  "#d97706",
    vocabulaire: {
      mission:   "Chantier",
      ressource: "Client",
      pipeline:  "Affaires",
      livrable:  "Rapport de chantier",
    },
    segments:   ["Résidentiel", "Tertiaire", "Industrie", "Infrastructure", "Rénovation"],
    clusters:   ["Paris IDF", "Lyon/RA", "PACA", "Bordeaux/NA", "Grand Ouest"],
    segment_ca: { Résidentiel: 150, Tertiaire: 280, Industrie: 320, Infrastructure: 500, Rénovation: 90 },
    scoring: {
      labels:     ["Très chaud", "Chaud", "Tiède", "Froid"],
      dimensions: ["Budget", "Décideur", "Besoin", "Planning"],
    },
    interlocuteurs: ["MO / MOA", "Architecte", "Dir. travaux", "Conducteur travaux", "Acheteur"],
    risques:        ["Appel d'offres non lancé", "Budget non bouclé", "Concurrent retenu en cotraitance"],
    points_forts:   ["PC obtenu", "Démarrage imminent", "Référence chantier similaire"],
    email: {
      expediteur: "JMC BTP <onboarding@resend.dev>",
      j0_sujet:   "JMC — Solution BTP pour votre prochain chantier",
      j7_sujet:   "JMC — Visite terrain gratuite pour votre projet",
      j15_sujet:  "Dernière tentative — JMC BTP",
    },
  },

  rh: {
    secteur:  "rh",
    nom:      "RH / Intérim",
    emoji:    "👥",
    couleur:  "#7c3aed",
    vocabulaire: {
      mission:   "Commande",
      ressource: "Client",
      pipeline:  "Prospects",
      livrable:  "Contrat",
    },
    segments:   ["Industrie", "Logistique", "Tertiaire", "Santé", "IT"],
    clusters:   ["Paris IDF", "Lyon/RA", "Lille/HdF", "Bordeaux/NA", "Nantes/PL"],
    segment_ca: { Industrie: 55, Logistique: 42, Tertiaire: 38, Santé: 65, IT: 90 },
    scoring: {
      labels:     ["Très chaud", "Chaud", "Tiède", "Froid"],
      dimensions: ["Volume", "Décideur", "Besoin", "Urgence"],
    },
    interlocuteurs: ["DRH", "Resp. recrutement", "Dir. opérations", "Resp. paie", "DAF"],
    risques:        ["Accord-cadre en cours", "Prestataire exclusif", "Budget RH gelé"],
    points_forts:   ["Pic saisonnier imminent", "Turnover élevé", "Nouveau site à ouvrir"],
    email: {
      expediteur: "JMC RH <onboarding@resend.dev>",
      j0_sujet:   "JMC — Solution RH & intérim pour votre entreprise",
      j7_sujet:   "JMC — Audit RH gratuit pour vos besoins en personnel",
      j15_sujet:  "Dernière tentative — JMC RH",
    },
  },

};

export const SECTEURS_LISTE = Object.values(CONFIGS);
export const DEFAULT_CONFIG  = CONFIGS.examens;
