// Règles métier partagées du module Opérations — une seule source de vérité.

// Seuil d'heures planifiées au-delà duquel un surveillant est considéré en surcharge.
export const SEUIL_SURCHARGE_H = 100;

// Fenêtre (jours) de la tuile « Missions à venir » du dashboard.
export const FENETRE_MISSIONS_A_VENIR_J = 30;

// Délai (jours) avant session à partir duquel une confirmation devient « J-48 »
// (confirmation de session à obtenir 48 h avant l'épreuve).
export const DELAI_CONFIRMATION_J = 2;

// Statuts de devis comptant dans le pipeline commercial (non encore gagnés).
export const STATUTS_PIPELINE = ["Brouillon", "Envoyé"] as const;

// Statuts de devis représentant du chiffre d'affaires confirmé.
export const STATUTS_CA_CONFIRME = ["Accepté", "Facturé"] as const;
