// Agrégation du dashboard opérationnel SPC — SOURCE DE VÉRITÉ UNIQUE.
//
// Toutes les tuiles du dashboard (KPI, donut, risques, actions, sessions,
// charge, calendrier, finance, devis) dérivent de CE module, à partir des mêmes
// entrées (missions, surveillants, affectations, devis, incidents, équipe devis).
// Objectif §14.2 : le nombre de postes manquants est identique dans la KPI, le
// donut, les risques et les actions ; le CA confirmé = total des devis gagnés.
//
// Fonctions PURES et testables : on injecte `now` pour un rendu déterministe.

import type { Mission, Surveillant, Affectation, Devis, Incident, DevisEquipe, StatutMission } from "./types";
import { STATUTS_CA_CONFIRME } from "./constants";
import { FENETRE_MISSIONS_A_VENIR_J, DELAI_CONFIRMATION_J } from "./constants";
import { SEUIL_SURCHARGE_H } from "./constants";
import { couvertureSession, type EtatCouverture } from "./couverture";
import { analyseRentabilite } from "./rentabilite";
import { tendanceCA, type PointTendance } from "./stats";
import { joursAvant, prioriteAlerte } from "./alertes";

export type { EtatCouverture };
export { couvertureSession };

// ── Types de sortie ──────────────────────────────────────────────────────────

export interface DashboardFinancials {
  caConfirmeHT: number;
  caTTC: number;
  margeHT: number;
  tauxMarge: number; // 0–1
  variationCA: number | null; // % vs mois précédent (chiffre signé, ex. 18.2)
  evolutionMensuelle: PointTendance[];
  nbDevisConfirmes: number;
}


export interface StaffingCoverage {
  requis: number;
  pourvus: number;
  manquants: number;
  vacants: number;
  taux: number; // 0–1
  etat: EtatCouverture;
  missionLabel: string | null;
  missionHref: string;
  trend: { label: string; taux: number }[]; // couverture des dernières sessions datées
  /**
   * Titre honnête de la courbe (BUG-017). Le libellé fixe « ÉVOLUTION SUR
   * 7 JOURS » coiffait des points s'étalant du 14/04 au 30/07 — soit 3,5 mois :
   * `trend` retourne les 7 dernières sessions DATÉES, jamais 7 jours.
   */
  trendTitre: string;
  /** Période réellement couverte, ex. « 14/04 → 30/07 ». `null` si vide. */
  trendPeriode: string | null;
}

export interface UpcomingKpi {
  count: number; // missions planifiables dans la fenêtre
  histogram: number[]; // nombre de missions par tranche de la fenêtre
}

export type RiskTone = "critique" | "attention" | "info" | "accent";

export interface DashboardRisk {
  key: string;
  valeur: number;
  titre: string;
  instruction: string;
  ton: RiskTone;
  href: string;
}

export type ActionSeverite = "critique" | "important" | "suivre";

export interface DashboardAction {
  key: string;
  severite: ActionSeverite;
  titre: string;
  detail: string;
  href: string;
  priorite: number;
}

export interface SessionSummary {
  id: number;
  dateISO?: string;
  client: string;
  session?: string;
  reference: string;
  nbSalles: number;
  pourvus: number;
  requis: number;
  taux: number;
  etat: EtatCouverture;
  statut: StatutMission;
  /**
   * Situation de la session par rapport à aujourd'hui. Le tableau mêle sessions
   * passées et à venir (c'est voulu : la fenêtre de pilotage est centrée sur le
   * jour), mais il l'annonçait nulle part et sa colonne DATE n'était pas triée
   * — d'où la suite `30 juil · 12 août · 24 août · 01 août` relevée par l'audit
   * (BUG-018).
   */
  position: "passee" | "aujourdhui" | "avenir";
  /** « Aujourd'hui » · « Dans 3 j » · « Il y a 9 j ». */
  quand: string;
}

export interface WorkloadRow {
  id: number;
  nom: string;
  role: string;
  heures: number;
  statut: Surveillant["statut"];
  surcharge: boolean;
  part: number; // 0–1, part de l'échelle (max du groupe)
}

export interface CalendarDay {
  dateISO: string;
  weekday: string; // "LUN"
  dayNum: number;
  isToday: boolean;
  sessions: { client: string; nbSalles: number; nbSurv: number; taux: number; etat: EtatCouverture }[];
}

export interface QuoteSummary {
  id: number;
  client: string;
  reference: string;
  montantHT: number;
  statut: Devis["statut"];
}

