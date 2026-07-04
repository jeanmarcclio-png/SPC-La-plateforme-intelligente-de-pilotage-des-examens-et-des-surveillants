// Règles métier partagées du module Opérations — une seule source de vérité.

// Seuil d'heures planifiées au-delà duquel un surveillant est considéré en surcharge.
export const SEUIL_SURCHARGE_H = 100;

// Statuts de devis comptant dans le pipeline commercial (non encore gagnés).
export const STATUTS_PIPELINE = ["Brouillon", "Envoyé"] as const;

// Statuts de devis représentant du chiffre d'affaires confirmé.
export const STATUTS_CA_CONFIRME = ["Accepté", "Facturé"] as const;
