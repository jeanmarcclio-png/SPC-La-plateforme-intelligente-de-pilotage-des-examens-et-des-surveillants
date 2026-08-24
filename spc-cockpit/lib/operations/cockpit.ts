// -----------------------------------------------------------------------------
// COCKPIT OPÉRATIONNEL — view-model (thème bleu nuit premium).
// Source de vérité unique de l'écran /operations/cockpit : agrège missions +
// affectations + surveillants + salles en un modèle prêt à afficher. Fonction
// PURE et testable. Dérive le maximum du réel ; si aucune mission active,
// retombe sur un jeu de démonstration calé sur la référence visuelle.
// -----------------------------------------------------------------------------

import { analyseCouverture, couvertureSession } from "./couverture";
import { SEUIL_SURCHARGE_H } from "./constants";
import { dateFR } from "./format";
import { alertesSession, santeSession } from "./planification-vue";
import { normaliserNomSalle } from "./referentiel-salles";
import { demoActif } from "./source";
import type { Affectation, Mission, Salle, Surveillant } from "./types";

export type StatutClass = "ok" | "wa" | "cr";
export type ConfClass = "ok" | "wa";
export type AlertClass = "cr" | "rt" | "if";
export type ActionNiveau = "critique" | "retard" | "info" | "ok";

export interface CockpitKpis {
  couverturePct: number;
  postesCouverts: number;
  postesTotal: number;
  confirmationsPct: number;
  confirmes: number;
  confTotal: number;
  prisesDePoste: number;
  alertesTotal: number;
  alertesCritiques: number;
  alertesRetards: number;
  alertesInfos: number;
  scoreIA: number; // score de santé de session 0–100 (même échelle que la planification)
  scoreLabel: string; // « prête » | « à consolider » | « à risque »
}

export interface CockpitTimelineBar {
  debut: string;
  fin: string;
  salles: number;
  surveillants: number;
}
export interface CockpitTimeline {
  matin?: CockpitTimelineBar;
  apm?: CockpitTimelineBar;
  nowPct: number | null; // position 0–100 de « maintenant » (null si hors 07–19h)
  nowLabel: string;
}

export interface CockpitAction {
  niveau: ActionNiveau;
  titre: string;
  detail: string;
  cta: string;
}

export interface CockpitCreneau {
  horaire: string; // "08:30 – 14:30"
  etat: string; // "En cours" | "En attente" | "En préparation"
  etatClass: "enc" | "att" | "pre";
}
export interface CockpitSession {
  initials: string;
  color: string;
  nom: string;
  role: string;
  coord: boolean;
  salle: string;
  matin: CockpitCreneau | null;
  apm: CockpitCreneau | null;
  statut: string;
  statutClass: StatutClass;
  conf: ConfClass;
}

/**
 * Salles ouvertes vs salles déclarées (BUG-021). Le cockpit affichait
 * « 8 / 6 salles » sans anomalie, et la page Missions comptait ce ratio > 100 %
 * comme un objectif atteint dans un avancement de 93 %.
 */
export interface CockpitSalles {
  ouvertes: number; // salles réellement utilisées au planning
  declarees: number; // salles annoncées sur la mission
  ecart: number; // ouvertes − déclarées (0 si conforme)
  anomalie: boolean; // true dès que ouvertes ≠ déclarées
  libelle: string;
}

export interface CockpitAlert {
  niveau: AlertClass;
  lvLabel: string;
  titre: string;
  detail: string;
  heure: string;
}

/**
 * Position de la session dans le temps (BUG-014). Le cockpit affichait un
 * curseur « maintenant » et « 2 prises de poste dans les 2 prochaines heures »
 * sur une session datée de 9 jours plus tôt : `buildCockpitView` ne comparait
 * jamais `dateMission` à `now`.
 */
export type JourSession = "aujourdhui" | "passee" | "avenir" | "sans-date";