export interface DashboardData {
  financials: DashboardFinancials;
  coverage: StaffingCoverage;
  upcoming: UpcomingKpi;
  risks: DashboardRisk[];
  actions: DashboardAction[];
  sessions: SessionSummary[];
  workload: WorkloadRow[];
  calendar: CalendarDay[];
  quotes: QuoteSummary[];
  missionsAVenir: number;
}

export interface DashboardInputs {
  missions: Mission[];
  surveillants: Surveillant[];
  affectations: Affectation[];
  devis: Devis[];
  incidents: Incident[];
  devisEquipe?: DevisEquipe[];
  now?: Date;
}

// ── Constantes internes ──────────────────────────────────────────────────────

const STATUTS_PLANIFIABLES: StatutMission[] = ["Acceptée", "Planifiée", "Validée", "En cours"];
const WEEKDAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mission active : En cours → Validée → Planifiée (aligné layout & cockpit). */
export function missionActive(missions: Mission[]): Mission | null {
  return (
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée") ??
    null
  );
}

// La couverture d'une session vient désormais du module `couverture` — source
// de vérité unique partagée par le dashboard, le cockpit, la planification, les
// missions et les salles (audit QA forensic V2, BUG-005).

// ── Finance ──────────────────────────────────────────────────────────────────

function heuresDevis(devisId: number, equipe: DevisEquipe[]): number {
  return equipe
    .filter((e) => e.devisId === devisId)
    .reduce((s, e) => s + Math.max(0, e.effectif) * Math.max(0, e.heuresPers), 0);
}

export function buildFinancials(
  devis: Devis[],
  missions: Mission[],
  surveillants: Surveillant[],
  equipe: DevisEquipe[],
  now: Date,
): DashboardFinancials {
  const confirmes = devis.filter((d) => (STATUTS_CA_CONFIRME as readonly string[]).includes(d.statut));
  const caConfirmeHT = confirmes.reduce((s, d) => s + d.montantHT, 0);
  const caTTC = confirmes.reduce((s, d) => s + d.montantTTC, 0);

  // Coût estimé des surveillants pour les devis gagnés : heures facturées du
  // devis (via l'équipe chiffrée) × taux horaire de revient moyen constaté.
  const tauxRevient =
    surveillants.length > 0
      ? surveillants.reduce((s, x) => s + (x.tauxHoraire || 0), 0) / surveillants.length
      : 0;
  const tauxFacturationMoyen = 26; // repli si l'équipe chiffrée est absente (h ≈ HT / taux)
  const lignes = confirmes.map((d) => {
    const heures = heuresDevis(d.id, equipe) || (tauxFacturationMoyen > 0 ? d.montantHT / tauxFacturationMoyen : 0);
    return { heures, tauxHoraire: tauxRevient };
  });
  const rent = analyseRentabilite({ caHT: caConfirmeHT, lignes });

  // Évolution du CA HT = CA mensuel RÉALISÉ (missions engagées et datées jusqu'à
  // aujourd'hui) — on exclut les projections futures et les brouillons pour ne
  // pas fausser la tendance récente.
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const missionsRealisees = missions.filter(
    (m) => m.dateMission && new Date(m.dateMission + "T00:00:00") <= nowDay && m.statut !== "Brouillon" && m.statut !== "À chiffrer",
  );
  const evolutionMensuelle = tendanceCA(missionsRealisees);
  const n = evolutionMensuelle.length;
  const dernier = evolutionMensuelle[n - 1];
  const precedent = evolutionMensuelle[n - 2];
  const variationCA =
    dernier && precedent && precedent.total > 0
      ? Math.round(((dernier.total - precedent.total) / precedent.total) * 1000) / 10
      : null;

  return {
    caConfirmeHT,
    caTTC,
    margeHT: rent.margeHT,
    tauxMarge: rent.tauxMarge,
    variationCA,
    evolutionMensuelle,
    nbDevisConfirmes: confirmes.length,
  };
}

// ── Couverture (mission active) ──────────────────────────────────────────────

