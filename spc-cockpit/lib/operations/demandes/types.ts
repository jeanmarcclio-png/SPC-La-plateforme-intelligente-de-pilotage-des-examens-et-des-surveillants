// Modèle de la « Demande client » (MVP interne SPC).
// Structure conçue pour mapper proprement vers une future table Supabase
// (étape 2 : portail client public). Aujourd'hui persistée côté client.

export type StatutDemande =
  | "Brouillon"
  | "À vérifier"
  | "Complète"
  | "À corriger"
  | "Validée SPC"
  | "Convertie en mission"
  | "Archivée"
  | "Annulée";

export interface ContactDemande {
  prenom: string;
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  service?: string;
}

/** Une ligne « salle × créneau » de la demande (matin et après-midi indépendants). */
export interface LigneSalleDemande {
  id: string;
  date?: string; // ISO yyyy-mm-dd
  creneau?: string; // "Matin" | "Après-midi" | libellé libre
  salle?: string;
  batiment?: string;
  etudiants?: number;
  surveillants?: number; // surveillants demandés
  pmr?: boolean;
  tiersTemps?: boolean;
  debutExamen?: string; // "HH:MM"
  finExamen?: string;
  debutSurveillance?: string; // sert au calcul des heures facturables APRÈS conversion
  finSurveillance?: string;
  observations?: string;
}

export interface HistoriqueEntree {
  action: string;
  date: string; // ISO
  detail?: string;
}

export interface DemandeClient {
  id: string;
  reference: string;

  // Établissement
  etablissement: string;
  campus?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  referenceClient?: string;
  typeEtablissement?: string;

  // Responsables
  demandeur: ContactDemande;
  responsableClient: ContactDemande;
  demandeurEstResponsable?: boolean;
  responsableSpc: string;
  emailSpc?: string;
  roleSpc?: string;

  // Salles & horaires
  lignes: LigneSalleDemande[];

  // Besoins spécifiques
  pmrPresence?: boolean;
  pmrNombre?: number;
  pmrSalles?: string;
  pmrBesoin?: string;
  ttPresence?: boolean;
  ttNombre?: number;
  ttSalles?: string;
  ttDuree?: string;
  besoinsParticuliers?: string[];

  observations?: string;

  // Cycle de vie
  statut: StatutDemande;
  createdAt: string;
  updatedAt: string;
  missionRef?: string; // renseigné après conversion

  historique: HistoriqueEntree[];
}
