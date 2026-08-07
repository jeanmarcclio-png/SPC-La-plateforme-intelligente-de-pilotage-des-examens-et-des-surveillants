import type { Surveillant } from "@/lib/operations/types";

// Statut d'accès au portail (dupliqué ici pour rester découplé du module
// server-only lib/supabase/portail.ts).
export type PortailStatut = "actif" | "invite" | "non_invite";

export interface CreneauLigne {
  periode: "matin" | "apm";
  debut?: string;
  fin?: string;
  salle?: string;
  missionRef?: string;
}

/** Surveillant enrichi pour l'affichage de la page (calculé côté serveur). */
export interface SurvRow extends Surveillant {
  portail: PortailStatut;
  missionClient: string | null; // client de la mission active si affecté
  heuresPlanifiees: number; // Σ heures des affectations posées
  creneaux: CreneauLigne[]; // détail pour l'onglet Planning
}
