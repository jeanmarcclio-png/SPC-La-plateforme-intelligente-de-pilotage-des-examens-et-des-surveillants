export type NiveauChaleur = "Très chaud" | "Chaud" | "Tiède" | "Froid";
export type StatutLivrable = "Validé" | "En cours" | "À rédiger" | "À renforcer";
export type Segment = "Commerce" | "CPGE" | "Santé" | "Université";
export type Vague = 1 | 2;

export interface Prospect {
  id: string;
  nom: string;
  segment: Segment;
  cluster: string;
  scoreBANT: number;
  niveau: NiveauChaleur;
  priorite: "A" | "B" | "C";
  vague: Vague;
  interlocuteur: string;
  canal: string;
  statut: "Non contacté" | "En cours" | "RDV fixé" | "Converti";
  action: string;
}

export interface ScoreBANT {
  budget: number;
  autorite: number;
  besoin: number;
  timing: number;
}

export interface Campagne {
  id: string;
  nom: string;
  perimetre: string;
  deadline: string;
  joursRestants: number;
  score: number;
  statut: "Actif" | "En cours" | "Terminé" | "Brouillon";
  nombreProspects: number;
  tresChaudes: number;
}

export interface Livrable {
  id: number;
  nom: string;
  description: string;
  statut: StatutLivrable;
  fichier?: string;
}

export interface Alerte {
  id: string;
  type: "rouge" | "orange" | "jaune";
  titre: string;
  description: string;
  count: number;
}
