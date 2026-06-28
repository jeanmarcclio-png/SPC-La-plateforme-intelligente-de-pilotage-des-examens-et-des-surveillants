export const STATUT_PROSPECT = ["Non contacté", "En cours", "RDV fixé", "Converti"] as const;
export type StatutProspect = typeof STATUT_PROSPECT[number];

export const NIVEAU_CHALEUR = ["Très chaud", "Chaud", "Tiède", "Froid"] as const;
export type NiveauChaleur = typeof NIVEAU_CHALEUR[number];

export const STATUT_LIVRABLE = ["À rédiger", "En cours", "Validé", "À renforcer"] as const;
export type StatutLivrable = typeof STATUT_LIVRABLE[number];

export const STATUT_CAMPAGNE = ["Actif", "En cours", "Terminé", "Archivé"] as const;
export type StatutCampagne = typeof STATUT_CAMPAGNE[number];

export const SEGMENTS = ["Commerce", "Santé", "CPGE", "Université"] as const;
export const CLUSTERS = ["Lyon/RA", "Paris IDF", "Lille/HdF", "Bordeaux/NA", "Nancy/GE", "PACA"] as const;

export const SEGMENT_CA: Record<string, number> = {
  Commerce: 38, Santé: 32, CPGE: 20, Université: 48,
};

export const COLONNES_PIPELINE: { key: StatutProspect; label: string; color: string }[] = [
  { key: "Non contacté", label: "Non contacté", color: "#a0aec0" },
  { key: "En cours",     label: "En cours",     color: "#4a90d9" },
  { key: "RDV fixé",     label: "RDV fixé",     color: "#d97706" },
  { key: "Converti",     label: "Converti",     color: "#38a169" },
];