export function buildCoverage(
  missions: Mission[],
  affectations: Affectation[],
  now: Date,
): StaffingCoverage {
  const active = missionActive(missions);
  const base = active ? couvertureSession(active, affectations) : { pourvus: 0, requis: 0, taux: 0, etat: "a-planifier" as EtatCouverture };
  const manquants = Math.max(0, base.requis - base.pourvus);

  // Tendance = couverture des dernières sessions à couverture RÉELLE (terminées
  // ou en cours, date ≤ aujourd'hui) — donnée réelle, pas décorative. On exclut
  // les sessions encore « à planifier » (couverture 0) qui fausseraient la courbe.
  const datees = missions
    .filter((m) => m.dateMission && new Date(m.dateMission + "T00:00:00") <= now)
    .map((m) => ({ m, c: couvertureSession(m, affectations) }))
    .filter((x) => x.c.etat !== "a-planifier")
    .sort((a, b) => (a.m.dateMission! < b.m.dateMission! ? -1 : 1))
    .slice(-7);
  const trend = datees.map(({ m, c }) => {
    const d = new Date(m.dateMission! + "T00:00:00");
    return { label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, taux: c.taux };
  });

  // Le titre est DÉRIVÉ de ce que la courbe montre réellement : autant de points
  // que de sessions retenues, et la période effectivement couverte (BUG-017).
  const trendTitre =
    trend.length === 0
      ? "Évolution de la couverture"
      : `${trend.length} dernière${trend.length > 1 ? "s" : ""} session${trend.length > 1 ? "s" : ""} datée${trend.length > 1 ? "s" : ""}`;
  const trendPeriode =
    trend.length === 0 ? null
    : trend.length === 1 ? trend[0].label
    : `${trend[0].label} → ${trend[trend.length - 1].label}`;

  return {
    requis: base.requis,
    pourvus: base.pourvus,
    manquants,
    vacants: 0,
    taux: base.requis > 0 ? base.pourvus / base.requis : 0,
    etat: base.etat,
    missionLabel: active ? `${active.client}${active.session ? " — " + active.session : ""}` : null,
    missionHref: "/operations/planification",
    trend,
    trendTitre,
    trendPeriode,
  };
}

// ── Missions à venir (KPI histogramme) ───────────────────────────────────────

export function buildUpcoming(missions: Mission[], now: Date): UpcomingKpi {
  const fenetre = FENETRE_MISSIONS_A_VENIR_J;
  const buckets = 8;
  const step = fenetre / buckets;
  const histogram = new Array(buckets).fill(0);
  let count = 0;
  for (const m of missions) {
    if (!STATUTS_PLANIFIABLES.includes(m.statut)) continue;
    const j = joursAvant(m.dateMission, now);
    if (j == null || j < 0 || j > fenetre) continue;
    count += 1;
    histogram[Math.min(buckets - 1, Math.floor(j / step))] += 1;
  }
  return { count, histogram };
}

// ── Risques ──────────────────────────────────────────────────────────────────

function conflitsPlanning(active: Mission | null, affectations: Affectation[]): number {
  if (!active) return 0;
  // Conflit = surveillant planifié (créneau) mais sans salle affectée.
  return affectations.filter((a) => a.missionId === active.id && (a.matin || a.apm) && !a.salle).length;
}

function confirmationsJ48(missions: Mission[], now: Date): number {
  return missions.filter((m) => {
    if (m.statut !== "Acceptée" && m.statut !== "Planifiée") return false;
    const j = joursAvant(m.dateMission, now);
    return j != null && j >= 0 && j <= DELAI_CONFIRMATION_J;
  }).length;
}

export function buildRisks(
  coverage: StaffingCoverage,
  missions: Mission[],
  affectations: Affectation[],
  incidents: Incident[],
  now: Date,
): DashboardRisk[] {
  const active = missionActive(missions);
  const conflits = conflitsPlanning(active, affectations);
  const j48 = confirmationsJ48(missions, now);
  const incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu").length;

  return [
    {
      key: "postes",
      valeur: coverage.manquants,
      titre: coverage.manquants > 1 ? "Postes non pourvus" : "Poste non pourvu",
      instruction: "À pourvoir rapidement",
      ton: coverage.manquants > 0 ? "critique" : "info",
      href: "/operations/planification",
    },
    {
      key: "j48",
      valeur: j48,
      titre: "Confirmations J-48",
      instruction: "En attente",
      ton: j48 > 0 ? "attention" : "info",
      href: "/operations/missions",
    },
    {
      key: "conflits",
      valeur: conflits,
      titre: conflits > 1 ? "Conflits détectés" : "Conflit détecté",
      instruction: "À résoudre",
      ton: conflits > 0 ? "info" : "info",
      href: "/operations/planification",
    },
    {
      key: "incidents",
      valeur: incidentsOuverts,
      titre: incidentsOuverts > 1 ? "Incidents ouverts" : "Incident ouvert",
      instruction: "À traiter",
      ton: incidentsOuverts > 0 ? "accent" : "info",
      href: "/operations/incidents",
    },
  ];
}