export interface TemporaliteSession {
  jour: JourSession;
  /** Écart en jours calendaires (négatif = passé, positif = à venir). */
  ecartJours: number;
  /** Libellé prêt à afficher, ex. « Session du 30 juillet 2026 — clôturée ». */
  libelle: string;
  /** true uniquement quand le pilotage temps réel a un sens. */
  tempsReel: boolean;
}

export interface CockpitView {
  missionLabel: string;
  dateLabel: string;
  temporalite: TemporaliteSession;
  majHeure: string;
  kpis: CockpitKpis;
  timeline: CockpitTimeline;
  actions: CockpitAction[];
  sessions: CockpitSession[];
  sessionsEnCours: number;
  sessionsPrep: number;
  sallesRatio: string;
  salles: CockpitSalles;
  alerts: CockpitAlert[];
  demo: boolean; // true si jeu de démonstration (SPC_DEMO=1 uniquement)
  vide: boolean; // true si aucune session exploitable → l'écran rend un état vide
}

const AVATAR_COLORS = ["#7C5CFF", "#2E7BFF", "#F0444B", "#33B162", "#2997FF", "#F59E0B", "#36D477", "#8B5CF6", "#1B59C4"];

function initiales(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function creneauDe(a: Affectation, periode: "matin" | "apm"): { debut?: string; fin?: string } | null {
  const list = periode === "matin" ? a.matinCreneaux : a.apmCreneaux;
  if (list?.length) return { debut: list[0].debut, fin: list[list.length - 1].fin };
  if (periode === "matin" && a.matin) return { debut: a.matinDebut, fin: a.matinFin };
  if (periode === "apm" && a.apm) return { debut: a.apmDebut, fin: a.apmFin };
  return null;
}

// ---------------------------------------------------------------------------
// Jeu de démonstration — calé sur la référence visuelle (bleu nuit premium).
// ---------------------------------------------------------------------------
export const DEMO_COCKPIT: CockpitView = {
  missionLabel: "ICP Paris — 8 juillet 2026",
  dateLabel: "Mardi 8 juillet 2026",
  temporalite: { jour: "aujourdhui", ecartJours: 0, libelle: "Session du jour — pilotage en direct", tempsReel: true },
  majHeure: "20:22:27",
  kpis: {
    couverturePct: 92, postesCouverts: 83, postesTotal: 90,
    confirmationsPct: 76, confirmes: 68, confTotal: 90,
    prisesDePoste: 14,
    alertesTotal: 9, alertesCritiques: 4, alertesRetards: 3, alertesInfos: 2,
    scoreIA: 8.6, scoreLabel: "Très bon",
  },
  timeline: {
    matin: { debut: "08:00", fin: "12:30", salles: 9, surveillants: 45 },
    apm: { debut: "13:00", fin: "18:30", salles: 9, surveillants: 38 },
    nowPct: 27, nowLabel: "10:22",
  },
  actions: [
    { niveau: "critique", titre: "Rattacher Fatma Benali (charge orpheline)", detail: "Surveillante sans mission de rattachement", cta: "Rattacher" },
    { niveau: "retard", titre: "Confirmer salle B21 (après-midi)", detail: "En attente de confirmation surveillant", cta: "Confirmer" },
    { niveau: "retard", titre: "Remplacer Jean-Pierre Moreau (B21)", detail: "Indisponibilité salle", cta: "Remplacer" },
    { niveau: "ok", titre: "Valider ouverture salle E31", detail: "Ouverture prévue à 13:30", cta: "Valider" },
  ],
  sessions: [
    { initials: "ML", color: "#7C5CFF", nom: "Marie Laroche", role: "Coordinatrice", coord: true, salle: "A21", matin: { horaire: "08:30 – 14:30", etat: "En cours", etatClass: "enc" }, apm: null, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "JM", color: "#2E7BFF", nom: "Jean-Pierre Moreau", role: "Surveillant salle", coord: false, salle: "B21", matin: { horaire: "08:00 – 12:15", etat: "En cours", etatClass: "enc" }, apm: { horaire: "14:15 – 17:00", etat: "En attente", etatClass: "att" }, statut: "À surveiller", statutClass: "wa", conf: "wa" },
    { initials: "FB", color: "#F0444B", nom: "Fatma Benali", role: "Surveillante salle", coord: false, salle: "C14", matin: { horaire: "09:15 – 12:00", etat: "En cours", etatClass: "enc" }, apm: null, statut: "Charge critique", statutClass: "cr", conf: "wa" },
    { initials: "TG", color: "#33B162", nom: "Thomas Girard", role: "Surveillant PMR", coord: false, salle: "E31", matin: { horaire: "08:30 – 13:00", etat: "En cours", etatClass: "enc" }, apm: { horaire: "13:30 – 18:30", etat: "En cours", etatClass: "enc" }, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "SD", color: "#2997FF", nom: "Sophie Dubois", role: "Coordinatrice", coord: true, salle: "AMP", matin: null, apm: { horaire: "13:00 – 18:00", etat: "En préparation", etatClass: "pre" }, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "KH", color: "#F59E0B", nom: "Karim Haddad", role: "Surveillant salle", coord: false, salle: "A22", matin: { horaire: "08:30 – 13:30", etat: "En cours", etatClass: "enc" }, apm: null, statut: "En retard", statutClass: "wa", conf: "wa" },
    { initials: "LF", color: "#36D477", nom: "Léa Fontaine", role: "Surveillante salle", coord: false, salle: "AMP", matin: { horaire: "10:00 – 13:00", etat: "En cours", etatClass: "enc" }, apm: null, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "MP", color: "#8B5CF6", nom: "Marc Petit", role: "Surveillant salle", coord: false, salle: "F11", matin: { horaire: "08:00 – 13:00", etat: "En cours", etatClass: "enc" }, apm: { horaire: "13:15 – 17:30", etat: "En cours", etatClass: "enc" }, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "SC", color: "#1B59C4", nom: "Stanley Clio", role: "Surveillant salle", coord: false, salle: "F12", matin: { horaire: "10:00 – 13:00", etat: "En cours", etatClass: "enc" }, apm: { horaire: "14:10 – 18:00", etat: "En cours", etatClass: "enc" }, statut: "Conforme", statutClass: "ok", conf: "ok" },
    { initials: "AM", color: "#2997FF", nom: "Amir Marc CLIO", role: "Surveillant salle", coord: false, salle: "E32", matin: { horaire: "08:00 – 13:00", etat: "En cours", etatClass: "enc" }, apm: { horaire: "14:30 – 18:00", etat: "En cours", etatClass: "enc" }, statut: "Conforme", statutClass: "ok", conf: "ok" },
  ],
  sessionsEnCours: 11,
  sessionsPrep: 1,
  sallesRatio: "10 salles ouvertes sur 10 déclarées",
  salles: { ouvertes: 10, declarees: 10, ecart: 0, anomalie: false, libelle: "10 salles ouvertes sur 10 déclarées" },
  alerts: [
    { niveau: "cr", lvLabel: "CRITIQUE", titre: "Charge critique — Fatma Benali", detail: "Surcharge détectée — seuil de surcharge dépassé", heure: "10:12" },
    { niveau: "cr", lvLabel: "CRITIQUE", titre: "Salle B21 — Après-midi", detail: "Aucun surveillant confirmé", heure: "09:58" },
    { niveau: "rt", lvLabel: "RETARD", titre: "Surveillant en retard — Karim Haddad", detail: "Prise de poste prévue 08:30", heure: "08:41" },
    { niveau: "rt", lvLabel: "RETARD", titre: "Ouverture salle C14", detail: "Ouverture prévue 09:15", heure: "08:26" },
    { niveau: "if", lvLabel: "INFO", titre: "Session du 23 mai 2026 — Sciences Po", detail: "Terminée", heure: "Hier" },
  ],
  demo: true,
  vide: false,
};

/**
 * Vue cockpit VIDE — servie quand aucune session n'est exploitable et que le
 * mode démonstration n'est pas actif. Tous les compteurs sont à zéro et aucun
 * nom, aucune salle, aucune alerte n'est inventé : l'écran affiche un état vide.
 */
export function cockpitVide(): CockpitView {
  return {
    missionLabel: "",
    dateLabel: "",
    temporalite: { jour: "sans-date", ecartJours: 0, libelle: "", tempsReel: false },
    majHeure: "",
    kpis: {
      couverturePct: 0, postesCouverts: 0, postesTotal: 0,
      confirmationsPct: 0, confirmes: 0, confTotal: 0,
      prisesDePoste: 0,
      alertesTotal: 0, alertesCritiques: 0, alertesRetards: 0, alertesInfos: 0,
      scoreIA: 0, scoreLabel: "—",
    },
    timeline: { nowPct: null, nowLabel: "" },
    actions: [],
    sessions: [],
    sessionsEnCours: 0,
    sessionsPrep: 0,
    sallesRatio: "",
    salles: { ouvertes: 0, declarees: 0, ecart: 0, anomalie: false, libelle: "" },
    alerts: [],
    demo: false,
    vide: true,
  };
}

// ---------------------------------------------------------------------------
// Vérité temporelle (BUG-014)
// ---------------------------------------------------------------------------

/** Date locale au format yyyy-mm-dd — jamais `toISOString`, qui bascule en UTC. */
function jourLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MS_JOUR = 24 * 60 * 60 * 1000;

/**
 * Situe la session par rapport à aujourd'hui. C'est ce verdict — et lui seul —
 * qui autorise le pilotage temps réel : curseur « maintenant », prises de poste
 * imminentes, créneaux « En cours ». Sur une session close ou future, tout cela
 * est faux et doit disparaître.
 */
export function temporaliteSession(dateMission: string | undefined, now: Date): TemporaliteSession {
  if (!dateMission) {
    return {
      jour: "sans-date",
      ecartJours: 0,
      libelle: "Session sans date — pilotage temps réel indisponible",
      tempsReel: false,
    };
  }
  const aujourdhui = jourLocal(now);
  if (dateMission === aujourdhui) {
    return { jour: "aujourdhui", ecartJours: 0, libelle: "Session du jour — pilotage en direct", tempsReel: true };
  }

  const dSession = new Date(dateMission + "T00:00:00");
  const dAujourdhui = new Date(aujourdhui + "T00:00:00");
  if (isNaN(dSession.getTime())) {
    return { jour: "sans-date", ecartJours: 0, libelle: "Date de session illisible", tempsReel: false };
  }
  const ecartJours = Math.round((dSession.getTime() - dAujourdhui.getTime()) / MS_JOUR);
  const date = dateFR(dateMission);

  if (ecartJours < 0) {
    const n = Math.abs(ecartJours);
    return {
      jour: "passee",
      ecartJours,
      libelle: `Session du ${date} — clôturée depuis ${n} jour${n > 1 ? "s" : ""}`,
      tempsReel: false,
    };
  }
  return {
    jour: "avenir",
    ecartJours,
    libelle: `Session du ${date} — dans ${ecartJours} jour${ecartJours > 1 ? "s" : ""}`,
    tempsReel: false,
  };
}

// ---------------------------------------------------------------------------
// Dérivation depuis les données réelles.
// ---------------------------------------------------------------------------
export interface CockpitInput {
  missions: Mission[];
  affectations: Affectation[];
  surveillants: Surveillant[];
  salles: Salle[];
  now?: Date;
}

export function buildCockpitView(input: CockpitInput): CockpitView {
  const { missions, affectations, surveillants } = input;
  const now = input.now ?? new Date();

  const active =
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée");

  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];
  const actifs = rows.filter((a) => a.matin || a.apm || a.matinCreneaux?.length || a.apmCreneaux?.length);

  // Aucune donnée exploitable. Le jeu de démonstration n'est servi QUE sous
  // SPC_DEMO=1 (audit QA forensic V2, BUG-001) : sans ce drapeau on retourne une
  // vue VIDE, que l'écran rend en état vide explicite. Un cockpit opérationnel
  // ne doit jamais inventer des surveillants, des salles et des alertes.
  if (!active || actifs.length === 0) {
    return demoActif() ? DEMO_COCKPIT : cockpitVide();
  }

  const survById = new Map(surveillants.map((s) => [s.id, s]));

  // Couverture : source de vérité unique partagée avec le dashboard, la
  // planification, les missions et les salles (BUG-005).
  const couvSession = couvertureSession(active, affectations);
  const postesTotal = couvSession.requis;
  const postesCouverts = couvSession.pourvus;
  const couv = analyseCouverture({ requis: postesTotal, affectes: postesCouverts });

  // Confirmations : le dénominateur est le nombre de POSTES REQUIS, pas le
  // nombre d'affectations existantes (BUG-020). L'écran affichait
  // « CONFIRMATIONS 100 % · 10 / 10 confirmés » alors que 4 des 14 postes
  // n'étaient pas pourvus : un poste vacant ne peut pas être confirmé, l'exclure
  // du dénominateur transformait une session incomplète en session rassurante.
  const confTotal = Math.max(postesTotal, actifs.length);
  const confirmes = actifs.filter((a) => a.presence === "Présent").length;
  const confirmationsPct = confTotal > 0 ? Math.round((confirmes / confTotal) * 100) : 0;

  // Situation de la session dans le temps. Tout le temps réel en dépend.
  const temporalite = temporaliteSession(active.dateMission, now);

  // Prises de poste à venir : créneaux débutant dans les 2 prochaines heures.
  // N'a de sens QUE le jour de la session (BUG-014) — sur une session close, ce
  // compteur annonçait des prises de poste imminentes qui n'existent pas.
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let prisesDePoste = 0;
  if (temporalite.tempsReel) {
    for (const a of actifs) {
      for (const c of [creneauDe(a, "matin"), creneauDe(a, "apm")]) {
        const d = toMin(c?.debut);
        if (d != null && d >= nowMin && d <= nowMin + 120) prisesDePoste++;
      }
    }
  }

  // Sessions (lignes du tableau).
  const sessions: CockpitSession[] = actifs.map((a, i) => {
    const s = survById.get(a.surveillantId);
    const nom = s?.nom ?? `Surveillant #${a.surveillantId}`;
    const role = s?.role ?? (a.roleMission ?? "Surveillant salle");
    const coord = /coord/i.test(role);
    const m = creneauDe(a, "matin");
    const p = creneauDe(a, "apm");
    const enRetard = a.presence === "Absent";
    const sansSalle = !(a.salle ?? "").trim();
    // « Surcharge » est réservé au dépassement de SEUIL_SURCHARGE_H, seule
    // définition du produit (BUG-008 / BUG-009). Une affectation sans salle est
    // un défaut de planification, pas une surcharge : elle porte son vrai nom.
    const enSurcharge = (s?.heures ?? 0) >= SEUIL_SURCHARGE_H;
    let statut = "Conforme", statutClass: StatutClass = "ok";
    if (enRetard) { statut = "En retard"; statutClass = "wa"; }
    else if (sansSalle) { statut = "Sans salle"; statutClass = "cr"; }
    else if (enSurcharge) { statut = "Surcharge"; statutClass = "cr"; }
    else if (a.presence === "En attente" && p) { statut = "À surveiller"; statutClass = "wa"; }
    const mkCre = (c: { debut?: string; fin?: string } | null, etat: string, cls: "enc" | "att" | "pre"): CockpitCreneau | null =>
      c && c.debut && c.fin ? { horaire: `${c.debut} – ${c.fin}`, etat, etatClass: cls } : null;
    // « En cours » n'est vrai que le jour de la session (BUG-014). Ailleurs, le
    // créneau porte l'état réel : terminé pour une session close, planifié pour
    // une session à venir.
    const etatMatin = temporalite.tempsReel ? "En cours" : temporalite.jour === "passee" ? "Terminé" : "Planifié";
    const classeHorsJour: "enc" | "att" | "pre" = temporalite.jour === "passee" ? "att" : "pre";
    return {
      initials: initiales(nom), color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      nom, role, coord, salle: (a.salle ?? "—").trim() || "—",
      matin: mkCre(m, etatMatin, temporalite.tempsReel ? "enc" : classeHorsJour),
      apm: temporalite.tempsReel
        ? mkCre(p, a.presence === "En attente" ? "En attente" : "En cours", a.presence === "En attente" ? "att" : "enc")
        : mkCre(p, etatMatin, classeHorsJour),
      statut, statutClass, conf: a.presence === "Présent" ? "ok" : "wa",
    };
  });

  // Alertes / récap dérivés des statuts de session. Chaque alerte dit ce qui est
  // RÉELLEMENT constaté — même vocabulaire que la planification (BUG-008).
  const sansSalles = sessions.filter((s) => s.statut === "Sans salle");
  const surcharges = sessions.filter((s) => s.statut === "Surcharge");
  // `critiques` (toutes lignes en statutClass "cr") a été retiré : le décompte
  // d'alertes vient désormais du catalogue de planification-vue (BUG-025), et
  // cette variable n'avait plus aucun lecteur.
  const retards = sessions.filter((s) => s.statut === "En retard");
  const alerts: CockpitAlert[] = [
    ...sansSalles.slice(0, 2).map<CockpitAlert>((s) => ({ niveau: "cr", lvLabel: "CRITIQUE", titre: `Aucune salle affectée — ${s.nom}`, detail: "Créneau planifié sans salle : à affecter avant l'ouverture", heure: "—" })),
    ...surcharges.slice(0, 2).map<CockpitAlert>((s) => ({ niveau: "cr", lvLabel: "CRITIQUE", titre: `Surcharge — ${s.nom}`, detail: `Charge cumulée au-delà de ${SEUIL_SURCHARGE_H} h`, heure: "—" })),
    ...retards.slice(0, 2).map<CockpitAlert>((s) => ({ niveau: "rt", lvLabel: "RETARD", titre: `Surveillant en retard — ${s.nom}`, detail: `Salle ${s.salle}`, heure: "—" })),
  ];
  // Décompte : le cockpit et la planification portent sur LA MÊME session — ils
  // doivent donc annoncer le même nombre d'alertes (BUG-025). Le catalogue de
  // référence est celui de planification-vue ; le cockpit y ajoute les retards,
  // qui n'existent qu'en temps réel (présence constatée le jour J).
  const alertesPlanning = alertesSession({ mission: active, missions, affectations, surveillants });
  const alertesCritiques = alertesPlanning.filter((a) => a.niveau === "critique").length;
  const alertesRetards = retards.length;
  const alertesInfos = alertesPlanning.filter((a) => a.niveau === "avertissement").length;
  const alertesTotal = alertesCritiques + alertesRetards + alertesInfos;

  // File « À traiter maintenant » dérivée des cas les plus urgents.
  const actions: CockpitAction[] = [
    ...sansSalles.slice(0, 2).map<CockpitAction>((s) => ({ niveau: "critique", titre: `Affecter une salle — ${s.nom}`, detail: "Créneau planifié sans salle", cta: "Affecter" })),
    ...surcharges.slice(0, 2).map<CockpitAction>((s) => ({ niveau: "critique", titre: `Alléger la charge — ${s.nom}`, detail: `Charge cumulée au-delà de ${SEUIL_SURCHARGE_H} h`, cta: "Rééquilibrer" })),
    ...retards.slice(0, 2).map<CockpitAction>((s) => ({ niveau: "retard", titre: `Relancer ${s.nom} (retard)`, detail: `Salle ${s.salle} · prise de poste à confirmer`, cta: "Relancer" })),
  ];

  // Santé de la session : MÊME score et MÊME échelle que la planification
  // (0–100). Le cockpit affichait auparavant une heuristique « fluidité IA »
  // sur 10, qui donnait 5,9/10 « À surveiller » là où la planification affichait
  // 54/100 « À risque » pour la même session (BUG-025).
  const sante = santeSession({ mission: active, missions, affectations, surveillants });
  const scoreIA = sante.score;
  const scoreLabel = sante.niveau;

  // Frise horaire : amplitude matin / après-midi réelle.
  const collect = (per: "matin" | "apm") => {
    const deb: number[] = [], fin: number[] = [], sallesSet = new Set<string>(); let survN = 0;
    for (const a of actifs) {
      const c = creneauDe(a, per);
      const d = toMin(c?.debut), f = toMin(c?.fin);
      if (d != null) { deb.push(d); survN++; if (a.salle) sallesSet.add(a.salle.trim()); }
      if (f != null) fin.push(f);
    }
    if (!deb.length) return undefined;
    const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    return { debut: fmt(Math.min(...deb)), fin: fmt(Math.max(...fin)), salles: sallesSet.size, surveillants: survN };
  };
  // Curseur « maintenant » : posé UNIQUEMENT le jour de la session (BUG-014).
  // Il était auparavant placé quelle que soit la date, faisant lire une session
  // vieille de 9 jours comme un événement en cours.
  const DAY0 = 7 * 60, DAY1 = 19 * 60;
  const nowPct =
    temporalite.tempsReel && nowMin >= DAY0 && nowMin <= DAY1
      ? ((nowMin - DAY0) / (DAY1 - DAY0)) * 100
      : null;

  // Salles ouvertes vs déclarées (BUG-021) : un ratio supérieur à 100 % est un
  // ÉCART à corriger, pas un objectif dépassé.
  const sallesOuvertes = new Set(
    actifs.map((a) => normaliserNomSalle(a.salle)).filter((c) => c !== ""),
  ).size;
  const sallesDeclarees = Math.max(0, active.nbSalles || 0);
  const ecartSalles = sallesDeclarees > 0 ? sallesOuvertes - sallesDeclarees : 0;
  const salles: CockpitSalles = {
    ouvertes: sallesOuvertes,
    declarees: sallesDeclarees,
    ecart: ecartSalles,
    anomalie: ecartSalles !== 0,
    libelle:
      sallesDeclarees === 0
        ? `${sallesOuvertes} salle${sallesOuvertes > 1 ? "s" : ""} ouverte${sallesOuvertes > 1 ? "s" : ""} · aucune salle déclarée sur la mission`
        : ecartSalles === 0
          ? `${sallesOuvertes} salle${sallesOuvertes > 1 ? "s" : ""} ouverte${sallesOuvertes > 1 ? "s" : ""} sur ${sallesDeclarees} déclarée${sallesDeclarees > 1 ? "s" : ""}`
          : ecartSalles > 0
            ? `${sallesOuvertes} salles ouvertes pour ${sallesDeclarees} déclarées — ${ecartSalles} de trop au planning`
            : `${sallesOuvertes} salles ouvertes sur ${sallesDeclarees} déclarées — ${Math.abs(ecartSalles)} non ouverte${Math.abs(ecartSalles) > 1 ? "s" : ""}`,
  };

  return {
    // Date en toutes lettres, comme sur tous les autres écrans (BUG-019) : le
    // cockpit affichait « ICP Paris — 2026-07-30 », format ISO brut.
    missionLabel: `${active.client}${active.dateMission ? ` — ${dateFR(active.dateMission)}` : ""}`,
    dateLabel: active.dateMission ? dateFR(active.dateMission) : "",
    temporalite,
    majHeure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    kpis: {
      couverturePct: Math.round(couv.tauxCouverture * 100), postesCouverts, postesTotal,
      confirmationsPct, confirmes, confTotal,
      prisesDePoste,
      alertesTotal, alertesCritiques, alertesRetards, alertesInfos,
      scoreIA, scoreLabel,
    },
    timeline: { matin: collect("matin"), apm: collect("apm"), nowPct, nowLabel: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` },
    actions,
    sessions,
    sessionsEnCours: missions.filter((m) => m.statut === "En cours").length,
    sessionsPrep: missions.filter((m) => m.statut === "Planifiée" || m.statut === "Validée").length,
    sallesRatio: salles.libelle,
    salles,
    alerts,
    demo: false,
    vide: false,
  };
}
