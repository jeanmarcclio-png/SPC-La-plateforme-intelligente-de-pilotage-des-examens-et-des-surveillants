import type {
  JournalEntry, Surveillant, Mission, Affectation, Devis, Incident, Salle, Amenagement, Facture, DevisLigne, DevisSalle, DevisEquipe } from "./types";

// Données de secours affichées tant que les tables Supabase (supabase-operations.sql)
// n'ont pas été créées — l'écran ne doit jamais être vide.
//
// Jeu de démonstration calibré (référence dashboard « SPC Cockpit ») :
//  · mission active ICP Paris — 14 postes requis, 10 pourvus → couverture 71 % ;
//  · CA confirmé = 12 544,40 € HT / 15 053,28 € TTC (devis gagnés) ;
//  · historique mensuel en progression pour l'évolution du CA ;
//  · une surcharge et un incident critique ouverts pour les alertes.
export const mockSurveillants: Surveillant[] = [
  { id: 1, nom: "Marie Lecomte",      prenom: "Marie",      zone: "Paris 15e",  dispoMatin: "08:00–14:00", dispoApm: "Non",         role: "Coordinatrice",      statut: "Planifié",     qualifications: "Coordination · Tiers-temps", nbExamens: 12, heures: 94,  note: 4.9, tauxHoraire: 22 },
  { id: 2, nom: "Jean-Pierre Moreau", prenom: "Jean-Pierre", zone: "Saclay",    dispoMatin: "Oui",         dispoApm: "Oui",         role: "Surveillant volant", statut: "Planifié",     qualifications: "Renforts",                    nbExamens: 8,  heures: 61,  note: 4.7, tauxHoraire: 18 },
  { id: 3, nom: "Fatima Benali",      prenom: "Fatima",  zone: "Paris 12e", role: "Surveillant salle",  statut: "Planifié",     qualifications: "Amphithéâtres",               nbExamens: 15, heures: 108, note: 4.8, tauxHoraire: 18 },
  { id: 4, nom: "Thomas Girard",      prenom: "Thomas",  zone: "Saclay",    role: "Surveillant PMR",    statut: "Planifié",     qualifications: "PMR · Tiers-temps",           nbExamens: 6,  heures: 47,  note: 4.6, tauxHoraire: 19 },
  { id: 5, nom: "Sophie Dubois",      prenom: "Sophie",  zone: "Paris 7e",  role: "Coordinatrice",      statut: "Planifié",     qualifications: "Coordination",                nbExamens: 10, heures: 78,  note: 5.0, tauxHoraire: 22 },
  { id: 6, nom: "Karim Haddad",       prenom: "Karim",   zone: "Paris 5e",  role: "Surveillant salle",  statut: "Planifié",     qualifications: "Salles multiples",            nbExamens: 9,  heures: 66,  note: 4.5, tauxHoraire: 18 },
  { id: 7, nom: "Léa Fontaine",       prenom: "Léa",     zone: "Saclay",    role: "Surveillant volant", statut: "Planifié",     qualifications: "Renforts · Concours",         nbExamens: 5,  heures: 38,  note: 4.8, tauxHoraire: 18 },
  { id: 8, nom: "Marc Petit",         prenom: "Marc",    zone: "Paris 18e", role: "Surveillant salle",  statut: "Planifié",     qualifications: "Amphithéâtres",               nbExamens: 7,  heures: 52,  note: 4.3, tauxHoraire: 18 },
  { id: 9, nom: "Stanley Clio",       prenom: "Stanley", zone: "Paris 13e", role: "Surveillant salle",  statut: "Planifié",     qualifications: "Salles multiples · Concours",  nbExamens: 4,  heures: 41, note: 4.6, tauxHoraire: 18 },
  { id: 10, nom: "Jean-Marc Clio",    prenom: "Jean-Marc", zone: "Saclay",  role: "Surveillant salle",  statut: "Planifié",     qualifications: "Coordination · Tiers-temps",   nbExamens: 11, heures: 88, note: 4.9, tauxHoraire: 18 },
  { id: 11, nom: "Nadia Cherif",      prenom: "Nadia",   zone: "Paris 11e", dispoMatin: "Oui", dispoApm: "Oui", role: "Surveillant salle",  statut: "Disponible", qualifications: "Amphithéâtres",      nbExamens: 6, heures: 44, note: 4.7, tauxHoraire: 18 },
  { id: 12, nom: "Bruno Lefèvre",     prenom: "Bruno",   zone: "Paris 15e", dispoMatin: "Oui", dispoApm: "Non", role: "Surveillant volant", statut: "Disponible", qualifications: "Renforts",          nbExamens: 3, heures: 21, note: 4.4, tauxHoraire: 18 },
  { id: 13, nom: "Amina Traoré",      prenom: "Amina",   zone: "Saclay",    dispoMatin: "Oui", dispoApm: "Oui", role: "Surveillant salle",  statut: "Disponible", qualifications: "Salles multiples",  nbExamens: 5, heures: 33, note: 4.6, tauxHoraire: 18 },
  { id: 14, nom: "Paul Giraud",       prenom: "Paul",    zone: "Paris 14e", dispoMatin: "Non", dispoApm: "Oui", role: "Surveillant PMR",    statut: "Disponible", qualifications: "PMR · Tiers-temps", nbExamens: 4, heures: 28, note: 4.5, tauxHoraire: 19 },
  { id: 15, nom: "Chloé Martin",      prenom: "Chloé",   zone: "Paris 9e",  dispoMatin: "Oui", dispoApm: "Oui", role: "Coordinatrice",      statut: "Disponible", qualifications: "Coordination",      nbExamens: 8, heures: 57, note: 4.8, tauxHoraire: 22 },
];