// ── Actions immédiates (priorisées §23) ──────────────────────────────────────

export function buildActions(
  coverage: StaffingCoverage,
  missions: Mission[],
  affectations: Affectation[],
  incidents: Incident[],
  devis: Devis[],
  now: Date,
): DashboardAction[] {
  const active = missionActive(missions);
  const actions: DashboardAction[] = [];
  const activeLabel = active
    ? `${active.client}${active.dateMission ? " — " + new Date(active.dateMission + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}`
    : "";

  if (coverage.manquants > 0) {
    actions.push({
      key: "pourvoir",
      severite: "critique",
      titre: `Pourvoir ${coverage.manquants} poste${coverage.manquants > 1 ? "s" : ""} manquant${coverage.manquants > 1 ? "s" : ""}`,
      detail: activeLabel || "Mission active",
      href: "/operations/planification",
      priorite: prioriteAlerte("critique", joursAvant(active?.dateMission, now)),
    });
  }

  const j48 = confirmationsJ48(missions, now);
  if (j48 > 0) {
    actions.push({
      key: "j48",
      severite: "important",
      titre: `${j48} confirmation${j48 > 1 ? "s" : ""} J-48 en attente`,
      detail: "À envoyer aujourd'hui",
      href: "/operations/missions",
      priorite: prioriteAlerte("avertissement", 0),
    });
  }

  const conflits = conflitsPlanning(active, affectations);
  if (conflits > 0) {
    actions.push({
      key: "conflits",
      severite: "important",
      titre: `${conflits} conflit${conflits > 1 ? "s" : ""} de planning`,
      detail: "À examiner et résoudre",
      href: "/operations/planification",
      priorite: prioriteAlerte("avertissement", null) - 1,
    });
  }

  for (const inc of incidents.filter((i) => i.statut !== "Résolu")) {
    const crit = inc.gravite === "critique";
    actions.push({
      key: `incident-${inc.id}`,
      severite: crit ? "critique" : "important",
      titre: crit ? "Incident critique ouvert" : "Incident ouvert",
      detail: `${inc.salle ? "Salle " + inc.salle + " — " : ""}${inc.dateIncident ? new Date(inc.dateIncident + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : inc.titre}`,
      href: "/operations/incidents",
      priorite: prioriteAlerte(crit ? "critique" : "avertissement", joursAvant(inc.dateIncident, now)) - 2,
    });
  }

  for (const d of devis.filter((x) => x.statut === "Envoyé")) {
    actions.push({
      key: `devis-${d.id}`,
      severite: "suivre",
      titre: "Devis en attente de réponse",
      detail: `${d.client} — ${d.montantHT.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`,
      href: "/operations/devis",
      priorite: prioriteAlerte("information", null),
    });
  }

  return actions.sort((a, b) => b.priorite - a.priorite);
}

// ── Prochaines sessions ──────────────────────────────────────────────────────

