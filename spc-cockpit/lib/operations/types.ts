export type StatutSurveillant = "Disponible" | "Planifié" | "Annulé" | "Indisponible";
export type StatutMission =
  | "Brouillon"
  | "À chiffrer"
  | "Devis envoyé"
  | "Acceptée"
  | "Planifiée"
  | "Validée"
  | "En cours"
  | "Terminée"
  | "Facturée"
  | "Archivée"
  | "Annulée";
export type StatutDevis = "Brouillon" | "Envoyé" | "Accepté" | "Refusé" | "Facturé";
export type StatutIncident = "Ouvert" | "En cours" | "Résolu";

export interface Surveillant {
  id: number;
  nom: string; // nom complet affiché (« Prénom Nom »)
  prenom?: string; // prénom structuré (optionnel)
  zone?: string; // secteur d'intervention
  dispoMatin?: string; // disponibilité matin (texte libre)
  dispoApm?: string; // disponibilité après-midi
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

export type Presence = "En attente" | "Présent" | "Absent";

/** Un créneau de surveillance : plage horaire "HH:MM"–"HH:MM". */
export interface Creneau {
  debut: string;
  fin: string;
}

export interface Affectation {
  id: number;
  missionId: number;
  surveillantId: number;
  roleMission?: string;
  statut: string;
  salle?: string;
  matin: boolean;
  matinDebut?: string; // "HH:MM" — 1er créneau du matin (compat)
  matinFin?: string;
  apm: boolean;
  apmDebut?: string;
  apmFin?: string;
  // Liste complète des créneaux d'une demi-journée (§29). Si absente, retomber
  // sur le créneau unique matin*/apm* ci-dessus.
  matinCreneaux?: Creneau[];
  apmCreneaux?: Creneau[];
  presence: Presence;
}

export interface Amenagement {
  id: number;
  amenagement: string;
  salle?: string;
  tiersTemps: boolean;
  surveillant?: string;
}

export interface DevisLigne {
  id: number;
  devisId: number;
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  ordre: number;
}

export type StatutFacture = "À facturer" | "Facturée" | "Payée" | "En retard";

export interface Facture {
  id: number;
  reference: string;
  client: string;
  session?: string;
  statut: StatutFacture;
  montantHT: number;
  montantTTC: number;
  emission?: string;
  echeance?: string;
  devisId?: number;
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
  contact?: string;
  email?: string;
  ville?: string;
  typeEpreuve?: string;
  dateDebut?: string; // ISO
  dateFin?: string;
  coefficient: number; // 1.00 = aucun ajustement
  fraisDeplacement: number;
  fraisCoordination: number;
  remise: number;
  createdAt?: string; // ISO complet — date de création (colonne created_at)
  /**
   * Horodatage du dernier changement de statut (colonne statut_change_at,
   * maintenue par trigger — cf. migration 31). Absent tant que la migration
   * n'est pas appliquée : le suivi retombe alors sur `createdAt`.
   */
  statutChangeAt?: string;
  /** Devis épinglé manuellement par l'équipe commerciale (colonne prioritaire). */
  prioritaire?: boolean;
}

export interface DevisEquipe {
  id: number;
  devisId: number;
  role: string;
  effectif: number;
  heuresPers: number;
  tauxH: number;
  ordre: number;
}

export interface DevisSalle {
  id: number;
  devisId: number;
  session: "matin" | "apres-midi";
  salle: string;
  etudiants: number;
  surveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
  debut?: string;
  fin?: string;
  observations?: string;
  ordre: number;
}

export interface Salle {
  id: number;
  nom: string;
  batiment?: string;
  etage?: string;
  capacite: number;
  etudiants: number;
  nbSurveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
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

export interface JournalEntry {
  id: number;
  missionId: number | null;
  utilisateur: string;
  objet: string;
  ancienne: string | null;
  nouvelle: string | null;
  createdAt: string; // ISO
}