export const mockMissions: Mission[] = [
  // ── Mission active + à venir (30 prochains jours) ─────────────────────────
  { id: 6,  reference: "EX-2026-041", client: "ICP Paris",            session: "Session principale", dateMission: "2026-07-30", type: "Examen écrit", nbSalles: 6,  nbSurveillants: 14, montantHT: 4042,   statut: "En cours" },
  { id: 7,  reference: "DC-2026-4242", client: "ICN",                 session: "Concours DC",        dateMission: "2026-07-31", type: "Concours",     nbSalles: 2,  nbSurveillants: 3,  montantHT: 650,    statut: "À chiffrer" },
  { id: 10, reference: "EX-2026-044", client: "Sorbonne Université",  session: "Partiels S2",        dateMission: "2026-08-01", type: "Examen écrit", nbSalles: 5,  nbSurveillants: 12, montantHT: 4200,   statut: "Planifiée" },
  { id: 11, reference: "EX-2026-045", client: "EDHEC",                session: "Rattrapages",        dateMission: "2026-08-01", type: "Examen écrit", nbSalles: 3,  nbSurveillants: 7,  montantHT: 1925,   statut: "Acceptée" },
  { id: 12, reference: "EX-2026-046", client: "Dauphine PSL",         session: "Oral admission",     dateMission: "2026-08-12", type: "Oral",         nbSalles: 2,  nbSurveillants: 5,  montantHT: 1500,   statut: "Planifiée" },
  { id: 14, reference: "EX-2026-047", client: "HEC Paris",            session: "Partiels (report)",  dateMission: "2026-08-24", type: "Examen écrit", nbSalles: 8,  nbSurveillants: 16, montantHT: 5100,   statut: "Acceptée" },
  { id: 15, reference: "EX-2026-048", client: "Sciences Po",          session: "Oral admission",     dateMission: "2026-08-28", type: "Oral",         nbSalles: 3,  nbSurveillants: 6,  montantHT: 1800,   statut: "Planifiée" },
  // ── Sessions récentes (terminées) ─────────────────────────────────────────
  { id: 19, reference: "EX-2026-043", client: "ICP Reims",            session: "Rattrapages S1",     dateMission: "2026-07-16", type: "Examen écrit", nbSalles: 5,  nbSurveillants: 5,  montantHT: 3672.2, statut: "Terminée" },
  { id: 9,  reference: "EX-2026-042", client: "ICP Reims",            session: "Rattrapages S2",     dateMission: "2026-07-10", type: "Examen écrit", nbSalles: 6,  nbSurveillants: 6,  montantHT: 3672.2, statut: "Terminée" },
  { id: 8,  reference: "EX-2026-040", client: "Dauphine PSL",         session: "Partiels L3",        dateMission: "2026-07-03", type: "Examen écrit", nbSalles: 4,  nbSurveillants: 9,  montantHT: 2600,   statut: "Terminée" },
  // ── Historique (évolution du CA HT — progression mensuelle) ────────────────
  { id: 5,  reference: "EX-2026-039", client: "Sciences Po",          session: "Concours écrit 2026", dateMission: "2026-06-18", type: "Concours",    nbSalles: 8,  nbSurveillants: 18, montantHT: 12000,  statut: "Terminée" },
  { id: 4,  reference: "EX-2026-038", client: "ESSEC",                session: "Concours 2026",      dateMission: "2026-05-20", type: "Concours",     nbSalles: 8,  nbSurveillants: 17, montantHT: 10400,  statut: "Terminée" },
  { id: 3,  reference: "EX-2026-037", client: "Audencia",             session: "Partiels S2",        dateMission: "2026-04-14", type: "Examen écrit", nbSalles: 7,  nbSurveillants: 15, montantHT: 9000,   statut: "Terminée" },
  { id: 2,  reference: "EX-2026-036", client: "Kedge BS",             session: "Concours écrit",     dateMission: "2026-03-18", type: "Concours",     nbSalles: 6,  nbSurveillants: 13, montantHT: 8100,   statut: "Terminée" },
  { id: 1,  reference: "EX-2026-035", client: "HEC Paris",            session: "Partiels S1",        dateMission: "2026-02-16", type: "Examen écrit", nbSalles: 8,  nbSurveillants: 18, montantHT: 7200,   statut: "Terminée" },
];

