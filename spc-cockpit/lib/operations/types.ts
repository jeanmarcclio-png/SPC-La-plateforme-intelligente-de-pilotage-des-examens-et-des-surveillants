export type StatutSurveillant = "Disponible" | "Planifié" | "Annulé" | "Indisponible";
export type StatutMission = "Planifiée" | "En cours" | "Terminée" | "Annulée";
export type StatutDevis = "Brouillon" | "Envoyé" | "Accepté" | "Refusé" | "Facturé";
export type StatutIncident = "Ouvert" | "En cours" | "Résolu";

export interface Surveillant {
  id: number;
  nom: string;
  role: string;
  statut: StatutSurveillant;
  email?: string;
  telephone?: string;
  qualifications?: string;
  nbExamens: number;
  heures: number;
  note: number;
  tauxHoraire: number;
}

export interface Mission {
  id: number;
  reference: string;
  client: string;
  session?: string;
  dateMission?: string; // ISO yyyy-mm-dd
  type: string;
  nbSalles: number;
  nbSurveillants: number;
  montantHT: number;
  statut: StatutMission;
  notes?: string;
}

export interface Devis {
  id: number;
  reference: string;
  client: string;
  session?: string;
  statut: StatutDevis;
  montantHT: number;
  montantTTC: number;
  nbSurveillants: number;
  missionId?: number;
}

export interface Incident {
  id: number;
  titre: string;
  salle?: string;
  dateIncident?: string;
  gravite: "critique" | "majeur" | "mineur";
  statut: StatutIncident;
  description?: string;
  missionId?: number;
}
