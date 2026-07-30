"use client";

import { useState, useMemo, useTransition, Fragment } from "react";
import type { Mission, Surveillant, Affectation, JournalEntry, StatutMission } from "@/lib/operations/types";
import type { RefusRow } from "@/lib/supabase/portail";
import { updateAffectation, addAffectation, deleteAffectation, type AffectationFields } from "@/app/actions/affectations";
import { validerSession, updateMission, deleteMission } from "@/app/actions/missions";
import { SurveillantPicker } from "@/components/ops/SurveillantPicker";
import { Kpi } from "@/components/ops/Kpi";
import { Button, ButtonLink } from "@/components/ops/Button";
import { showToast } from "@/components/Toast";
import { dateFR, euro } from "@/lib/operations/format";
import { analyseRentabilite } from "@/lib/operations/rentabilite";
import { analyseCouverture } from "@/lib/operations/couverture";
import { couvertureParCreneau } from "@/lib/operations/couverture-creneaux";
import { scoreSanteSession } from "@/lib/operations/sante-session";
import { SEUIL_SURCHARGE_H } from "@/lib/operations/constants";
import { toCSV } from "@/lib/operations/csv";
import { parseTimeToMinutes, detectSupervisorConflicts, type SupervisorAssignmentInput } from "@/lib/operations/engine";
import { statutOptions, estPlanifiable } from "@/lib/operations/mission-status";
import { suggererSurveillants } from "@/lib/operations/suggestions";
import {
  AlertTriangle, Trash2, Check, ShieldCheck, ShieldAlert, Calendar, CalendarDays, CalendarCheck,
  Download, Pencil, Plus, Send, Users, Clock, Search, ArrowRight, Sparkles,
  Zap, Info, ChevronDown, MapPin, CheckCircle2, UserSearch,
} from "lucide-react";

const ACCENT = "#2563eb";
const TEAL = "#1a6b7e";
const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

// Amplitude de la timeline « présence par créneau » : 08:00 → 19:00.
const DAY_START = 8 * 60;
const DAY_END = 19 * 60;
const DAY_SPAN = DAY_END - DAY_START;

// Un surveillant peut enchaîner plusieurs surveillances par demi-journée
// (ex. 08:00–09:30, 10:00–11:30, 12:00–13:30) — jusqu'à MAX_CRENEAUX chacune.
type Slot = { debut: string; fin: string };
type RowState = { salle: string; matin: Slot[]; apm: Slot[] };

const MAX_CRENEAUX = 3;
const DEF_MATIN: Slot = { debut: "08:00", fin: "13:00" };
const DEF_APM: Slot = { debut: "13:30", fin: "18:00" };

// Taxonomie unique de gravité (C1) — partagée par le Centre d'alertes et les
// statuts de ligne. Fond teinté + anneau + point : lisible sans la couleur seule.
type Severite = "blocant" | "warning" | "info";
const SEV_META: Record<Severite, { label: string; bar: string; chip: string; Icon: typeof Info }> = {
  blocant: { label: "Bloquant", bar: "#e11d48", chip: "bg-rose-50 text-rose-700 ring-rose-600/15", Icon: ShieldAlert },
  warning: { label: "À surveiller", bar: "#d97706", chip: "bg-amber-50 text-amber-700 ring-amber-600/15", Icon: Zap },
  info: { label: "Information", bar: "#0284c7", chip: "bg-sky-50 text-sky-700 ring-sky-600/15", Icon: Info },
};

function toRowState(a: Affectation): RowState {
  const matin = a.matinCreneaux?.length
    ? a.matinCreneaux
    : a.matin ? [{ debut: a.matinDebut ?? "08:00", fin: a.matinFin ?? "13:00" }] : [];
  const apm = a.apmCreneaux?.length
    ? a.apmCreneaux
    : a.apm ? [{ debut: a.apmDebut ?? "13:30", fin: a.apmFin ?? "18:00" }] : [];
  return { salle: a.salle ?? "", matin, apm };
}

function slotHours(s: Slot): number {
  try {
    const mins = parseTimeToMinutes(s.fin) - parseTimeToMinutes(s.debut);
    return mins > 0 ? mins / 60 : 0;
  } catch {
    return 0;
  }
}

function periodHours(slots: Slot[]): number {
  return slots.reduce((n, s) => n + slotHours(s), 0);
}

function rowHours(r: RowState): number {
  return periodHours(r.matin) + periodHours(r.apm);
}

/** Deux créneaux d'une même demi-journée se chevauchent-ils ? (ex. 08:00–10:00
 *  et 09:00–11:00). On ignore les créneaux invalides (déjà signalés ailleurs). */
function hasOverlap(slots: Slot[]): boolean {
  const iv = slots
    .map((s): [number, number] | null => {
      try {
        const d = parseTimeToMinutes(s.debut), f = parseTimeToMinutes(s.fin);
        return f > d ? [d, f] : null;
      } catch {
        return null;
      }
    })
    .filter((x): x is [number, number] => x !== null)
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < iv.length; i++) {
    if (iv[i][0] < iv[i - 1][1]) return true;
  }
  return false;
}