// Affectations de la mission active EX-2026-041 (ICP Paris · id 6) — jeu de
// référence : total exact 66,25 h sur 10 surveillants, couverture 10/14 (≈ 71 %).
// Créneaux multi-slots pour les surveillants enchaînant plusieurs examens
// (moteur = somme non chevauchante).
export const mockAffectations: Affectation[] = [
  { id: 1, missionId: 6, surveillantId: 1, roleMission: "Coordinatrice",      statut: "Confirmé", presence: "Présent", salle: "A21", matin: true,  matinDebut: "08:00", matinFin: "14:00", apm: false }, // 6.00
  { id: 2, missionId: 6, surveillantId: 2, roleMission: "Surveillant volant", statut: "Confirmé", presence: "Présent", salle: undefined, matin: true, matinDebut: "08:00", matinFin: "12:15", apm: true, apmDebut: "14:15", apmFin: "17:00" }, // 7.00 — volant, salle à confirmer
  { id: 3, missionId: 6, surveillantId: 3, roleMission: "Surveillant salle",  statut: "Confirmé", presence: "Présent", salle: "C14", matin: true, matinDebut: "09:15", matinFin: "12:00", apm: false }, // 2.75
  { id: 4, missionId: 6, surveillantId: 4, roleMission: "Surveillant PMR",    statut: "Confirmé", presence: "Présent", salle: "E31", matin: true, matinDebut: "08:30", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:30" }, // 9.50
  { id: 5, missionId: 6, surveillantId: 5, roleMission: "Coordinatrice",      statut: "Confirmé", presence: "Présent", salle: "AMP", matin: false, apm: true, apmDebut: "13:00", apmFin: "19:00" }, // 6.00
  { id: 6, missionId: 6, surveillantId: 6, roleMission: "Surveillant salle",  statut: "Confirmé", presence: "Présent", salle: "A22", matin: true, matinDebut: "08:30", matinFin: "13:30", apm: false }, // 5.00
  { id: 7, missionId: 6, surveillantId: 7, roleMission: "Surveillant volant", statut: "Confirmé", presence: "Présent", salle: undefined, matin: true, matinDebut: "10:00", matinFin: "13:00", apm: false }, // 3.00 — volant, salle à confirmer
  { id: 8, missionId: 6, surveillantId: 8, roleMission: "Surveillant salle",  statut: "Confirmé", presence: "Présent", salle: "F11", matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "13:15", apmFin: "17:30" }, // 9.25
  { id: 9, missionId: 6, surveillantId: 9, roleMission: "Surveillant salle",  statut: "Confirmé", presence: "Présent", salle: "F12", matin: true, matinDebut: "08:00", matinFin: "09:45", matinCreneaux: [{ debut: "08:00", fin: "09:45" }, { debut: "10:00", fin: "13:00" }], apm: true, apmDebut: "13:30", apmFin: "18:00" }, // 9.25
  { id: 10, missionId: 6, surveillantId: 10, roleMission: "Coordinateur",     statut: "Confirmé", presence: "Présent", salle: "E32", matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "14:30", apmFin: "18:00" }, // 8.50
];

// Devis — CA confirmé (Accepté) = 5 200 + 7 344,40 = 12 544,40 € HT /
// 6 240 + 8 813,28 = 15 053,28 € TTC. Ids 1 (Sciences Po) et 4 (ICP Reims)
// stables : l'équipe chiffrée (mockDevisEquipe) s'y rattache.
export const mockDevis: Devis[] = [
  { id: 5, reference: "SPC-20260729-001", client: "ICN",          session: "Concours DC 2026",              statut: "Brouillon", montantHT: 650,    montantTTC: 780,     nbSurveillants: 3,  coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
  { id: 4, reference: "SPC-20260728-001", client: "ICP Reims",    session: "Rattrapages juin 2026 — 74 créneaux · 262,3 h", statut: "Accepté", montantHT: 7344.4, montantTTC: 8813.28, nbSurveillants: 6, contact: "Mathilde Régnier — Pôle Scolarité", email: "scolarite.reims@icp.fr", ville: "Reims", typeEpreuve: "Rattrapage", dateDebut: "2026-06-15", dateFin: "2026-06-26", coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
  { id: 1, reference: "SPC-20260727-001", client: "Sciences Po",  session: "Concours écrit 2026",           statut: "Accepté",   montantHT: 5200,   montantTTC: 6240,    nbSurveillants: 18, coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
  { id: 3, reference: "SPC-20260726-001", client: "Dauphine PSL", session: "Oral admission 2026",           statut: "Envoyé",    montantHT: 2600,   montantTTC: 3120,    nbSurveillants: 5,  coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
  { id: 2, reference: "SPC-20260724-001", client: "ICP Paris",    session: "Session principale — juil. 2026", statut: "Brouillon", montantHT: 4042,   montantTTC: 4850.4,  nbSurveillants: 14, coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0 },
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
  { id: 2, reference: "FA-2026-002", client: "ICP Reims",    session: "Rattrapages juin 2026", statut: "Facturée", montantHT: 7344.4, montantTTC: 8813.28, emission: "2026-07-03", echeance: "2026-08-02" },
];

export const mockDevisLignes: DevisLigne[] = [
  { id: 1, devisId: 4, designation: "Surveillance rattrapages — semaine du 15 au 19 juin 2026 (35 créneaux, salles B11 TT/B13/B21/B22/B23)", quantite: 118.2, unite: "h", prixUnitaire: 28, ordre: 1 },
  { id: 2, devisId: 4, designation: "Surveillance rattrapages — semaine du 22 au 26 juin 2026 (39 créneaux, salles B11 TT/B12/B13/B21/B22/B23)", quantite: 144.1, unite: "h", prixUnitaire: 28, ordre: 2 },
  { id: 3, devisId: 1, designation: "Surveillance concours écrit 2026 — 8 salles · 18 surveillants · coordination incluse", quantite: 200, unite: "h", prixUnitaire: 26, ordre: 1 },
  { id: 4, devisId: 2, designation: "Surveillance session principale mai 2026 — 6 salles · 14 surveillants", quantite: 1, unite: "forfait", prixUnitaire: 4042, ordre: 1 },
  { id: 5, devisId: 3, designation: "Surveillance oral admission 2026 — 2 salles · 5 surveillants", quantite: 1, unite: "forfait", prixUnitaire: 2600, ordre: 1 },
];

export const mockDevisSalles: DevisSalle[] = [
  { id: 1, devisId: 4, session: "matin", salle: "B22", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "12:15", ordre: 1 },
  { id: 2, devisId: 4, session: "matin", salle: "B23", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "12:15", ordre: 2 },
  { id: 3, devisId: 4, session: "matin", salle: "B11 Tiers-temps", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: true, debut: "08:30", fin: "13:15", observations: "Durées majorées 1/3", ordre: 3 },
  { id: 4, devisId: 4, session: "matin", salle: "B21 Isolé", etudiants: 1, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "13:15", observations: "Candidat isolé", ordre: 4 },
  { id: 5, devisId: 4, session: "apres-midi", salle: "B22", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "13:30", fin: "16:15", ordre: 1 },
  { id: 6, devisId: 4, session: "apres-midi", salle: "B11 Tiers-temps", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: true, debut: "13:30", fin: "17:05", observations: "Durées majorées 1/3", ordre: 2 },
];

export const mockDevisEquipe: DevisEquipe[] = [
  { id: 1, devisId: 4, role: "Surveillant·e en salle — semaine du 15 au 19 juin", effectif: 5, heuresPers: 23.64, tauxH: 28, ordre: 1 },
  { id: 4, devisId: 4, role: "Surveillant·e en salle — semaine du 22 au 26 juin", effectif: 5, heuresPers: 28.82, tauxH: 28, ordre: 2 },
  { id: 2, devisId: 1, role: "Coordinateur·rice", effectif: 2, heuresPers: 10, tauxH: 35, ordre: 1 },
  { id: 3, devisId: 1, role: "Surveillant·e en salle", effectif: 16, heuresPers: 11.25, tauxH: 25, ordre: 2 },
];

export const mockIncidents: Incident[] = [
  { id: 1, titre: "Fraude suspectée", salle: "A21", dateIncident: "2026-05-28", gravite: "critique", statut: "Ouvert", description: "Comportement suspect signalé par le surveillant de salle — rapport à valider sous 48h." },
];

export const mockJournal: JournalEntry[] = [
  { id: 1, missionId: 1, utilisateur: "demo@spc.fr", objet: "Affectation — Marie Lecomte", ancienne: "sans salle · matin 08:00–13:00 · pas d'après-midi", nouvelle: "salle A21 · matin 08:00–14:00 · pas d'après-midi", createdAt: "2026-07-05T09:12:00Z" },
  { id: 2, missionId: 1, utilisateur: "demo@spc.fr", objet: "Affectation — Karim Osei", ancienne: null, nouvelle: "ajouté à la session (Surveillant salle)", createdAt: "2026-07-05T09:15:00Z" },
  { id: 3, missionId: 1, utilisateur: "demo@spc.fr", objet: "Statut de session — ICP Paris", ancienne: "Planifiée", nouvelle: "Validée", createdAt: "2026-07-06T17:40:00Z" },
];