/** Écart en jours entiers entre deux dates `yyyy-mm-dd`. */
function ecartJoursCalendaires(dateISO: string | undefined, jourRef: string): number | null {
  if (!dateISO) return null;
  const a = new Date(dateISO + "T00:00:00");
  const b = new Date(jourRef + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function buildSessions(missions: Mission[], affectations: Affectation[], now: Date): SessionSummary[] {
  const active = missionActive(missions);
  const today = isoDay(now);
  const dated = missions.filter((m) => m.statut !== "Annulée" && m.dateMission);
  // Fenêtre lisible autour d'« aujourd'hui » : mission active en tête, puis les
  // prochaines sessions (au plus tôt), puis les sessions récentes terminées.
  const upcoming = dated
    .filter((m) => m.id !== active?.id && m.dateMission! >= today)
    .sort((a, b) => (a.dateMission! < b.dateMission! ? -1 : 1));
  const past = dated
    .filter((m) => m.id !== active?.id && m.dateMission! < today)
    .sort((a, b) => (a.dateMission! < b.dateMission! ? 1 : -1));
  const ordered = [
    ...(active ? [active] : []),
    ...upcoming.slice(0, 2),
    ...past.slice(0, 3),
  ];
  const seen = new Set<number>();
  const unique = ordered.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  return unique
    .slice(0, 6)
    // Le tableau porte une colonne DATE : elle doit être MONOTONE (BUG-018).
    // La sélection reste centrée sur le jour (session active + 2 à venir + 3
    // récentes), mais l'ordre d'affichage est chronologique — sans quoi la
    // colonne se lisait « 30 juil · 12 août · 24 août · 01 août · 31 juil ».
    .sort((a, b) => (a.dateMission ?? "").localeCompare(b.dateMission ?? ""))
    .map((m) => {
      const c = couvertureSession(m, affectations);
      // Écart en JOURS CALENDAIRES : `joursAvant` compare une date à minuit avec
      // l'instant courant, ce qui rendrait « aujourd'hui à 14 h » égal à −1 jour.
      const jours = ecartJoursCalendaires(m.dateMission, today);
      const position: SessionSummary["position"] =
        jours == null ? "avenir" : jours === 0 ? "aujourdhui" : jours > 0 ? "avenir" : "passee";
      const quand =
        jours == null ? "Date inconnue"
        : jours === 0 ? "Aujourd’hui"
        : jours > 0 ? `Dans ${jours} j`
        : `Il y a ${Math.abs(jours)} j`;
      return {
        id: m.id,
        dateISO: m.dateMission,
        client: m.client,
        session: m.session,
        reference: m.reference,
        nbSalles: m.nbSalles,
        pourvus: c.pourvus,
        requis: c.requis,
        taux: c.taux,
        etat: c.etat,
        statut: m.statut,
        position,
        quand,
      };
    });
}

// ── Charge des surveillants ──────────────────────────────────────────────────

export function buildWorkload(surveillants: Surveillant[]): WorkloadRow[] {
  const rows = [...surveillants]
    .filter((s) => s.statut !== "Indisponible")
    .sort((a, b) => b.heures - a.heures)
    .slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.heures));
  return rows.map((s) => ({
    id: s.id,
    nom: s.nom,
    role: s.role,
    heures: s.heures,
    statut: s.statut,
    surcharge: s.heures >= SEUIL_SURCHARGE_H,
    part: Math.min(1, s.heures / max),
  }));
}

// ── Calendrier (semaine courante) ────────────────────────────────────────────

export function buildCalendar(missions: Mission[], affectations: Affectation[], now: Date): CalendarDay[] {
  // Lundi de la semaine contenant `now`.
  const day = now.getDay(); // 0 = dimanche
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const todayISO = isoDay(now);

  const jours: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const iso = isoDay(d);
    const sessions = missions
      .filter((m) => m.dateMission === iso && m.statut !== "Annulée")
      .map((m) => {
        const c = couvertureSession(m, affectations);
        return { client: m.client, nbSalles: m.nbSalles, nbSurv: m.nbSurveillants, taux: c.taux, etat: c.etat };
      });
    jours.push({ dateISO: iso, weekday: WEEKDAYS[i], dayNum: d.getDate(), isToday: iso === todayISO, sessions });
  }
  return jours;
}

// ── Devis récents ────────────────────────────────────────────────────────────

export function buildQuotes(devis: Devis[]): QuoteSummary[] {
  return devis.slice(0, 5).map((d) => ({
    id: d.id,
    client: d.client,
    reference: d.reference,
    montantHT: d.montantHT,
    statut: d.statut,
  }));
}

// ── Point d'entrée ───────────────────────────────────────────────────────────

export function buildDashboardData(inputs: DashboardInputs): DashboardData {
  const { missions, surveillants, affectations, devis, incidents } = inputs;
  const equipe = inputs.devisEquipe ?? [];
  const raw = inputs.now ?? new Date();
  // Raisonnement par JOUR (minuit local) : une session datée d'aujourd'hui est
  // « à venir », pas « passée » à cause de l'heure courante.
  const now = new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());

  const financials = buildFinancials(devis, missions, surveillants, equipe, now);
  const coverage = buildCoverage(missions, affectations, now);
  const upcoming = buildUpcoming(missions, now);
  const risks = buildRisks(coverage, missions, affectations, incidents, now);
  const actions = buildActions(coverage, missions, affectations, incidents, devis, now);
  const sessions = buildSessions(missions, affectations, now);
  const workload = buildWorkload(surveillants);
  const calendar = buildCalendar(missions, affectations, now);
  const quotes = buildQuotes(devis);

  return {
    financials,
    coverage,
    upcoming,
    risks,
    actions,
    sessions,
    workload,
    calendar,
    quotes,
    missionsAVenir: upcoming.count,
  };
}
