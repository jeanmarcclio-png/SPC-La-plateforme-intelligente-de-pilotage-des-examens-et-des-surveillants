import { genererReference } from "./logic";
import type { DemandeClient } from "./types";

// Jeu de démonstration du cockpit des demandes clients (MVP interne).
//
// Les dates sont ANCRÉES SUR LA DATE DU JOUR au moment du premier chargement :
// le portefeuille de démo reste cohérent (une échéance à J+2 réellement
// urgente, des mises à jour « il y a 2 h ») au lieu de périmer en quelques
// semaines. Une fois écrit dans le store, le jeu est figé comme des vraies
// données.

const MS_JOUR = 86_400_000;

function decale(now: Date, jours: number): Date {
  return new Date(now.getTime() + jours * MS_JOUR);
}

/** Date ISO (yyyy-mm-dd) décalée de `jours` par rapport à `now`. */
function jour(now: Date, jours: number): string {
  return decale(now, jours).toISOString().slice(0, 10);
}

/** Horodatage ISO complet décalé de `heures` par rapport à `now`. */
function instant(now: Date, heures: number): string {
  return new Date(now.getTime() + heures * 3_600_000).toISOString();
}

/**
 * Demandes de démonstration affichées au premier chargement, avant toute
 * saisie. Trois dossiers volontairement contrastés :
 *  1. ICP Paris — épreuve à J+2, dossier incomplet → urgente ;
 *  2. Dauphine PSL — dossier complet, validé SPC → prête à convertir ;
 *  3. ESSEC — brouillon quasi vide → à compléter.
 */
export function demandesDemo(now: Date = new Date()): DemandeClient[] {
  const refs: string[] = [];
  const ref = (dateISO: string) => {
    const r = genererReference(dateISO, refs);
    refs.push(r);
    return r;
  };

  const creationIcp = instant(now, -36);
  const creationDauphine = instant(now, -84);
  const creationEssec = instant(now, -30 * 24);

  return [
    {
      id: "dem-1",
      reference: ref(creationIcp),
      etablissement: "ICP Paris",
      campus: "Campus Bauer",
      ville: "Issy-les-Moulineaux",
      referenceClient: "ICP-2026-06",
      typeEtablissement: "Institut catholique",
      demandeur: { prenom: "Mathilde", nom: "Régnier", fonction: "Pôle Scolarité", email: "scolarite@icp.fr", telephone: "01 44 39 52 00" },
      responsableClient: { prenom: "Hélène", nom: "Duval", fonction: "Responsable des examens", email: "h.duval@icp.fr" },
      demandeurEstResponsable: false,
      responsableSpc: "Jean-Marc Clio",
      emailSpc: "jeanmarcclio@gmail.com",
      lignes: [
        // Seule ligne complète : salle, effectif et horaires connus.
        { id: "l1", date: jour(now, 2), creneau: "Matin", salle: "B22", batiment: "B", etudiants: 70, surveillants: 3, pmr: false, tiersTemps: false, debutExamen: "08:30", finExamen: "11:30", debutSurveillance: "08:00", finSurveillance: "12:00" },
        // Salle tiers-temps annoncée par le client mais pas encore attribuée.
        { id: "l2", date: jour(now, 2), creneau: "Matin", tiersTemps: true, observations: "Salle tiers-temps à confirmer (durée majorée 1/3)" },
        { id: "l3", date: jour(now, 4), creneau: "Après-midi", observations: "Salle et effectif en attente du client" },
      ],
      ttPresence: true,
      ttNombre: 12,
      ttSalles: "À confirmer",
      ttDuree: "Durée majorée 1/3",
      statut: "À vérifier",
      createdAt: creationIcp,
      updatedAt: instant(now, -2),
      historique: [
        { action: "Création demande", date: creationIcp, detail: "Saisie interne SPC" },
        { action: "Relance client", date: instant(now, -2), detail: "Salles et effectifs manquants" },
      ],
    },
    {
      id: "dem-2",
      reference: ref(creationDauphine),
      etablissement: "Dauphine PSL",
      campus: "Porte Dauphine",
      ville: "Paris 16e",
      demandeur: { prenom: "Karim", nom: "Haddad", fonction: "Scolarité L3", email: "karim.haddad@dauphine.psl.eu" },
      responsableClient: { prenom: "Karim", nom: "Haddad", fonction: "Scolarité L3", email: "karim.haddad@dauphine.psl.eu" },
      demandeurEstResponsable: true,
      responsableSpc: "Jean-Marc Clio",
      emailSpc: "jeanmarcclio@gmail.com",
      lignes: [
        { id: "l1", date: jour(now, 8), creneau: "Matin", salle: "Amphi A", batiment: "A", etudiants: 180, surveillants: 6, pmr: true, tiersTemps: false, debutExamen: "09:00", finExamen: "12:00", debutSurveillance: "08:30", finSurveillance: "12:30" },
      ],
      pmrPresence: true,
      pmrNombre: 3,
      pmrSalles: "Amphi A",
      pmrBesoin: "Accès de plain-pied, place réservée en bout de rangée",
      ttPresence: false,
      besoinsParticuliers: ["Contrôle d'identité", "Émargement", "Interdiction téléphone"],
      observations: "Épreuve écrite unique. Coordinateur SPC sur site 30 min avant ouverture.",
      statut: "Validée SPC",
      createdAt: creationDauphine,
      updatedAt: instant(now, -4),
      historique: [
        { action: "Création demande", date: creationDauphine },
        { action: "Validation SPC", date: instant(now, -4), detail: "Contrôles OK — prête à convertir" },
      ],
    },
    {
      id: "dem-3",
      reference: ref(creationEssec),
      etablissement: "ESSEC",
      demandeur: { prenom: "Sophie", nom: "Bernard", fonction: "Admissions" },
      responsableClient: { prenom: "", nom: "", email: "" },
      responsableSpc: "Jean-Marc Clio",
      lignes: [{ id: "l1", creneau: "Matin" }],
      statut: "Brouillon",
      createdAt: creationEssec,
      updatedAt: instant(now, -26),
      historique: [{ action: "Création demande", date: creationEssec, detail: "Prise de contact téléphonique" }],
    },
  ];
}
