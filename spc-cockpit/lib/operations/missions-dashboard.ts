// Centre de pilotage « Missions » — SOURCE DE VÉRITÉ UNIQUE de tous les
// chiffres affichés sur /operations/missions.
//
// Règle non négociable : aucune valeur de la page n'est calculée dans un
// composant. KPI, bandeau de mission active, alertes, prochaines missions,
// répartition du CA et colonne « Avancement » du tableau dérivent tous des
// fonctions ci-dessous — c'est ce qui garantit qu'aucune contradiction n'est
// possible entre deux zones de l'écran (ex. « 14/14 » et « 2 manquants »).
//
// Toutes les fonctions sont PURES et testables (aucun accès réseau, aucune
// dépendance à l'heure système sauf via un paramètre explicite).

import type { Affectation, Devis, DevisSalle, Incident, Mission, StatutMission } from "./types";
import { analyseCouverture, type Couverture } from "./couverture";
import { MISSION_STATUTS, STATUTS_PLANIFIABLES, STATUTS_TERMINES } from "./mission-status";
import { joursAvant, prioriteAlerte, trierParPriorite, type NiveauAlerte } from "./alertes";
import { calculateRoomDurationMinutes } from "./engine/financial-engine";

// ---------------------------------------------------------------------------
// Dates — toujours en date locale (jamais toISOString, qui décale en UTC)
// ---------------------------------------------------------------------------

/** Date locale au format yyyy-mm-dd. */
export function isoDuJour(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const RANG = new Map<StatutMission, number>(MISSION_STATUTS.map((s, i) => [s, i]));

/** Position du statut dans le cycle de vie (Annulée exclue du raisonnement). */
function rang(statut: StatutMission): number {
  return RANG.get(statut) ?? 0;
}

function auMoins(statut: StatutMission, seuil: StatutMission): boolean {
  return statut !== "Annulée" && rang(statut) >= rang(seuil);
}

export function estTerminee(statut: StatutMission): boolean {
  return (STATUTS_TERMINES as StatutMission[]).includes(statut);
}

export function estEnCours(statut: StatutMission): boolean {
  return (STATUTS_PLANIFIABLES as StatutMission[]).includes(statut);
}

/** Mission ni terminée, ni annulée, ni encore engagée (Brouillon → Devis envoyé). */
export function estAVenir(statut: StatutMission): boolean {
  return statut !== "Annulée" && !estTerminee(statut) && !estEnCours(statut);
}

/**
 * Mission mise en avant dans le bandeau. Même règle que le shell Opérations
 * (sidebar) et que le Cockpit : la session engagée la plus avancée.
 */
export function selectionnerMissionActive(missions: Mission[]): Mission | undefined {
  return (
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée")
  );
}

// ---------------------------------------------------------------------------
// KPI — totaux et comparaison à l'année précédente (N-1)
// ---------------------------------------------------------------------------

export interface StatsMissions {
  total: number;
  enCours: number;
  terminees: number;
  caHT: number;
  /** Variation en fraction (0,085 = +8,5 %) ou null si N-1 n'a aucune donnée. */
  variation: {
    total: number | null;
    enCours: number | null;
    terminees: number | null;
    caHT: number | null;
  };
}

function variation(courant: number, precedent: number): number | null {
  if (precedent <= 0) return null; // pas d'antériorité → on masque, on n'invente pas
  return (courant - precedent) / precedent;
}

function agrege(missions: Mission[]) {
  return {
    total: missions.length,
    enCours: missions.filter((m) => estEnCours(m.statut)).length,
    terminees: missions.filter((m) => estTerminee(m.statut)).length,
    caHT: missions.filter((m) => m.statut !== "Annulée").reduce((s, m) => s + m.montantHT, 0),
  };
}

/**
 * KPI « toutes périodes » + comparaison année civile courante / précédente.
 * Une mission sans date ne compte dans aucune des deux années comparées mais
 * reste dans les totaux affichés.
 */
export function statsMissions(missions: Mission[], ref: Date = new Date()): StatsMissions {
  const global = agrege(missions);
  const anneeN = ref.getFullYear();
  const dansAnnee = (m: Mission, a: number) => !!m.dateMission && Number(m.dateMission.slice(0, 4)) === a;
  const courant = agrege(missions.filter((m) => dansAnnee(m, anneeN)));
  const precedent = agrege(missions.filter((m) => dansAnnee(m, anneeN - 1)));

  return {
    ...global,
    variation: {
      total: variation(courant.total, precedent.total),
      enCours: variation(courant.enCours, precedent.enCours),
      terminees: variation(courant.terminees, precedent.terminees),
      caHT: variation(courant.caHT, precedent.caHT),
    },
  };
}

const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export interface SerieMensuelle {
  labels: string[]; // "mai 26"
  total: number[];
  enCours: number[];
  terminees: number[];
  caHT: number[];
}

/**
 * Séries mensuelles réelles des `nbMois` derniers mois (mois courant inclus),
 * utilisées par les mini-graphiques des cartes KPI. Aucune donnée simulée :
 * un mois sans mission vaut 0.
 */
export function serieMensuelle(missions: Mission[], ref: Date = new Date(), nbMois = 8): SerieMensuelle {
  const cles: string[] = [];
  const labels: string[] = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    cles.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    labels.push(`${MOIS_COURT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`);
  }
  const vide = () => cles.map(() => 0);
  const serie: SerieMensuelle = { labels, total: vide(), enCours: vide(), terminees: vide(), caHT: vide() };

  for (const m of missions) {
    if (!m.dateMission || m.statut === "Annulée") continue;
    const i = cles.indexOf(m.dateMission.slice(0, 7));
    if (i < 0) continue;
    serie.total[i] += 1;
    if (estEnCours(m.statut)) serie.enCours[i] += 1;
    if (estTerminee(m.statut)) serie.terminees[i] += 1;
    serie.caHT[i] += m.montantHT;
  }
  return serie;
}

