import type { Campagne, Prospect, Livrable, Alerte } from "./types";

export function calcJoursRestants(deadline: string): number {
  const [d, m, y] = deadline.split("/").map(Number);
  if (!d || !m || !y) return 0;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export const campagnes: Campagne[] = [
  {
    id: "idf-2026",
    nom: "IDF Complète 2026",
    perimetre: "Paris · Île-de-France · Paris-Saclay",
    deadline: "30/06/2026",
    joursRestants: calcJoursRestants("30/06/2026"),
    score: 9.4,
    statut: "Actif",
    nombreProspects: 43,
    tresChaudes: 14,
  },
  {
    id: "national-2026",
    nom: "National Écoles 2026",
    perimetre: "Lyon · Lille · Bordeaux · Marseille · Nancy",
    deadline: "08/07/2026",
    joursRestants: calcJoursRestants("08/07/2026"),
    score: 9.2,
    statut: "En cours",
    nombreProspects: 32,
    tresChaudes: 23,
  },
  {
    id: "saclay-2026",
    nom: "Paris-Saclay Juin 2026",
    perimetre: "Cluster Paris-Saclay · 29 cibles",
    deadline: "15/06/2026",
    joursRestants: calcJoursRestants("15/06/2026"),
    score: 9.1,
    statut: "Terminé",
    nombreProspects: 29,
    tresChaudes: 12,
  },
];

export const top10Prospects: Prospect[] = [
  { id: "1", nom: "EM Lyon", segment: "Commerce", cluster: "Lyon/RA", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Resp. examens / Dir. opér. acad.", canal: "Appel + Email", statut: "Non contacté", action: "Appel sortant →" },
  { id: "2", nom: "IFSI CHU Lyon", segment: "Santé", cluster: "Lyon/RA", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. institut / Coord. examens", canal: "Email + Appel", statut: "Non contacté", action: "Email J+1 →" },
  { id: "3", nom: "IFSI CHU Lille", segment: "Santé", cluster: "Lille/HdF", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. institut / Coord. examens", canal: "Email + Appel", statut: "En cours", action: "Relance J+3 →" },
  { id: "4", nom: "Kedge Bordeaux", segment: "Commerce", cluster: "Bordeaux/NA", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. campus / Resp. examens", canal: "Email réseau", statut: "Non contacté", action: "Email réseau →" },
  { id: "5", nom: "Skema Lille", segment: "Commerce", cluster: "Lille/HdF", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Resp. examens / Dir. opér.", canal: "Appel + Email", statut: "Non contacté", action: "Appel sortant →" },
  { id: "6", nom: "IFSI CHU Bordeaux", segment: "Santé", cluster: "Bordeaux/NA", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. institut / Resp. péda.", canal: "Email + Appel", statut: "Non contacté", action: "Email J+1 →" },
  { id: "7", nom: "ICN Nancy", segment: "Commerce", cluster: "Nancy/GE", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Resp. examens / Resp. concours", canal: "Appel + Email", statut: "Non contacté", action: "Appel sortant →" },
  { id: "8", nom: "Grenoble EM", segment: "Commerce", cluster: "Lyon/RA", scoreBANT: 10, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Coord. examens / Resp. concours", canal: "Appel + Email", statut: "RDV fixé", action: "Confirmer →" },
  { id: "9", nom: "CPGE Lyon", segment: "CPGE", cluster: "Lyon/RA", scoreBANT: 9.5, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. études prépa / Chef travaux", canal: "Email dir. études", statut: "Non contacté", action: "Email J+2 →" },
  { id: "10", nom: "CPGE Lille", segment: "CPGE", cluster: "Lille/HdF", scoreBANT: 9.5, niveau: "Très chaud", priorite: "A", vague: 1, interlocuteur: "Dir. études prépa / Chef travaux", canal: "Email dir. études", statut: "Non contacté", action: "Email J+2 →" },
];

export const livraisonIDF: Livrable[] = [
  { id: 1, nom: "Ciblage commercial", description: "Identification et priorisation des cibles A/B/C", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_ciblage.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 2, nom: "Qualification BANT", description: "Scoring Budget · Autorité · Besoin · Timing", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_qualification.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 3, nom: "Emails de prospection", description: "8 emails · Vague 1 (juin) + Vague 2 (sept.)", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_emails.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 4, nom: "Séquences LinkedIn", description: "8 séquences J+0 / J+3 / J+10", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_linkedin.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 5, nom: "Scripts d'appel", description: "3 scripts + tableau 6 objections", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_script-appel.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 6, nom: "Relances J+3 / J+7 / J+15", description: "14 prospects Très chaud · séquences par établissement", statut: "Validé", fichier: "prospects/2026-06-17_idf-complete-2026_relances.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 7, nom: "Deck commercial", description: "15 slides · SCQA · Audit gratuit CTA", statut: "Validé", fichier: "decks/2026-06-17_idf-complete-2026_deck.md", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
  { id: 8, nom: "Analytics J+30", description: "Rapport de performance · mi-juillet 2026", statut: "À rédiger", campagneId: "idf-2026", campagneNom: "IDF Complète 2026" },
];

export const alertes: Alerte[] = [
  { id: "a1", type: "rouge", titre: "Contacts manquants", description: "7 établissements sans interlocuteur nominatif identifié", count: 7 },
  { id: "a2", type: "orange", titre: "Relances J+7 dues", description: "2 établissements sans réponse depuis la vague 1", count: 2 },
  { id: "a3", type: "jaune", titre: "Analytics J+30 à prévoir", description: "3 campagnes en attente de rapport de performance", count: 3 },
];

export const echeances = [
  { date: "24/06", nom: "Relances CPGE Lyon", tag: "J+7" },
  { date: "26/06", nom: "Email IFSI CHU Bordeaux", tag: "J+3" },
  { date: "30/06", nom: "Fin Vague 1 IDF", tag: "Deadline", urgent: true },
  { date: "01/09", nom: "Lancement Vague 2", tag: "National" },
];

export const clusterScores = [
  { nom: "Lyon / Rhône-Alpes", score: 9.8 },
  { nom: "Paris IDF", score: 9.6 },
  { nom: "Lille / HdF", score: 9.5 },
  { nom: "Bordeaux / NA", score: 9.2 },
  { nom: "Marseille / PACA", score: 9.0 },
  { nom: "Nancy / Grand Est", score: 8.7 },
];

export const segmentRepartition = [
  { nom: "Business schools", count: 29, color: "#1a6b7e" },
  { nom: "CPGE", count: 9, color: "#4a90d9" },
  { nom: "Santé", count: 15, color: "#38a169" },
  { nom: "Universités", count: 22, color: "#805ad5" },
];
