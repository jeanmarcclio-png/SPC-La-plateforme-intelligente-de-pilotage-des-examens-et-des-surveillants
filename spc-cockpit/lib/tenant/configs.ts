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
      expediteur: "Survéo <onboarding@resend.dev>",
      j0_sujet:   "Survéo — Solution de surveillance d'examens pour votre établissement",
      j7_sujet:   "Survéo — Audit gratuit 30 min pour votre direction des examens",
      j15_sujet:  "Dernière tentative — Surveillance d'examens Survéo",
    },
  },

};

export const SECTEURS_LISTE = Object.values(CONFIGS);
export const DEFAULT_CONFIG  = CONFIGS.examens;
