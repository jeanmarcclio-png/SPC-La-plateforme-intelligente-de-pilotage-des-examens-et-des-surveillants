// -----------------------------------------------------------------------------
// COCKPIT OPÉRATIONNEL — view-model (thème bleu nuit premium).
// Source de vérité unique de l'écran /operations/cockpit : agrège missions +
// affectations + surveillants + salles en un modèle prêt à afficher. Fonction
// PURE et testable. Dérive le maximum du réel ; si aucune mission active,
// retombe sur un jeu de démonstration calé sur la référence visuelle.
// -----------------------------------------------------------------------------

import { analyseCouverture } from "./couverture";
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
  scoreIA: number; // 0–10, un chiffre après la virgule
  scoreLabel: string;
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

export interface CockpitAlert {
  niveau: AlertClass;
  lvLabel: string;
  titre: string;
  detail: string;
  heure: string;
}

export interface CockpitView {
  missionLabel: string;
  dateLabel: string;
  majHeure: string;
  kpis: CockpitKpis;
  timeline: CockpitTimeline;
  actions: CockpitAction[];
  sessions: CockpitSession[];
  sessionsEnCours: number;
  sessionsPrep: number;
  sallesRatio: string;
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
  sallesRatio: "10 / 176 salles",
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
    sallesRatio: "0 / 0 salles",
    alerts: [],
    demo: false,
    vide: true,
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

  // Couverture (postes = surveillants requis ; couverts = distinct affectés).
  const postesTotal = active.nbSurveillants || actifs.length;
  const postesCouverts = new Set(actifs.map((a) => a.surveillantId)).size;
  const couv = analyseCouverture({ requis: postesTotal, affectes: postesCouverts });

  // Confirmations (présence « Présent »).
  const confTotal = actifs.length;
  const confirmes = actifs.filter((a) => a.presence === "Présent").length;
  const confirmationsPct = confTotal > 0 ? Math.round((confirmes / confTotal) * 100) : 0;

  // Prises de poste à venir : créneaux débutant dans les 2 prochaines heures.
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let prisesDePoste = 0;
  for (const a of actifs) {
    for (const c of [creneauDe(a, "matin"), creneauDe(a, "apm")]) {
      const d = toMin(c?.debut);
      if (d != null && d >= nowMin && d <= nowMin + 120) prisesDePoste++;
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
    let statut = "Conforme", statutClass: StatutClass = "ok";
    if (enRetard) { statut = "En retard"; statutClass = "wa"; }
    else if (sansSalle) { statut = "Charge critique"; statutClass = "cr"; }
    else if (a.presence === "En attente" && p) { statut = "À surveiller"; statutClass = "wa"; }
    const mkCre = (c: { debut?: string; fin?: string } | null, etat: string, cls: "enc" | "att" | "pre"): CockpitCreneau | null =>
      c && c.debut && c.fin ? { horaire: `${c.debut} – ${c.fin}`, etat, etatClass: cls } : null;
    return {
      initials: initiales(nom), color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      nom, role, coord, salle: (a.salle ?? "—").trim() || "—",
      matin: mkCre(m, "En cours", "enc"),
      apm: mkCre(p, a.presence === "En attente" ? "En attente" : "En cours", a.presence === "En attente" ? "att" : "enc"),
      statut, statutClass, conf: a.presence === "Présent" ? "ok" : "wa",
    };
  });

  // Alertes / récap dérivés des statuts de session.
  const critiques = sessions.filter((s) => s.statutClass === "cr");
  const retards = sessions.filter((s) => s.statut === "En retard");
  const alerts: CockpitAlert[] = [
    ...critiques.slice(0, 2).map<CockpitAlert>((s) => ({ niveau: "cr", lvLabel: "CRITIQUE", titre: `Charge critique — ${s.nom}`, detail: "Surcharge détectée — seuil de surcharge dépassé", heure: "—" })),
    ...retards.slice(0, 2).map<CockpitAlert>((s) => ({ niveau: "rt", lvLabel: "RETARD", titre: `Surveillant en retard — ${s.nom}`, detail: `Salle ${s.salle}`, heure: "—" })),
  ];
  const alertesCritiques = critiques.length;
  const alertesRetards = retards.length;
  const alertesInfos = 0;
  const alertesTotal = alertesCritiques + alertesRetards + alertesInfos;

  // File « À traiter maintenant » dérivée des cas les plus urgents.
  const actions: CockpitAction[] = [
    ...critiques.slice(0, 2).map<CockpitAction>((s) => ({ niveau: "critique", titre: `Traiter la charge critique — ${s.nom}`, detail: `Salle ${s.salle} · surcharge détectée`, cta: "Traiter" })),
    ...retards.slice(0, 2).map<CockpitAction>((s) => ({ niveau: "retard", titre: `Relancer ${s.nom} (retard)`, detail: `Salle ${s.salle} · prise de poste à confirmer`, cta: "Relancer" })),
  ];

  // Score de fluidité IA : heuristique bornée (couverture − pénalités alertes).
  const scoreIA = Math.max(0, Math.min(10, Math.round((couv.tauxCouverture * 10 - alertesCritiques * 0.6 - alertesRetards * 0.3) * 10) / 10));
  const scoreLabel = scoreIA >= 8 ? "Très bon" : scoreIA >= 6 ? "Correct" : scoreIA >= 4 ? "À surveiller" : "Critique";

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
  const DAY0 = 7 * 60, DAY1 = 19 * 60;
  const nowPct = nowMin >= DAY0 && nowMin <= DAY1 ? ((nowMin - DAY0) / (DAY1 - DAY0)) * 100 : null;

  const sallesAffectees = new Set(actifs.filter((a) => a.salle).map((a) => a.salle)).size;

  return {
    missionLabel: `${active.client}${active.dateMission ? ` — ${active.dateMission}` : ""}`,
    dateLabel: active.dateMission ?? "",
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
    sallesRatio: `${sallesAffectees} / ${active.nbSalles || sallesAffectees} salles`,
    alerts,
    demo: false,
    vide: false,
  };
}