// ---------------------------------------------------------------------------
// Couverture, heures et candidats d'une mission
// ---------------------------------------------------------------------------

/** Affectations d'une mission disposant d'au moins un créneau horaire réel. */
export function affectationsAvecCreneau(affectations: Affectation[]): Affectation[] {
  return affectations.filter(
    (a) => a.matin || a.apm || !!a.matinCreneaux?.length || !!a.apmCreneaux?.length
  );
}

/**
 * Couverture surveillants = affectés (avec créneau) / requis.
 * Cas « aucun surveillant requis » explicitement géré par analyseCouverture.
 */
export function couvertureMission(mission: Mission, affectations: Affectation[]): Couverture {
  return analyseCouverture({
    requis: mission.nbSurveillants,
    affectes: affectationsAvecCreneau(affectations).length,
  });
}

/** Salles distinctes réellement affectées sur la mission. */
export function sallesAffectees(affectations: Affectation[]): number {
  return new Set(affectations.filter((a) => a.salle).map((a) => a.salle)).size;
}

function minutesCreneau(debut?: string, fin?: string): number {
  if (!debut || !fin) return 0;
  try {
    return calculateRoomDurationMinutes(debut, fin);
  } catch {
    return 0; // créneau invalide : signalé ailleurs, jamais compté en faux positif
  }
}

/**
 * Minutes planifiées d'une mission — somme de tous les créneaux affectés
 * (matin et après-midi restent indépendants, cf. moteur central).
 */
export function minutesPlanifiees(affectations: Affectation[]): number {
  let total = 0;
  for (const a of affectations) {
    const matin = a.matinCreneaux?.length
      ? a.matinCreneaux
      : a.matin
        ? [{ debut: a.matinDebut, fin: a.matinFin }]
        : [];
    const apm = a.apmCreneaux?.length
      ? a.apmCreneaux
      : a.apm
        ? [{ debut: a.apmDebut, fin: a.apmFin }]
        : [];
    for (const c of [...matin, ...apm]) total += minutesCreneau(c.debut, c.fin);
  }
  return total;
}

