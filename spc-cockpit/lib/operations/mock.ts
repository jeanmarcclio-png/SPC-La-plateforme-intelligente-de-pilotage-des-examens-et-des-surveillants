import type { Surveillant, Mission, Devis, Incident } from "./types";

// Données de secours affichées tant que les tables Supabase (supabase-operations.sql)
// n'ont pas été créées — l'écran ne doit jamais être vide.
export const mockSurveillants: Surveillant[] = [
  { id: 1, nom: "Marie Lecomte",      role: "Coordinatrice",      statut: "Planifié",     qualifications: "Coordination · Tiers-temps", nbExamens: 12, heures: 94,  note: 4.9, tauxHoraire: 22 },
  { id: 2, nom: "Jean-Pierre Moreau", role: "Surveillant volant", statut: "Planifié",     qualifications: "Renforts",                    nbExamens: 8,  heures: 61,  note: 4.7, tauxHoraire: 18 },
  { id: 3, nom: "Fatima Benali",      role: "Surveillant salle",  statut: "Annulé",       qualifications: "Amphithéâtres",               nbExamens: 15, heures: 108, note: 4.8, tauxHoraire: 18 },
  { id: 4, nom: "Thomas Girard",      role: "Surveillant PMR",    statut: "Planifié",     qualifications: "PMR · Tiers-temps",           nbExamens: 6,  heures: 47,  note: 4.6, tauxHoraire: 19 },
  { id: 5, nom: "Sophie Dubois",      role: "Coordinatrice",      statut: "Planifié",     qualifications: "Coordination",                nbExamens: 10, heures: 78,  note: 5.0, tauxHoraire: 22 },
  { id: 6, nom: "Karim Haddad",       role: "Surveillant salle",  statut: "Disponible",   qualifications: "Salles multiples",            nbExamens: 9,  heures: 66,  note: 4.5, tauxHoraire: 18 },
  { id: 7, nom: "Léa Fontaine",       role: "Surveillant volant", statut: "Disponible",   qualifications: "Renforts · Concours",         nbExamens: 5,  heures: 38,  note: 4.8, tauxHoraire: 18 },
  { id: 8, nom: "Marc Petit",         role: "Surveillant salle",  statut: "Indisponible", qualifications: "",                            nbExamens: 7,  heures: 52,  note: 4.3, tauxHoraire: 18 },
];

export const mockMissions: Mission[] = [
  { id: 5, reference: "EX-2026-041", client: "ICP Paris",    session: "Session principale",  dateMission: "2026-07-08", nbSalles: 6,  nbSurveillants: 14, statut: "Planifiée" },
  { id: 4, reference: "EX-2026-040", client: "Dauphine PSL", session: "Partiels L3",         dateMission: "2026-05-26", nbSalles: 4,  nbSurveillants: 9,  statut: "Terminée" },
  { id: 3, reference: "EX-2026-039", client: "Sciences Po",  session: "Concours écrit 2026", dateMission: "2026-05-23", nbSalles: 8,  nbSurveillants: 18, statut: "Terminée" },
  { id: 2, reference: "EX-2026-038", client: "ESSEC",        session: "Rattrapages",         dateMission: "2026-05-20", nbSalles: 3,  nbSurveillants: 7,  statut: "Terminée" },
  { id: 1, reference: "EX-2026-037", client: "HEC Paris",    session: "Partiels S2",         dateMission: "2026-05-15", nbSalles: 10, nbSurveillants: 22, statut: "Terminée" },
];

export const mockDevis: Devis[] = [
  { id: 1, reference: "SPC-20260514-001", client: "Sciences Po",  session: "Concours écrit 2026",           statut: "Accepté",   montantHT: 5200, montantTTC: 6240,   nbSurveillants: 18 },
  { id: 2, reference: "SPC-20260524-001", client: "ICP Paris",    session: "Session principale — mai 2026", statut: "Brouillon", montantHT: 4042, montantTTC: 4850.4, nbSurveillants: 14 },
  { id: 3, reference: "SPC-20260528-001", client: "Dauphine PSL", session: "Rattrapages juin 2026",         statut: "Envoyé",    montantHT: 2600, montantTTC: 3120,   nbSurveillants: 8 },
];

export const mockIncidents: Incident[] = [
  { id: 1, titre: "Fraude suspectée", salle: "A21", dateIncident: "2026-05-28", gravite: "critique", statut: "Ouvert", description: "Comportement suspect signalé par le surveillant de salle — rapport à valider sous 48h." },
];
