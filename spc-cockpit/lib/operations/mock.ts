import type { Surveillant, Mission, Affectation, Devis, Incident, Salle, Amenagement, Facture, DevisLigne } from "./types";

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
  { id: 5, reference: "EX-2026-041", client: "ICP Paris",    session: "Session principale",  dateMission: "2026-07-08", type: "Examen écrit", nbSalles: 6,  nbSurveillants: 14, montantHT: 4042, statut: "Planifiée" },
  { id: 4, reference: "EX-2026-040", client: "Dauphine PSL", session: "Partiels L3",         dateMission: "2026-05-26", type: "Examen écrit", nbSalles: 4,  nbSurveillants: 9,  montantHT: 2600, statut: "Terminée" },
  { id: 3, reference: "EX-2026-039", client: "Sciences Po",  session: "Concours écrit 2026", dateMission: "2026-05-23", type: "Examen écrit", nbSalles: 8,  nbSurveillants: 18, montantHT: 5200, statut: "Terminée" },
  { id: 2, reference: "EX-2026-038", client: "ESSEC",        session: "Rattrapages",         dateMission: "2026-05-20", type: "Examen écrit", nbSalles: 3,  nbSurveillants: 7,  montantHT: 1925, statut: "Terminée" },
  { id: 1, reference: "EX-2026-037", client: "HEC Paris",    session: "Partiels S2",         dateMission: "2026-05-15", type: "Examen écrit", nbSalles: 10, nbSurveillants: 22, montantHT: 6400, statut: "Terminée" },
];