/** 2160 → "36h00" (format compact des cartes de pilotage). */
export function formatHeuresCompact(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/**
 * Candidats attendus, dérivés des salles du devis rattaché à la mission.
 * Matin et après-midi étant indépendants, on retient le pic de présence
 * (max des deux demi-journées) et non la somme, qui compterait deux fois
 * les mêmes candidats. Retourne null si aucun devis n'est rattaché.
 */
export function candidatsMission(
  mission: Mission,
  devis: Devis[],
  devisSalles: DevisSalle[]
): number | null {
  const ids = new Set(devis.filter((d) => d.missionId === mission.id).map((d) => d.id));
  if (ids.size === 0) return null;
  const lignes = devisSalles.filter((s) => ids.has(s.devisId));
  if (lignes.length === 0) return null;
  const somme = (p: DevisSalle["session"]) =>
    lignes.filter((l) => l.session === p).reduce((s, l) => s + (l.etudiants || 0), 0);
  return Math.max(somme("matin"), somme("apres-midi"));
}

// ---------------------------------------------------------------------------
// Avancement de préparation (4 axes × 25 points)
// ---------------------------------------------------------------------------
//   25 pts — devis accepté (ou mission engagée au-delà de « Acceptée »)
//   25 pts — couverture des surveillants (au prorata)
//   25 pts — salles configurées (au prorata)
//   25 pts — planning validé (statut « Validée » ou au-delà)
// Les deux axes mesurables sont proratisés : une mission à 12/14 surveillants
// n'est pas « à 0 » sur cet axe. La même fonction alimente l'anneau du bandeau
// ET la colonne « Avancement » du tableau : un seul chiffre, partout.

export const POIDS_PREPARATION = 25;

export interface EtapePreparation {
  cle: "devis" | "surveillants" | "salles" | "planning";
  label: string;
  fait: boolean;
  ratio: number; // 0–1
}

export interface PreparationMission {
  pourcentage: number; // 0–100
  etapes: EtapePreparation[];
}

export function preparationMission(input: {
  mission: Mission;
  affectations: Affectation[];
  devis: Devis[];
}): PreparationMission {
  const { mission, affectations, devis } = input;

  const devisAccepte =
    devis.some((d) => d.missionId === mission.id && (d.statut === "Accepté" || d.statut === "Facturé")) ||
    auMoins(mission.statut, "Acceptée");

  const couverture = couvertureMission(mission, affectations);
  const ratioSurveillants = Math.min(1, couverture.tauxCouverture);

  const salles = sallesAffectees(affectations);
  const ratioSalles = mission.nbSalles > 0 ? Math.min(1, salles / mission.nbSalles) : 1;

  const planningValide = auMoins(mission.statut, "Validée");

  const etapes: EtapePreparation[] = [
    { cle: "devis", label: devisAccepte ? "Devis accepté" : "Devis à valider", fait: devisAccepte, ratio: devisAccepte ? 1 : 0 },
    {
      cle: "surveillants",
      label: `Surveillants ${couverture.affectes}/${couverture.requis}`,
      fait: couverture.manque === 0,
      ratio: ratioSurveillants,
    },
    {
      cle: "salles",
      label: `Salles ${salles}/${mission.nbSalles}`,
      fait: mission.nbSalles > 0 ? salles >= mission.nbSalles : true,
      ratio: ratioSalles,
    },
    { cle: "planning", label: planningValide ? "Planning validé" : "Planning en cours", fait: planningValide, ratio: planningValide ? 1 : 0 },
  ];

  const pourcentage = Math.round(
    POIDS_PREPARATION * ((devisAccepte ? 1 : 0) + ratioSurveillants + ratioSalles + (planningValide ? 1 : 0))
  );

  return { pourcentage, etapes };
}

/**
 * Avancement affiché dans le tableau. Une mission clôturée est à 100 %,
 * une mission annulée à 0 %, les autres suivent la préparation ci-dessus.
 */
export function progressionMission(input: {
  mission: Mission;
  affectations: Affectation[];
  devis: Devis[];
}): number {
  if (input.mission.statut === "Annulée") return 0;
  if (estTerminee(input.mission.statut)) return 100;
  return preparationMission(input).pourcentage;
}

// ---------------------------------------------------------------------------
// Prochaines missions à venir
// ---------------------------------------------------------------------------

/**
 * Missions strictement à venir : jamais une session passée, jamais une session
 * terminée ou annulée. Comparaison en date locale (yyyy-mm-dd) : aucun décalage
 * de fuseau possible puisque la date de mission est une date sans heure.
 * La mission du jour reste affichée (elle n'est pas passée).
 */
export function prochainesMissions(missions: Mission[], todayISO: string, limite = 3): Mission[] {
  return missions
    .filter((m) => !!m.dateMission && m.dateMission >= todayISO)
    .filter((m) => m.statut !== "Annulée" && !estTerminee(m.statut))
    .sort((a, b) => (a.dateMission as string).localeCompare(b.dateMission as string))
    .slice(0, limite);
}

// ---------------------------------------------------------------------------
// Alertes et points d'attention
// ---------------------------------------------------------------------------

export interface AlerteMission {
  id: string;
  niveau: NiveauAlerte;
  titre: string;
  href: string;
  priorite: number;
}

/**
 * Alertes RÉELLES uniquement — chacune est dérivée d'un écart mesuré, jamais
 * décorative. Une même cause ne produit qu'une seule alerte (les manques de
 * chiffrage sont regroupés), et la priorité tient compte de l'imminence de la
 * session (cf. lib/operations/alertes.ts).
 */
export function alertesMissions(input: {
  missions: Mission[];
  affectations: Affectation[];
  incidents: Incident[];
  now?: Date;
}): AlerteMission[] {
  const { missions, affectations, incidents } = input;
  const now = input.now ?? new Date();
  const alertes: AlerteMission[] = [];

  for (const m of missions.filter((x) => estEnCours(x.statut))) {
    const affs = affectations.filter((a) => a.missionId === m.id);
    const j = joursAvant(m.dateMission, now);
    const couverture = couvertureMission(m, affs);

    if (couverture.manque > 0) {
      const niveau: NiveauAlerte =
        couverture.niveau === "sous-effectif" || (j != null && j >= 0 && j <= 7) ? "critique" : "avertissement";
      alertes.push({
        id: `couverture-${m.id}`,
        niveau,
        titre: `${couverture.manque} surveillant${couverture.manque > 1 ? "s" : ""} manquant${couverture.manque > 1 ? "s" : ""} sur ${m.client}${m.reference ? ` — ${m.reference}` : ""}`,
        href: "/operations/planification",
        priorite: prioriteAlerte(niveau, j),
      });
    }

    const salles = sallesAffectees(affs);
    if (affs.length > 0 && m.nbSalles > 0 && salles < m.nbSalles) {
      alertes.push({
        id: `salles-${m.id}`,
        niveau: "avertissement",
        titre: `${m.nbSalles - salles} salle${m.nbSalles - salles > 1 ? "s" : ""} à configurer sur ${m.client}`,
        href: "/operations/salles",
        priorite: prioriteAlerte("avertissement", j),
      });
    }

    if (j != null && j >= 0 && j <= 3 && !auMoins(m.statut, "Validée")) {
      alertes.push({
        id: `planning-${m.id}`,
        niveau: "critique",
        titre: `Planning non validé à J-${j} — ${m.client}`,
        href: "/operations/planification",
        priorite: prioriteAlerte("critique", j),
      });
    }
  }

  // Chiffrage : un seul signal regroupé, comme dans la maquette de référence.
  const aChiffrer = missions.filter((m) => m.statut === "À chiffrer" || m.statut === "Brouillon");
  if (aChiffrer.length > 0) {
    alertes.push({
      id: "devis-a-chiffrer",
      niveau: "avertissement",
      titre: `Devis à chiffrer pour ${aChiffrer.length} mission${aChiffrer.length > 1 ? "s" : ""}`,
      href: "/operations/devis",
      priorite: prioriteAlerte("avertissement", null),
    });
  }

  const enAttente = missions.filter((m) => m.statut === "Devis envoyé");
  if (enAttente.length > 0) {
    alertes.push({
      id: "devis-en-attente",
      niveau: "information",
      titre: `${enAttente.length} devis en attente de réponse client`,
      href: "/operations/devis",
      priorite: prioriteAlerte("information", null),
    });
  }

  const ouverts = incidents.filter((i) => i.statut !== "Résolu");
  if (ouverts.length > 0) {
    const critiques = ouverts.filter((i) => i.gravite === "critique").length;
    alertes.push({
      id: "incidents-ouverts",
      niveau: critiques > 0 ? "critique" : "avertissement",
      titre: `${ouverts.length} incident${ouverts.length > 1 ? "s" : ""} non résolu${ouverts.length > 1 ? "s" : ""}${critiques ? ` dont ${critiques} critique${critiques > 1 ? "s" : ""}` : ""}`,
      href: "/operations/incidents",
      priorite: prioriteAlerte(critiques > 0 ? "critique" : "avertissement", null),
    });
  }

  const sansDate = missions.filter((m) => estEnCours(m.statut) && !m.dateMission);
  if (sansDate.length > 0) {
    alertes.push({
      id: "missions-sans-date",
      niveau: "avertissement",
      titre: `${sansDate.length} mission${sansDate.length > 1 ? "s" : ""} engagée${sansDate.length > 1 ? "s" : ""} sans date de session`,
      href: "/operations/missions",
      priorite: prioriteAlerte("avertissement", null),
    });
  }

  return trierParPriorite(alertes);
}

// ---------------------------------------------------------------------------
// Répartition du chiffre d'affaires HT
// ---------------------------------------------------------------------------

export interface PartCA {
  cle: "terminees" | "enCours" | "aVenir";
  label: string;
  montant: number;
  part: number; // 0–1
}

export interface RepartitionCA {
  total: number;
  parts: PartCA[];
}

/**
 * Trois segments strictement disjoints dont la somme est EXACTEMENT le KPI
 * « CA total (HT) » : missions annulées exclues, aucun TTC, aucun double compte.
 */
export function repartitionCA(missions: Mission[]): RepartitionCA {
  const retenues = missions.filter((m) => m.statut !== "Annulée");
  const somme = (f: (m: Mission) => boolean) =>
    retenues.filter(f).reduce((s, m) => s + m.montantHT, 0);

  const terminees = somme((m) => estTerminee(m.statut));
  const enCours = somme((m) => estEnCours(m.statut));
  const aVenir = somme((m) => estAVenir(m.statut));
  const total = terminees + enCours + aVenir;
  const part = (v: number) => (total > 0 ? v / total : 0);

  return {
    total,
    parts: [
      { cle: "terminees", label: "Terminées", montant: terminees, part: part(terminees) },
      { cle: "enCours", label: "En cours", montant: enCours, part: part(enCours) },
      { cle: "aVenir", label: "À venir", montant: aVenir, part: part(aVenir) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Vue consolidée du bandeau « Mission active »
// ---------------------------------------------------------------------------

export interface VueMissionActive {
  mission: Mission;
  preparation: PreparationMission;
  couverture: Couverture;
  nbSalles: number;
  sallesAffectees: number;
  /** Lignes d'affectation enregistrées sur la mission (0 = non suivies). */
  affectationsSuivies: number;
  candidats: number | null;
  minutesPlanifiees: number;
  heuresLabel: string;
  montantHT: number;
  /** Origine du montant : devis rattaché accepté, ou estimation de la mission. */
  montantSource: "devis validé" | "estimation mission";
}

export function vueMissionActive(input: {
  mission: Mission;
  affectations: Affectation[];
  devis: Devis[];
  devisSalles: DevisSalle[];
}): VueMissionActive {
  const { mission, affectations, devis, devisSalles } = input;
  const affs = affectations.filter((a) => a.missionId === mission.id);
  const devisLie = devis.find(
    (d) => d.missionId === mission.id && (d.statut === "Accepté" || d.statut === "Facturé")
  );
  const minutes = minutesPlanifiees(affs);

  return {
    mission,
    preparation: preparationMission({ mission, affectations: affs, devis }),
    couverture: couvertureMission(mission, affs),
    nbSalles: mission.nbSalles,
    sallesAffectees: sallesAffectees(affs),
    affectationsSuivies: affs.length,
    candidats: candidatsMission(mission, devis, devisSalles),
    minutesPlanifiees: minutes,
    heuresLabel: formatHeuresCompact(minutes),
    montantHT: devisLie?.montantHT ?? mission.montantHT,
    montantSource: devisLie ? "devis validé" : "estimation mission",
  };
}

// ---------------------------------------------------------------------------
// Assemblage de la page
// ---------------------------------------------------------------------------

export interface LigneMission {
  mission: Mission;
  avancement: number; // 0–100
  surveillantsAffectes: number;
  /** Lignes d'affectation enregistrées : 0 = affectations non suivies pour
   *  cette mission (on affiche alors l'effectif requis, pas un « 0/9 »
   *  trompeur). */
  affectationsSuivies: number;
  candidats: number | null;
}

export interface VueMissions {
  todayISO: string;
  stats: StatsMissions;
  serie: SerieMensuelle;
  active: VueMissionActive | null;
  prochaines: Mission[];
  alertes: AlerteMission[];
  ca: RepartitionCA;
  lignes: LigneMission[];
}

/** Construit d'un seul tenant l'intégralité des chiffres de la page. */
export function construireVueMissions(input: {
  missions: Mission[];
  affectations: Affectation[];
  devis: Devis[];
  devisSalles: DevisSalle[];
  incidents: Incident[];
  now?: Date;
}): VueMissions {
  const { missions, affectations, devis, devisSalles, incidents } = input;
  const now = input.now ?? new Date();
  const active = selectionnerMissionActive(missions);

  return {
    todayISO: isoDuJour(now),
    stats: statsMissions(missions, now),
    serie: serieMensuelle(missions, now),
    active: active ? vueMissionActive({ mission: active, affectations, devis, devisSalles }) : null,
    prochaines: prochainesMissions(missions, isoDuJour(now)),
    alertes: alertesMissions({ missions, affectations, incidents, now }),
    ca: repartitionCA(missions),
    lignes: missions.map((mission) => {
      const affs = affectations.filter((a) => a.missionId === mission.id);
      return {
        mission,
        avancement: progressionMission({ mission, affectations: affs, devis }),
        surveillantsAffectes: affectationsAvecCreneau(affs).length,
        affectationsSuivies: affs.length,
        candidats: candidatsMission(mission, devis, devisSalles),
      };
    }),
  };
}