function initials(nom: string): string {
  return (nom ?? "??").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/** Badge de rôle — tonalité sémantique alignée sur badges.tsx. */
function RoleBadge({ role }: { role: string }) {
  const r = (role ?? "").toLowerCase();
  let tone = "bg-slate-100 text-slate-600 ring-slate-500/15";
  if (r.includes("coordinat")) tone = "bg-indigo-50 text-indigo-700 ring-indigo-600/15";
  else if (r.includes("volant")) tone = "bg-sky-50 text-sky-700 ring-sky-600/15";
  else if (r.includes("pmr")) tone = "bg-amber-50 text-amber-700 ring-amber-600/15";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset whitespace-nowrap ${tone}`}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {role || "—"}
    </span>
  );
}

/** Badges d'horaires condensés (C4) : matin teal, après-midi bleu — la couleur
 *  porte l'information demi-journée, plus besoin de deux colonnes séparées. */
function PlanningBadges({ r }: { r: RowState }) {
  if (r.matin.length === 0 && r.apm.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-600">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden />Aucun créneau
      </span>
    );
  }
  const badge = (s: Slot, color: string, key: string) => (
    <span key={key} className="inline-flex items-center rounded-md px-2 py-1 text-[11.5px] font-bold font-mono tabular-nums text-white whitespace-nowrap" style={{ background: color }}>
      {s.debut}→{s.fin}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {r.matin.map((s, i) => badge(s, TEAL, `m${i}`))}
      {r.apm.map((s, i) => badge(s, ACCENT, `a${i}`))}
    </div>
  );
}

/** Statut visuel d'une ligne (C4) : Conforme / Surcharge / À corriger. */
function StatutLigne({ kind }: { kind: "conforme" | "surcharge" | "alerte" }) {
  const map = {
    conforme: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", label: "Conforme", Icon: CheckCircle2 },
    surcharge: { chip: "bg-amber-50 text-amber-700 ring-amber-600/15", label: "Surcharge", Icon: Zap },
    alerte: { chip: "bg-rose-50 text-rose-700 ring-rose-600/15", label: "À corriger", Icon: AlertTriangle },
  }[kind];
  const { Icon } = map;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset whitespace-nowrap ${map.chip}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden />{map.label}
    </span>
  );
}

/** Éditeur de créneaux d'une demi-journée : 0 à MAX_CRENEAUX plages horaires,
 *  ajoutables et supprimables (un surveillant peut faire plusieurs examens). */
function SlotsEditor({ slots, onChange, def, tint }: { slots: Slot[]; onChange: (s: Slot[]) => void; def: Slot; tint: string }) {
  const cls = "w-[104px] px-2 py-1.5 rounded-lg border border-gray-200 text-[12.5px] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/25";
  if (slots.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange([def])}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />Ajouter
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {slots.map((s, i) => (
        <div key={i} className="inline-flex items-center gap-1">
          <input type="time" value={s.debut} aria-label={`Début créneau ${i + 1}`} onChange={(e) => onChange(slots.map((x, j) => (j === i ? { ...x, debut: e.target.value } : x)))} className={cls} />
          <span className="text-gray-300">–</span>
          <input type="time" value={s.fin} aria-label={`Fin créneau ${i + 1}`} onChange={(e) => onChange(slots.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)))} className={cls} />
          <button type="button" onClick={() => onChange(slots.filter((_, j) => j !== i))} title="Supprimer ce créneau" aria-label={`Supprimer le créneau ${i + 1}`} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {slots.length < MAX_CRENEAUX && (
        <button
          type="button"
          onClick={() => onChange([...slots, def])}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold w-fit hover:opacity-80 transition-opacity"
          style={{ color: tint }}
        >
          <Plus className="w-3 h-3" aria-hidden />créneau
        </button>
      )}
    </div>
  );
}

/** Barre d'un créneau sur la timeline (matin teal, après-midi bleu vif). */
function SlotBar({ slot, color, label }: { slot: Slot; color: string; label: string }) {
  let start: number, end: number;
  try {
    start = parseTimeToMinutes(slot.debut);
    end = parseTimeToMinutes(slot.fin);
  } catch {
    return null;
  }
  if (end <= start) return null;
  const left = Math.max(0, ((start - DAY_START) / DAY_SPAN) * 100);
  const width = Math.min(100 - left, ((end - start) / DAY_SPAN) * 100);
  return (
    <div
      className="absolute top-0 h-full rounded-md flex items-center px-2 text-[10.5px] font-bold text-white overflow-hidden whitespace-nowrap"
      style={{ left: `${left}%`, width: `${width}%`, background: color }}
      title={`${label} · ${slot.debut}–${slot.fin}`}
    >
      {width > 14 ? `${slot.debut}–${slot.fin}` : ""}
    </div>
  );
}

function downloadCSV(name: string, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type QuickFilter = "all" | "no-room" | "matin" | "apm" | "coord" | "salle" | "volant" | "alertes";

const FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "no-room", label: "Sans salle" },
  { key: "matin", label: "Matin" },
  { key: "apm", label: "Après-midi" },
  { key: "coord", label: "Coordinateurs" },
  { key: "salle", label: "Surveillants salle" },
  { key: "volant", label: "Surveillants volants" },
  { key: "alertes", label: "Alertes" },
];

export function PlanificationBoard({
  missions,
  surveillants,
  affectations,
  journal = [],
  refus = [],
}: {
  missions: Mission[];
  surveillants: Surveillant[];
  affectations: Affectation[];
  journal?: JournalEntry[];
  refus?: RefusRow[];
}) {
  const planifiables = useMemo(
    () => missions.filter((m) => estPlanifiable(m.statut)).concat(missions.filter((m) => m.statut === "Terminée")),
    [missions]
  );
  const [missionId, setMissionId] = useState<number | null>(planifiables[0]?.id ?? null);
  const mission = missions.find((m) => m.id === missionId) ?? null;

  const rows = useMemo(() => affectations.filter((a) => a.missionId === missionId), [affectations, missionId]);
  const [edits, setEdits] = useState<Record<number, RowState>>({});
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null); // ligne dépliée (C4)

  const survById = useMemo(() => new Map(surveillants.map((s) => [s.id, s])), [surveillants]);
  const nonAffectes = surveillants.filter((s) => !rows.some((r) => r.surveillantId === s.id));
  const suggestions = suggererSurveillants(nonAffectes, { limite: 6 });

  function stateOf(a: Affectation): RowState {
    return edits[a.id] ?? toRowState(a);
  }
  function isDirty(a: Affectation): boolean {
    if (!edits[a.id]) return false;
    return JSON.stringify(edits[a.id]) !== JSON.stringify(toRowState(a));
  }
  function setRow(a: Affectation, next: RowState) {
    setEdits((prev) => ({ ...prev, [a.id]: next }));
  }
  function surcharge(a: Affectation): boolean {
    return (survById.get(a.surveillantId)?.heures ?? 0) >= SEUIL_SURCHARGE_H;
  }

  function save(a: Affectation) {
    const r = stateOf(a);
    const fields: AffectationFields = {
      salle: r.salle.trim() || null,
      matin: r.matin.length > 0, matinDebut: r.matin[0]?.debut ?? null, matinFin: r.matin[0]?.fin ?? null,
      apm: r.apm.length > 0, apmDebut: r.apm[0]?.debut ?? null, apmFin: r.apm[0]?.fin ?? null,
      matinCreneaux: r.matin, apmCreneaux: r.apm,
    };
    startTransition(async () => {
      const result = await updateAffectation(a.id, fields);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(`Affectation de ${survById.get(a.surveillantId)?.nom ?? "surveillant"} enregistrée`);
        setEdits((prev) => { const n = { ...prev }; delete n[a.id]; return n; });
      }
    });
  }

  function remove(a: Affectation) {
    const nom = survById.get(a.surveillantId)?.nom ?? "ce surveillant";
    if (!confirm(`Retirer ${nom} de cette session ?`)) return;
    startTransition(async () => {
      const result = await deleteAffectation(a.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`${nom} retiré de la session`);
    });
  }

  function add(s: Surveillant) {
    if (!missionId) return;
    startTransition(async () => {
      const result = await addAffectation(missionId, s.id, s.role || "Surveillant salle");
      if (result.error) showToast(result.error, "error");
      else showToast(`${s.nom} ajouté à la session`);
    });
  }

  const journalMission = journal.filter((j) => j.missionId === missionId);

  // ---- Résumé + alertes (sur TOUTES les lignes de la session) ----
  const salles = new Set(rows.map((a) => stateOf(a).salle.trim()).filter(Boolean));
  const affectes = rows.filter((a) => { const r = stateOf(a); return r.matin.length > 0 || r.apm.length > 0; });
  const totalHeures = rows.reduce((s, a) => s + rowHours(stateOf(a)), 0);

  // Rentabilité de la session (§21) : CA vs coût estimé des surveillants.
  const rentabilite = mission
    ? analyseRentabilite({
        caHT: mission.montantHT,
        lignes: rows.map((a) => ({ heures: rowHours(stateOf(a)), tauxHoraire: survById.get(a.surveillantId)?.tauxHoraire ?? 18 })),
      })
    : null;

  // Prédiction de sous-effectif (§21) : surveillants requis vs affectés.
  const couverture = mission ? analyseCouverture({ requis: mission.nbSurveillants, affectes: affectes.length }) : null;

  // Alerte planning : porte sa gravité (C1) et son type (pour reclassement).
  type AlerteKind = "sans-creneau" | "sans-salle" | "horaire-invalide" | "chevauchement" | "conflit";
  type Alerte = { affId: number; text: string; severite: Severite; kind: AlerteKind };
  const alertes: Alerte[] = [];
  for (const a of rows) {
    const r = stateOf(a);
    const nom = survById.get(a.surveillantId)?.nom ?? `#${a.surveillantId}`;
    if (r.matin.length === 0 && r.apm.length === 0) alertes.push({ affId: a.id, severite: "warning", kind: "sans-creneau", text: `${nom} : aucun créneau assigné (ni matin ni après-midi)` });
    else if (!r.salle.trim()) alertes.push({ affId: a.id, severite: "warning", kind: "sans-salle", text: `${nom} : aucune salle affectée` });
    if (r.matin.some((s) => slotHours(s) === 0)) alertes.push({ affId: a.id, severite: "blocant", kind: "horaire-invalide", text: `${nom} : horaire matin invalide (fin ≤ début)` });
    if (r.apm.some((s) => slotHours(s) === 0)) alertes.push({ affId: a.id, severite: "blocant", kind: "horaire-invalide", text: `${nom} : horaire après-midi invalide (fin ≤ début)` });
    if (hasOverlap(r.matin)) alertes.push({ affId: a.id, severite: "blocant", kind: "chevauchement", text: `${nom} : créneaux du matin qui se chevauchent` });
    if (hasOverlap(r.apm)) alertes.push({ affId: a.id, severite: "blocant", kind: "chevauchement", text: `${nom} : créneaux de l'après-midi qui se chevauchent` });
  }

  // Conflits inter-missions : même surveillant, même date, créneaux chevauchants
  // (moteur central detectSupervisorConflicts). L'état d'édition local prime.
  const dateByMission = new Map(missions.map((m) => [m.id, m.dateMission]));
  const assignments: SupervisorAssignmentInput[] = affectations.flatMap((a) => {
    const date = dateByMission.get(a.missionId);
    if (!date) return [];
    const r = a.missionId === missionId ? stateOf(a) : toRowState(a);
    const out: SupervisorAssignmentInput[] = [];
    r.matin.forEach((s, i) =>
      out.push({ id: `${a.id}-matin-${i}`, sessionId: `${date}-matin`, roomId: `${a.missionId}:${r.salle}`, supervisorId: String(a.surveillantId), startTime: s.debut, endTime: s.fin }));
    r.apm.forEach((s, i) =>
      out.push({ id: `${a.id}-apm-${i}`, sessionId: `${date}-apm`, roomId: `${a.missionId}:${r.salle}`, supervisorId: String(a.surveillantId), startTime: s.debut, endTime: s.fin }));
    return out;
  });
  const affBySurvInMission = new Map(rows.map((r) => [String(r.surveillantId), r.id]));
  for (const c of detectSupervisorConflicts(assignments)) {
    const affId = affBySurvInMission.get(c.supervisorId);
    if (affId == null) continue;
    const nom = survById.get(Number(c.supervisorId))?.nom ?? `#${c.supervisorId}`;
    alertes.push({ affId, severite: "blocant", kind: "conflit", text: `${nom} : double affectation le même jour (${c.startTime}–${c.endTime})` });
  }
  const alertAffIds = new Set(alertes.map((a) => a.affId));

  // ---- Centre d'alertes unifié (C1) : taxonomie Bloquant / À surveiller / Information ----
  type CentreItem = { severite: Severite; text: string; affId?: number };
  const centre: CentreItem[] = [];
  // Bloquant — refus surveillants (consolidés depuis l'ancien bandeau « À traiter »)
  for (const rf of refus) {
    centre.push({
      affId: affBySurvInMission.get(String(rf.surveillantId)),
      severite: "blocant",
      text: `${rf.surveillantNom} a refusé son affectation${rf.missionRef ? ` · ${rf.missionRef}` : ""}${rf.motif ? ` — « ${rf.motif} »` : ""}`,
    });
  }
  // Planning : chaque alerte porte déjà sa gravité.
  for (const a of alertes) centre.push({ severite: a.severite, text: a.text, affId: a.affId });
  // À surveiller — sous-effectif (C3) et surcharges de la session.
  if (couverture && couverture.manque > 0) {
    centre.push({ severite: "warning", text: `Sous-effectif : ${couverture.manque} poste${couverture.manque > 1 ? "s" : ""} à pourvoir` });
  }
  for (const a of rows.filter((x) => surcharge(x))) {
    const s = survById.get(a.surveillantId);
    centre.push({ affId: a.id, severite: "warning", text: `${s?.nom ?? `#${a.surveillantId}`} en surcharge — ${s?.heures ?? 0}h planifiées (seuil ${SEUIL_SURCHARGE_H}h)` });
  }
  // Information — mobilisables non affectés (non bloquant, purement indicatif).
  if (nonAffectes.length > 0) {
    centre.push({ severite: "info", text: `${nonAffectes.length} surveillant${nonAffectes.length > 1 ? "s" : ""} mobilisable${nonAffectes.length > 1 ? "s" : ""} non affecté${nonAffectes.length > 1 ? "s" : ""} dans l'annuaire` });
  }
  const centreBySev: Record<Severite, CentreItem[]> = {
    blocant: centre.filter((c) => c.severite === "blocant"),
    warning: centre.filter((c) => c.severite === "warning"),
    info: centre.filter((c) => c.severite === "info"),
  };

  // Score de santé de session (§21) : synthèse couverture + rentabilité + alertes.
  const sante = mission && couverture && rentabilite
    ? scoreSanteSession({
        tauxCouverture: couverture.tauxCouverture,
        manqueSurveillants: couverture.manque,
        tauxMarge: rentabilite.tauxMarge,
        margeNiveau: rentabilite.niveau,
        nbAlertes: alertes.length,
      })
    : null;

  // ---- Statistiques d'en-tête (toutes sessions) ----
  const sessionsCreees = missions.length;
  const sessionsTerminees = missions.filter((m) => m.statut === "Terminée").length;
  const heuresAccumulees = affectations.reduce((s, a) => s + rowHours(toRowState(a)), 0);

  // ---- Recherche + filtres (n'affectent que l'affichage tableau/timeline) ----
  const visibleRows = rows.filter((a) => {
    const r = stateOf(a);
    const s = survById.get(a.surveillantId);
    const role = (a.roleMission ?? s?.role ?? "").toLowerCase();
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = `${s?.nom ?? ""} ${role} ${r.salle}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    switch (filter) {
      case "no-room": return !r.salle.trim();
      case "matin": return r.matin.length > 0;
      case "apm": return r.apm.length > 0;
      case "coord": return role.includes("coordinat");
      case "salle": return role.includes("salle");
      case "volant": return role.includes("volant");
      case "alertes": return alertAffIds.has(a.id);
      default: return true;
    }
  });

  // Couverture par tranche horaire (C2) — présence réelle + trous critiques.
  const couvCreneaux = mission
    ? couvertureParCreneau({
        presences: affectes.map((a) => { const r = stateOf(a); return { id: a.surveillantId, slots: [...r.matin, ...r.apm] }; }),
        requis: mission.nbSurveillants,
        dayStart: DAY_START, dayEnd: DAY_END,
      })
    : null;

  function corriger(affId: number) {
    setHighlightId(affId);
    setExpandedId(affId); // déplie directement l'éditeur inline (C4)
    if (typeof document !== "undefined") {
      document.getElementById(`aff-${affId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightId((cur) => (cur === affId ? null : cur)), 2400);
  }

  // ---- Actions de session ----
  function exportSession() {
    if (!mission) return;
    const header = ["Surveillant", "Rôle", "Salle", "Matin", "Après-midi", "Heures"];
    const lines = rows.map((a) => {
      const r = stateOf(a);
      const s = survById.get(a.surveillantId);
      return [
        s?.nom ?? `#${a.surveillantId}`,
        a.roleMission ?? s?.role ?? "",
        r.salle || "",
        r.matin.map((s) => `${s.debut}-${s.fin}`).join(" | "),
        r.apm.map((s) => `${s.debut}-${s.fin}`).join(" | "),
        `${rowHours(r).toFixed(1)}h`,
      ];
    });
    downloadCSV(`SPC_planning_${mission.client}_${mission.dateMission ?? ""}.csv`, toCSV([header, ...lines]));
    showToast(`Planning exporté (${rows.length} surveillant(s)).`);
  }

  function scrollToTable() {
    document.getElementById("session-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast("Modifie les affectations directement dans le tableau (salle, créneaux, heures).");
  }

  function scrollToCandidats() {
    const el = document.getElementById("copilote") ?? document.getElementById("session-table");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeStatut(next: StatutMission) {
    if (!mission || next === mission.statut) return;
    if (next === "Validée") { valider(); return; }
    const fd = new FormData();
    fd.set("reference", mission.reference);
    fd.set("client", mission.client);
    fd.set("session", mission.session ?? "");
    fd.set("date_mission", mission.dateMission ?? "");
    fd.set("type", mission.type);
    fd.set("nb_salles", String(mission.nbSalles));
    fd.set("nb_surveillants", String(mission.nbSurveillants));
    fd.set("montant_ht", String(mission.montantHT));
    fd.set("statut", next);
    startTransition(async () => {
      const res = await updateMission(mission.id, fd);
      if (res.error) showToast(res.error, "error");
      else showToast(`Statut de session : ${next}`);
    });
  }

  function convocations() {
    if (!mission) return;
    if (affectes.length === 0) { showToast("Aucun surveillant affecté à convoquer.", "error"); return; }
    showToast(`Convocations préparées pour ${affectes.length} surveillant(s) — ${mission.client}.`);
  }

  function confirmerJ48() {
    if (!mission) return;
    showToast(`Confirmation J-48 envoyée à l'équipe — ${mission.client}.`);
  }

  function supprimer() {
    if (!mission) return;
    if (!confirm(`Supprimer la session « ${mission.client} — ${mission.session ?? ""} » du planning ?`)) return;
    startTransition(async () => {
      const res = await deleteMission(mission.id);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`Session ${mission.client} supprimée.`);
        setMissionId(planifiables.find((m) => m.id !== mission.id)?.id ?? null);
        setEdits({});
      }
    });
  }

  // Validation de session (Master Prompt §15.4) — toutes les alertes sont bloquantes.
  function valider() {
    if (!mission) return;
    if (rows.length === 0) { showToast("Impossible de valider : aucun surveillant affecté à la session", "error"); return; }
    const dirty = rows.filter((a) => isDirty(a));
    if (dirty.length > 0) { showToast("Des modifications non enregistrées sont en cours — enregistre chaque ligne avant de valider.", "error"); return; }
    if (alertes.length > 0) {
      showToast(`Impossible de valider :\n• ${alertes.slice(0, 5).map((a) => a.text).join("\n• ")}${alertes.length > 5 ? `\n… et ${alertes.length - 5} autre(s)` : ""}`, "error");
      return;
    }
    startTransition(async () => {
      const result = await validerSession(mission.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`Session ${mission.client} validée — planning verrouillé pour le terrain`);
    });
  }

  const validable = mission && estPlanifiable(mission.statut) && mission.statut !== "Validée";

  return (
    <>
      {/* Barre d'actions (haut de page) */}
      <div className="flex items-center justify-end gap-2 mb-4 flex-wrap">
        <Button variant="secondary" size="sm" onClick={exportSession} disabled={!mission}>
          <Download className="w-3.5 h-3.5" aria-hidden />Exporter
        </Button>
        <Button variant="secondary" size="sm" onClick={scrollToTable} disabled={!mission}>
          <Pencil className="w-3.5 h-3.5" aria-hidden />Modifier
        </Button>
        {validable && (
          <Button variant="accent" size="sm" onClick={valider} disabled={pending} className="!bg-emerald-600 hover:!bg-emerald-700 focus-visible:!ring-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden />Valider
          </Button>
        )}
        <ButtonLink href="/operations/missions" variant="primary" size="sm">
          <Plus className="w-3.5 h-3.5" aria-hidden />Nouvelle session
        </ButtonLink>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {/* Palette distribuée (indigo · bleu · vert sémantique · teal marque) :
            la couleur est répartie, jamais concentrée sur une seule teinte. */}
        <Kpi variant="vivid" label="Total surveillants" value={String(surveillants.length)} sub="dans l'annuaire" accent="indigo" icon={<Users className="w-4 h-4" />} />
        <Kpi variant="vivid" label="Sessions créées" value={String(sessionsCreees)} sub="au total" accent="cyan" icon={<CalendarDays className="w-4 h-4" />} />
        {/* Vert sémantique : sessions clôturées = achevées. */}
        <Kpi variant="vivid" label="Sessions terminées" value={String(sessionsTerminees)} sub="sessions clôturées" accent="emerald" icon={<CalendarCheck className="w-4 h-4" />} />
        {/* Ambre : les heures (temps) — teinte chaude, sort du registre vert/teal. */}
        <Kpi variant="vivid" label="Heures accumulées" value={`${Math.round(heuresAccumulees)}h`} sub="planifiées toutes sessions" accent="amber" icon={<Clock className="w-4 h-4" />} />
      </div>

      {/* Sélecteur de sessions (pastilles date) */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {planifiables.map((m) => {
          const active = m.id === missionId;
          return (
            <button
              key={m.id}
              onClick={() => { setMissionId(m.id); setEdits({}); setFilter("all"); setQuery(""); setExpandedId(null); }}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
                active ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              style={active ? { background: "#0d9488" } : {}}
            >
              <Calendar className={`w-3.5 h-3.5 ${active ? "text-white/80" : "text-gray-400"}`} aria-hidden />
              <span>{dateFR(m.dateMission)}</span>
              <span className={active ? "text-white/60" : "text-gray-400"}>· {m.client}</span>
            </button>
          );
        })}
      </div>

      {mission && (
        <>
          {/* Score de santé de session — synthèse IA (§21) */}
          {sante && (() => {
            const col = sante.niveau === "prête" ? "#059669" : sante.niveau === "à consolider" ? "#d97706" : "#e11d48";
            const pill = sante.niveau === "prête" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : sante.niveau === "à consolider" ? "bg-amber-50 text-amber-700 ring-amber-600/15" : "bg-rose-50 text-rose-700 ring-rose-600/15";
            const R = 34, CIRC = 2 * Math.PI * R, off = CIRC * (1 - sante.score / 100);
            return (
              <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 flex items-center gap-5 flex-wrap">
                <div className="relative w-[92px] h-[92px] flex-shrink-0">
                  <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
                    <circle cx="46" cy="46" r={R} fill="none" stroke="#eef0f2" strokeWidth="8" />
                    <circle cx="46" cy="46" r={R} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={off} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-extrabold text-gray-900 leading-none">{sante.score}</span>
                    <span className="text-[9px] font-bold text-gray-400">/ 100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-extrabold text-gray-900">Santé de la session</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-600/15"><Sparkles className="w-3 h-3" aria-hidden />IA</span>
                    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${pill}`}><span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{sante.niveau}</span>
                  </div>
                  <div className="text-[11.5px] text-gray-400 mt-0.5 mb-2">Synthèse couverture · alertes · rentabilité — {sante.detail.couverture}/40 · {sante.detail.alertes}/35 · {sante.detail.marge}/25</div>
                  <ul className="space-y-1">
                    {sante.recommandations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                        <ArrowRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: col }} aria-hidden />{r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}

          {/* Centre d'alertes unifié (C1) — une seule taxonomie de gravité,
              refus + planning + sous-effectif + surcharges consolidés. */}
          {(() => {
            const total = centre.length;
            if (total === 0) {
              return (
                <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm px-5 py-4 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" aria-hidden />
                  <span className="text-[13px] font-semibold text-emerald-700">Aucune alerte — session sous contrôle.</span>
                </div>
              );
            }
            const order: Severite[] = ["blocant", "warning", "info"];
            const cta: Record<Severite, { label: string; onClick: () => void }> = {
              blocant: { label: "Remplacer", onClick: scrollToTable },
              warning: { label: "Recruter", onClick: scrollToCandidats },
              info: { label: "Voir tout", onClick: scrollToTable },
            };
            return (
              <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-[14px] font-bold text-gray-900">Centre d&apos;alertes</h2>
                    <p className="text-[12px] text-gray-400">Priorités classées par gravité — traiter le bloquant avant de valider</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{total} alerte{total > 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {order.filter((sev) => centreBySev[sev].length > 0).map((sev) => {
                    const items = centreBySev[sev];
                    const meta = SEV_META[sev];
                    const { Icon } = meta;
                    return (
                      <div key={sev} className="p-4 flex gap-3.5" style={{ boxShadow: `inset 3px 0 0 ${meta.bar}` }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.4px] px-2.5 py-1 rounded-full ring-1 ring-inset ${meta.chip}`}>
                              <Icon className="w-3.5 h-3.5" aria-hidden />{meta.label} · {items.length}
                            </span>
                            <button onClick={cta[sev].onClick} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#7c5cff] hover:text-[#5b3ecc] transition-colors">
                              {cta[sev].label} <ArrowRight className="w-3 h-3" aria-hidden />
                            </button>
                          </div>
                          <ul className="space-y-1.5">
                            {items.slice(0, 4).map((it, i) => (
                              <li key={i} className="flex items-center justify-between gap-3 text-[12.5px] text-slate-600">
                                <span className="min-w-0 truncate">{it.text}</span>
                                {it.affId != null && alertAffIds.has(it.affId) && (
                                  <button onClick={() => corriger(it.affId!)} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
                                    Corriger <ArrowRight className="w-3 h-3" aria-hidden />
                                  </button>
                                )}
                              </li>
                            ))}
                            {items.length > 4 && (
                              <li className="text-[11.5px] text-gray-400">+ {items.length - 4} de plus</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Résumé de session — carte claire, tuiles colorées (direction vibrante) */}
          <div className="rounded-2xl mb-5 bg-white border border-gray-200/80 shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#1a6b7e]">Résumé de session</div>
                  <div className="text-[16px] font-extrabold mt-0.5 text-gray-900">{mission.client} — {dateFR(mission.dateMission)}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{mission.statut}</span>
                  {validable && (
                    <button onClick={valider} disabled={pending} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[12.5px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      <ShieldCheck className="w-4 h-4" aria-hidden />Valider la session
                    </button>
                  )}
                  {mission.statut === "Validée" && (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
                      <ShieldCheck className="w-4 h-4" aria-hidden />Session validée
                    </span>
                  )}
                </div>
              </div>
              {/* Tuiles à fond coloré, palette distribuée (indigo · bleu · teal · vert) —
                  couleur = vie, mais chiffre en encre pour la hiérarchie premium. */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: "Surveillants", value: String(rows.length), bg: "bg-indigo-50 border-indigo-100", lab: "text-indigo-600" },
                  { label: "Salles", value: String(salles.size), bg: "bg-sky-50 border-sky-100", lab: "text-sky-600" },
                  { label: "Affectés", value: String(affectes.length), bg: "bg-teal-50 border-teal-100", lab: "text-teal-700" },
                  { label: "Heures tot.", value: `${totalHeures.toFixed(1)}h`, bg: "bg-amber-50 border-amber-100", lab: "text-amber-600" },
                ].map((k) => (
                  <div key={k.label} className={`rounded-xl px-4 py-3 text-center border ${k.bg}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-[1px] ${k.lab}`}>{k.label}</div>
                    <div className="text-[20px] font-extrabold mt-0.5 text-slate-900">{k.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rentabilité de la session (§21) */}
          {rentabilite && (() => {
            const n = rentabilite.niveau;
            const tone = n === "saine" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : n === "surveiller" ? "bg-amber-50 text-amber-700 ring-amber-600/15" : "bg-rose-50 text-rose-700 ring-rose-600/15";
            const label = n === "saine" ? "Marge saine" : n === "surveiller" ? "Marge à surveiller" : "Marge critique";
            return (
              <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-[14px] font-bold text-gray-900">Rentabilité de la session</h2>
                    <p className="text-[12px] text-gray-400">CA HT − coût estimé des surveillants ({rentabilite.heuresTotal.toFixed(1)}h planifiées)</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${tone}`}>
                    <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{label} · {Math.round(rentabilite.tauxMarge * 100)} %
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                  {[
                    { label: "CA HT", value: euro(rentabilite.caHT), accent: "text-gray-900" },
                    { label: "Coût surveillants", value: euro(rentabilite.coutHT), accent: "text-slate-600" },
                    { label: "Marge HT", value: euro(rentabilite.margeHT), accent: rentabilite.margeHT >= 0 ? "text-emerald-700" : "text-rose-600" },
                    { label: "Taux de marge", value: `${Math.round(rentabilite.tauxMarge * 100)} %`, accent: n === "saine" ? "text-emerald-700" : n === "surveiller" ? "text-amber-700" : "text-rose-600" },
                  ].map((m) => (
                    <div key={m.label} className="px-5 py-3.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[.8px] text-gray-400">{m.label}</div>
                      <div className={`text-[17px] font-extrabold mt-0.5 ${m.accent}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Couverture surveillants — reformulée (C3) : le manque en premier,
              barre = couverture réelle, CTA d'action directement sous l'alerte. */}
          {couverture && (() => {
            const map = {
              "complet": { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", bar: "#059669", label: "Effectif complet", big: "text-emerald-700" },
              "tendu": { pill: "bg-amber-50 text-amber-700 ring-amber-600/15", bar: "#d97706", label: "Effectif tendu", big: "text-amber-700" },
              "sous-effectif": { pill: "bg-rose-50 text-rose-700 ring-rose-600/15", bar: "#e11d48", label: "Sous-effectif", big: "text-rose-600" },
            }[couverture.niveau];
            const pct = Math.min(100, Math.round(couverture.tauxCouverture * 100));
            const complet = couverture.manque === 0;
            return (
              <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-[14px] font-bold text-gray-900">Couverture surveillants</h2>
                    <p className="text-[12.5px] text-slate-600 mt-0.5">
                      <span className="font-bold text-gray-900">{couverture.affectes}</span> sur {couverture.requis} poste{couverture.requis > 1 ? "s" : ""} pourvu{couverture.affectes > 1 ? "s" : ""}
                    </p>
                  </div>
                  {/* Le nombre manquant mène (plus actionnable qu'un %). */}
                  <div className="text-right flex-shrink-0">
                    {complet ? (
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-700"><CheckCircle2 className="w-5 h-5" aria-hidden />Effectif complet</div>
                    ) : (
                      <>
                        <div className={`text-[34px] font-extrabold leading-none ${map.big}`}>{couverture.manque}</div>
                        <div className="text-[11px] font-bold uppercase tracking-[.6px] text-gray-400 mt-1">manquant{couverture.manque > 1 ? "s" : ""}</div>
                      </>
                    )}
                  </div>
                </div>
                {/* La barre reflète la couverture réelle, pas le manque. */}
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: map.bar }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${map.pill}`}>
                    <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{map.label} · {pct} % de couverture
                  </span>
                  {!complet && (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-rose-600">
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden />Action requise
                    </span>
                  )}
                </div>
                {/* CTA direct sous l'alerte — mène au copilote / tableau où se fait l'ajout.
                    Le bouton « Ajouter un surveillant » canonique reste dans la barre du
                    tableau (toujours disponible) : on évite ainsi le doublon d'action. */}
                {!complet && (
                  <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                    <Button variant="accent" size="sm" onClick={scrollToCandidats}>
                      <UserSearch className="w-3.5 h-3.5" aria-hidden />Voir les candidats
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tableau d'affectation — vue condensée avec éditeur déplié au clic (C4) */}
          <div id="session-table" className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  {mission.client} — {mission.session ?? "Session"}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{mission.statut}</span>
                  {alertes.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/15">{alertes.length} à corriger</span>
                  )}
                </h2>
                <p className="text-[12px] text-gray-400 mt-0.5">{dateFR(mission.dateMission)} · cliquer une ligne pour éditer les horaires</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <select
                  value={mission.statut}
                  onChange={(e) => changeStatut(e.target.value as StatutMission)}
                  disabled={pending}
                  aria-label="Statut de la session"
                  className="px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-[12.5px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-50"
                >
                  {statutOptions(mission.statut).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {nonAffectes.length > 0 && <SurveillantPicker surveillants={nonAffectes} onSelect={add} disabled={pending} />}
                <Button variant="secondary" size="sm" onClick={convocations}><Send className="w-3.5 h-3.5" aria-hidden />Convocations</Button>
                <Button variant="secondary" size="sm" onClick={confirmerJ48}><CalendarCheck className="w-3.5 h-3.5" aria-hidden />Confirmer J-48</Button>
                <Button variant="danger" size="sm" onClick={supprimer} disabled={pending}><Trash2 className="w-3.5 h-3.5" aria-hidden />Supprimer</Button>
              </div>
            </div>

            {/* Recherche + filtres rapides */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-[320px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un surveillant, une salle, un rôle…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILTERS.map((f) => {
                  const active = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      aria-pressed={active}
                      className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${
                        active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Surveillant", "Rôle · Salle", "Planning", "Heures", "Statut", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10.5px] font-bold text-slate-500 uppercase tracking-[.8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant affecté à cette session.</td></tr>
                  )}
                  {rows.length > 0 && visibleRows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant ne correspond à la recherche / au filtre.</td></tr>
                  )}
                  {visibleRows.map((a) => {
                    const s = survById.get(a.surveillantId);
                    const r = stateOf(a);
                    const dirty = isDirty(a);
                    const h = rowHours(r);
                    const idx = rows.indexOf(a);
                    const highlight = highlightId === a.id;
                    const expanded = expandedId === a.id;
                    const enAlerte = alertAffIds.has(a.id);
                    const enSurcharge = surcharge(a);
                    const statutKind = enAlerte ? "alerte" : enSurcharge ? "surcharge" : "conforme";
                    // Teinte de ligne (C2/C4) : alerte > surcharge > dirty > hover.
                    const rowTint = highlight
                      ? "bg-amber-50 ring-2 ring-inset ring-amber-300"
                      : enAlerte ? "bg-rose-50/50 hover:bg-rose-50"
                      : enSurcharge ? "bg-amber-50/40 hover:bg-amber-50"
                      : dirty ? "bg-blue-50/40" : "hover:bg-blue-50/20";
                    const toggle = () => setExpandedId((cur) => (cur === a.id ? null : a.id));
                    return (
                      <Fragment key={a.id}>
                        {/* Clic sur la ligne = déplier (confort souris). Le contrat
                            clavier/AT passe par le bouton chevron dédié ci-dessous. */}
                        <tr
                          id={`aff-${a.id}`}
                          onClick={toggle}
                          className={`border-b border-gray-50 last:border-0 transition-colors cursor-pointer ${rowTint}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                                {initials(s?.nom ?? "??")}
                              </span>
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-gray-800">{s?.nom ?? `Surveillant #${a.surveillantId}`}</div>
                                {enSurcharge && (
                                  <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 mt-0.5">
                                    <Zap className="w-3 h-3" aria-hidden />{s?.heures ?? 0}h planifiées
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1.5">
                              <RoleBadge role={a.roleMission ?? s?.role ?? ""} />
                              {r.salle.trim() ? (
                                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden />{r.salle}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600"><MapPin className="w-3.5 h-3.5" aria-hidden />Salle à définir</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3"><PlanningBadges r={r} /></td>
                          <td className={`px-5 py-3 text-[13.5px] font-extrabold whitespace-nowrap ${enAlerte || enSurcharge ? "text-rose-600" : "text-gray-900"}`}>
                            {h > 0 ? `${h.toFixed(1)}h` : <span className="text-gray-300 font-normal">—</span>}
                          </td>
                          <td className="px-5 py-3"><StatutLigne kind={statutKind} /></td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {dirty && (
                                <button onClick={(e) => { e.stopPropagation(); save(a); }} disabled={pending} title="Enregistrer les modifications" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11.5px] font-bold disabled:opacity-40" style={{ background: ACCENT }}>
                                  <Check className="w-3.5 h-3.5" />Enregistrer
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); toggle(); }} title={expanded ? "Replier" : "Modifier les horaires"} aria-label={expanded ? "Replier l'éditeur d'horaires" : "Déplier l'éditeur d'horaires"} aria-expanded={expanded} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); remove(a); }} disabled={pending} title="Retirer de la session" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-slate-50/70 border-b border-gray-100">
                            <td colSpan={6} className="px-5 py-4">
                              <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                                <div>
                                  <div className="text-[10.5px] font-bold uppercase tracking-[.8px] text-slate-500 mb-1.5">Salle</div>
                                  <input
                                    value={r.salle}
                                    onChange={(e) => setRow(a, { ...r, salle: e.target.value })}
                                    placeholder="Salle…"
                                    className={`w-[110px] px-2.5 py-1.5 rounded-lg border text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${r.salle.trim() ? "border-gray-200" : "border-amber-300 bg-amber-50/40"}`}
                                  />
                                </div>
                                <div>
                                  <div className="text-[10.5px] font-bold uppercase tracking-[.8px] mb-1.5 flex items-center gap-1.5" style={{ color: TEAL }}><span className="w-2 h-2 rounded-full" style={{ background: TEAL }} />Matin</div>
                                  <SlotsEditor slots={r.matin} onChange={(slots) => setRow(a, { ...r, matin: slots })} def={DEF_MATIN} tint={TEAL} />
                                </div>
                                <div>
                                  <div className="text-[10.5px] font-bold uppercase tracking-[.8px] mb-1.5 flex items-center gap-1.5" style={{ color: ACCENT }}><span className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />Après-midi</div>
                                  <SlotsEditor slots={r.apm} onChange={(slots) => setRow(a, { ...r, apm: slots })} def={DEF_APM} tint={ACCENT} />
                                </div>
                                <div className="ml-auto flex items-center gap-2 self-end">
                                  <span className="text-[12px] font-semibold text-slate-500">{h.toFixed(1)}h au total</span>
                                  {dirty && (
                                    <button onClick={() => save(a)} disabled={pending} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12px] font-bold disabled:opacity-40" style={{ background: ACCENT }}>
                                      <Check className="w-3.5 h-3.5" />Enregistrer
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50/70 border-t border-gray-100">
                      <td colSpan={3} className="px-5 py-3 text-right text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">
                        Total heures planifiées dans la session
                      </td>
                      <td className="px-5 py-3 text-[15px] font-extrabold text-gray-900">{totalHeures.toFixed(1)}h</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Copilote d'affectation — suggestions explicables (§21) */}
          {validable && suggestions.length > 0 && (
            <div id="copilote" className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center gap-2.5">
                <span aria-hidden className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900">Copilote d&apos;affectation · IA</h2>
                  <p className="text-[12px] text-gray-400">Surveillants mobilisables classés par fiabilité et charge — vous gardez la décision</p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map(({ surveillant: s, score, reasons }, i) => {
                  const tone = score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 60 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300 transition-colors">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {initials(s.nom)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-800 truncate">{s.nom}</span>
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${tone}`} title="Score d'adéquation /100">{score}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reasons.slice(0, 4).map((r, j) => (
                            <span key={j} className="text-[10.5px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{r}</span>
                          ))}
                        </div>
                      </div>
                      <Button variant="accent" size="sm" onClick={() => add(s)} disabled={pending} aria-label={`Affecter ${s.nom}`}>
                        <Plus className="w-3.5 h-3.5" aria-hidden />Affecter
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Présence par créneau (timeline) — surcharges en rouge + panneau de
              couverture horaire avec trous critiques (C2). */}
          {affectes.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900">Présence par créneau</h2>
                  <p className="text-[12px] text-gray-400">{dateFR(mission.dateMission)} · amplitude 08:00 – 19:00</p>
                </div>
                <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-gray-600"><span className="w-3 h-3 rounded" style={{ background: TEAL }} />Matin</span>
                  <span className="inline-flex items-center gap-1.5 text-gray-600"><span className="w-3 h-3 rounded" style={{ background: ACCENT }} />Après-midi</span>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-5 space-y-2.5 min-w-0">
                  {/* Graduation horaire */}
                  <div className="flex items-center gap-3 pl-[220px] max-[720px]:pl-0">
                    <div className="relative flex-1 h-4 text-[10px] text-gray-400 font-mono">
                      {[8, 10, 12, 14, 16, 18].map((hh) => (
                        <span key={hh} className="absolute -translate-x-1/2" style={{ left: `${((hh * 60 - DAY_START) / DAY_SPAN) * 100}%` }}>{String(hh).padStart(2, "0")}:00</span>
                      ))}
                    </div>
                  </div>
                  {(visibleRows.filter((a) => { const r = stateOf(a); return r.matin.length > 0 || r.apm.length > 0; })).map((a) => {
                    const s = survById.get(a.surveillantId);
                    const r = stateOf(a);
                    const idx = rows.indexOf(a);
                    const enAlerte = alertAffIds.has(a.id);
                    const enSurcharge = surcharge(a);
                    return (
                      <div key={a.id} className={`flex items-center gap-3 flex-wrap max-[720px]:gap-1.5 rounded-lg -mx-2 px-2 py-1 ${enAlerte ? "bg-rose-50/60" : enSurcharge ? "bg-amber-50/50" : ""}`}>
                        <div className="flex items-center gap-2.5 w-[220px] max-[720px]:w-full flex-shrink-0">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                            {initials(s?.nom ?? "??")}
                          </span>
                          <span className="text-[12.5px] font-semibold text-gray-800 truncate">{s?.nom ?? `#${a.surveillantId}`}</span>
                          {enSurcharge && (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase text-amber-600 bg-amber-100 rounded px-1 py-0.5" title={`Surcharge — seuil ${SEUIL_SURCHARGE_H}h`}>
                              <Zap className="w-2.5 h-2.5" aria-hidden />Surcharge
                            </span>
                          )}
                          <span className={`text-[11.5px] font-bold ml-auto ${enAlerte || enSurcharge ? "text-rose-600" : "text-gray-500"}`}>{rowHours(r).toFixed(1)}h</span>
                        </div>
                        <div className="relative flex-1 min-w-[280px] h-7 rounded-lg bg-slate-100/70 overflow-hidden">
                          {r.matin.map((s, i) => <SlotBar key={`m${i}`} slot={s} color={TEAL} label="Matin" />)}
                          {r.apm.map((s, i) => <SlotBar key={`a${i}`} slot={s} color={ACCENT} label="Après-midi" />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Mini-panneau de couverture par tranche (C2) */}
                {couvCreneaux && (
                  <div className="border-t lg:border-t-0 lg:border-l border-gray-100 p-4 w-full lg:w-[240px] flex-shrink-0 bg-slate-50/40">
                    <div className="text-[10.5px] font-bold uppercase tracking-[.8px] text-slate-500 mb-2.5">Couverture</div>
                    <ul className="space-y-1.5">
                      {couvCreneaux.creneaux.filter((c) => c.actif).map((c) => {
                        const tone = c.niveau === "complet" ? { txt: "text-emerald-700", dot: "#059669" }
                          : c.niveau === "partiel" ? { txt: "text-amber-700", dot: "#d97706" }
                          : { txt: "text-rose-600", dot: "#e11d48" };
                        return (
                          <li key={c.label} className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="font-mono tabular-nums text-slate-500">{c.label}</span>
                            <span className={`inline-flex items-center gap-1.5 font-bold ${tone.txt}`}>
                              {c.presents}/{c.requis}
                              {c.niveau === "complet" ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> : <AlertTriangle className="w-3.5 h-3.5" aria-hidden />}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className={`mt-3 pt-3 border-t border-gray-200/70 flex items-center justify-between text-[11.5px] font-bold ${couvCreneaux.trousCritiques > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      <span>Trous critiques</span>
                      <span className="text-[15px]">{couvCreneaux.trousCritiques}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Journal de session — append-only (Master Prompt §15.6) */}
          {journalMission.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
                <h2 className="text-[14px] font-bold text-gray-900">Journal de session</h2>
                <p className="text-[12px] text-gray-400">Historique immuable des modifications — utilisateur, date, ancienne et nouvelle valeur</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Date", "Utilisateur", "Objet", "Ancienne valeur", "Nouvelle valeur"].map((h) => (
                        <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {journalMission.slice(0, 12).map((j) => (
                      <tr key={j.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">
                          {new Date(j.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-5 py-2.5 text-[12px] text-gray-600 whitespace-nowrap">{j.utilisateur}</td>
                        <td className="px-5 py-2.5 text-[12.5px] font-semibold text-gray-800">{j.objet}</td>
                        <td className="px-5 py-2.5 text-[12px] text-gray-500">{j.ancienne ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-2.5 text-[12px] font-medium text-gray-700">{j.nouvelle ?? <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {journalMission.length > 12 && (
                <div className="px-5 py-2.5 text-[11.5px] text-gray-400 border-t border-gray-100">
                  {journalMission.length - 12} entrée(s) plus ancienne(s) non affichée(s)
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