// Affectations de la mission EX-2026-041 (id 5 dans mockMissions)
export const mockAffectations: Affectation[] = [
  { id: 1, missionId: 5, surveillantId: 1, roleMission: "Coordinatrice",      statut: "Confirmé", presence: "Présent", salle: "A21", matin: true,  matinDebut: "08:00", matinFin: "14:00", apm: false },
  { id: 2, missionId: 5, surveillantId: 2, roleMission: "Surveillant volant", statut: "Confirmé", presence: "Présent", salle: undefined, matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:00" },
  { id: 3, missionId: 5, surveillantId: 3, roleMission: "Surveillant salle",  statut: "Proposé",  presence: "En attente", salle: undefined, matin: false, apm: false },
  { id: 4, missionId: 5, surveillantId: 4, roleMission: "Surveillant PMR",    statut: "Confirmé", presence: "Présent", salle: "E31", matin: true, matinDebut: "08:30", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:30" },
  { id: 5, missionId: 5, surveillantId: 5, roleMission: "Coordinatrice",      statut: "Confirmé", presence: "Présent", salle: "AMP", matin: false, apm: true, apmDebut: "13:00", apmFin: "19:00" },
  { id: 6, missionId: 5, surveillantId: 6, roleMission: "Surveillant salle",  statut: "Confirmé", presence: "Présent", salle: "A22", matin: true, matinDebut: "08:30", matinFin: "13:30", apm: false },
  { id: 7, missionId: 5, surveillantId: 7, roleMission: "Surveillant volant", statut: "Proposé",  presence: "En attente", salle: undefined, matin: false, apm: false },
  { id: 8, missionId: 5, surveillantId: 8, roleMission: "Surveillant salle",  statut: "Proposé",  presence: "En attente", salle: undefined, matin: false, apm: false },
];

export const mockDevis: Devis[] = [
  { id: 1, reference: "SPC-20260514-001", client: "Sciences Po",  session: "Concours écrit 2026",           statut: "Accepté",   montantHT: 5200, montantTTC: 6240,   nbSurveillants: 18 },
  { id: 2, reference: "SPC-20260524-001", client: "ICP Paris",    session: "Session principale — mai 2026", statut: "Brouillon", montantHT: 4042, montantTTC: 4850.4, nbSurveillants: 14 },
  { id: 3, reference: "SPC-20260528-001", client: "Dauphine PSL", session: "Rattrapages juin 2026",         statut: "Envoyé",    montantHT: 2600, montantTTC: 3120,   nbSurveillants: 8 },
  { id: 4, reference: "SPC-20260605-001", client: "ICP Reims",    session: "Rattrapages juin 2026 — 74 créneaux · 262,3 h", statut: "Accepté", montantHT: 7344.4, montantTTC: 8813.28, nbSurveillants: 6 },
];

export const mockSalles: Salle[] = [
  { id: 1, nom: "Salle A21",          batiment: "Bâtiment A", etage: "2e étage",  capacite: 80,  etudiants: 75,  nbSurveillants: 2, pmr: false, tiersTemps: false },
  { id: 2, nom: "Salle A22",          batiment: "Bâtiment A", etage: "2e étage",  capacite: 80,  etudiants: 72,  nbSurveillants: 2, pmr: false, tiersTemps: false },
  { id: 3, nom: "Salle E31",          batiment: "Bâtiment E", etage: "3e étage",  capacite: 30,  etudiants: 8,   nbSurveillants: 2, pmr: true,  tiersTemps: true },
  { id: 4, nom: "Grand Amphithéâtre", batiment: "Bâtiment C", etage: "RDC",       capacite: 300, etudiants: 280, nbSurveillants: 8, pmr: false, tiersTemps: false },
  { id: 5, nom: "Salle B11",          batiment: "Bâtiment B", etage: "1er étage", capacite: 50,  etudiants: 44,  nbSurveillants: 2, pmr: false, tiersTemps: true },
];

export const mockAmenagements: Amenagement[] = [
  { id: 1, amenagement: "PMR — Fauteuil roulant",   salle: "E31", tiersTemps: true,  surveillant: "Thomas Girard" },
  { id: 2, amenagement: "Tiers-temps",              salle: "E31", tiersTemps: true,  surveillant: "Thomas Girard" },
  { id: 3, amenagement: "Tiers-temps + secrétaire", salle: "B11", tiersTemps: true,  surveillant: "Sophie Dubois" },
  { id: 4, amenagement: "PMR — Malvoyant",          salle: "E31", tiersTemps: false, surveillant: "Thomas Girard" },
];

export const mockFactures: Facture[] = [
  { id: 1, reference: "FA-2026-001", client: "Sciences Po",  session: "Concours écrit 2026",   statut: "Payée",    montantHT: 5200, montantTTC: 6240, emission: "2026-05-24", echeance: "2026-06-23" },
  { id: 2, reference: "FA-2026-002", client: "Dauphine PSL", session: "Partiels S4 — Gestion", statut: "Facturée", montantHT: 2600, montantTTC: 3120, emission: "2026-07-03", echeance: "2026-08-02" },
];

export const mockDevisLignes: DevisLigne[] = [
  { id: 1, devisId: 4, designation: "Surveillance rattrapages — semaine du 15 au 19 juin 2026 (35 créneaux, salles B11 TT/B13/B21/B22/B23)", quantite: 118.2, unite: "h", prixUnitaire: 28, ordre: 1 },
  { id: 2, devisId: 4, designation: "Surveillance rattrapages — semaine du 22 au 26 juin 2026 (39 créneaux, salles B11 TT/B12/B13/B21/B22/B23)", quantite: 144.1, unite: "h", prixUnitaire: 28, ordre: 2 },
  { id: 3, devisId: 1, designation: "Surveillance concours écrit 2026 — 8 salles · 18 surveillants · coordination incluse", quantite: 200, unite: "h", prixUnitaire: 26, ordre: 1 },
  { id: 4, devisId: 2, designation: "Surveillance session principale mai 2026 — 6 salles · 14 surveillants", quantite: 1, unite: "forfait", prixUnitaire: 4042, ordre: 1 },
  { id: 5, devisId: 3, designation: "Surveillance rattrapages juin 2026 — 4 salles · 8 surveillants", quantite: 1, unite: "forfait", prixUnitaire: 2600, ordre: 1 },
];

export const mockIncidents: Incident[] = [
  { id: 1, titre: "Fraude suspectée", salle: "A21", dateIncident: "2026-05-28", gravite: "critique", statut: "Ouvert", description: "Comportement suspect signalé par le surveillant de salle — rapport à valider sous 48h." },
];
