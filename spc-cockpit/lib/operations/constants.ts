// Règles métier partagées du module Opérations — une seule source de vérité.

// Seuil d'heures planifiées au-delà duquel un surveillant est considéré en surcharge.
export const SEUIL_SURCHARGE_H = 100;

// Fenêtre (jours) de la tuile « Missions à venir » du dashboard.
export const FENETRE_MISSIONS_A_VENIR_J = 30;

// Délai (jours) avant session à partir duquel une confirmation devient « J-48 »
// (confirmation de session à obtenir 48 h avant l'épreuve).
export const DELAI_CONFIRMATION_J = 2;

// ---------------------------------------------------------------------------
// Salles — seuils d'occupation (en %) pilotant les niveaux de criticité.
// Le rouge est réservé à l'anomalie réelle : une salle pleine à 100 % SANS
// dépassement reste en vigilance (orange), pas en critique.
// ---------------------------------------------------------------------------

// À partir de ce taux d'occupation, la salle passe en vigilance (tension).
export const SEUIL_SALLE_VIGILANCE = 80;

// À partir de ce taux, la salle est en exploitation normale (en-dessous : faible).
export const SEUIL_SALLE_NORMALE = 60;

// Nombre d'étudiants couverts par un surveillant, utilisé pour estimer le
// besoin théorique d'une salle (KPI « surveillants requis »).
// Valeur par défaut : à paramétrer par organisation lorsque la table
// `organizations` portera ce réglage.
export const RATIO_ETUDIANTS_PAR_SURVEILLANT = 30;

// ---------------------------------------------------------------------------
// Demandes clients — pilotage du portefeuille avant mission.
// ---------------------------------------------------------------------------

// Nombre de jours restants avant la première épreuve en-deçà duquel une demande
// encore incomplète bascule en « urgente » (bandeau décisionnel + badge).
export const SEUIL_URGENCE_DEMANDE_J = 5;

// Valeur INDICATIVE d'un étudiant surveillé, en euros HT, utilisée uniquement
// pour pondérer le pipeline commercial des demandes (« potentiel HT »).
// ⚠ Ce n'est PAS un tarif de devis : aucun montant contractuel n'est calculé
// depuis une demande. Le devis reste produit après conversion en mission, par
// le moteur financier (lib/operations/engine), à partir des heures facturables.
export const VALEUR_INDICATIVE_ETUDIANT_EUR = 30;

// Objectif de conversion des demandes en missions (%), affiché en repère.
export const OBJECTIF_CONVERSION_DEMANDES = 60;

// Statuts de devis comptant dans le pipeline commercial (non encore gagnés).
export const STATUTS_PIPELINE = ["Brouillon", "Envoyé"] as const;

// Statuts de devis représentant du chiffre d'affaires confirmé.
export const STATUTS_CA_CONFIRME = ["Accepté", "Facturé"] as const;
