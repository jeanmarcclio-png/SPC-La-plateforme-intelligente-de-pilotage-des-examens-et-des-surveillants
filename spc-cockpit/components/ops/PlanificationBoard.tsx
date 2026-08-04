"use client";

import { useState, useMemo, useTransition } from "react";
import type { Mission, Surveillant, Affectation, JournalEntry, StatutMission } from "@/lib/operations/types";
import { updateAffectation, addAffectation, deleteAffectation, type AffectationFields } from "@/app/actions/affectations";
import { validerSession, updateMission, deleteMission } from "@/app/actions/missions";
import { SurveillantPicker } from "@/components/ops/SurveillantPicker";
import { Button, ButtonLink } from "@/components/ops/Button";
import { showToast } from "@/components/Toast";
import { dateFR, euro } from "@/lib/operations/format";
import { analyseRentabilite } from "@/lib/operations/rentabilite";
import { analyseCouverture } from "@/lib/operations/couverture";
import { scoreSanteSession } from "@/lib/operations/sante-session";
import { toCSV } from "@/lib/operations/csv";
import { parseTimeToMinutes, detectSupervisorConflicts, type SupervisorAssignmentInput } from "@/lib/operations/engine";
import { statutOptions, estPlanifiable } from "@/lib/operations/mission-status";
import { suggererSurveillants } from "@/lib/operations/suggestions";
import {
  Trash2, Check, ShieldCheck, Calendar, CalendarDays, CalendarCheck,
  Download, Pencil, Plus, Send, Users, Clock, Search, ArrowRight, Sparkles,
  List, Map as MapIcon, CalendarRange, MoreVertical, TrendingUp, Bell, Building2, Layers,
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

// Surface de travail de la vue Planning opérationnel (§7.2). La vue Commandement
// (en-tête + cartes + bandeau financier) reste toujours affichée au-dessus.
type WorkspaceView = "liste" | "planning" | "gantt" | "carte";
const VIEWS: { key: WorkspaceView; label: string; icon: React.ReactNode }[] = [
  { key: "liste", label: "Liste", icon: <List className="w-3.5 h-3.5" aria-hidden /> },
  { key: "planning", label: "Planning", icon: <CalendarDays className="w-3.5 h-3.5" aria-hidden /> },
  { key: "gantt", label: "Gantt", icon: <CalendarRange className="w-3.5 h-3.5" aria-hidden /> },
  { key: "carte", label: "Carte", icon: <MapIcon className="w-3.5 h-3.5" aria-hidden /> },
];

// Heures en français : « 66,25 h » (virgule décimale, jusqu'à 2 décimales).
function heuresFR(h: number): string {
  return `${h.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;
}

/** Carte de commandement (bloc synthèse §6.2). */
function CmdCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">{icon}</span>
        <h2 className="text-[13px] font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function PlanificationBoard({
  missions,
  surveillants,
  affectations,
  journal = [],
}: {
  missions: Mission[];
  surveillants: Surveillant[];
  affectations: Affectation[];
  journal?: JournalEntry[];
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
  const [view, setView] = useState<WorkspaceView>("liste");
  const [journalOpen, setJournalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
  const creneauxCount = rows.reduce((n, a) => { const r = stateOf(a); return n + r.matin.length + r.apm.length; }, 0);

  // Rentabilité de la session (§21) : CA vs coût estimé des surveillants.
  const rentabilite = mission
    ? analyseRentabilite({
        caHT: mission.montantHT,
        lignes: rows.map((a) => ({ heures: rowHours(stateOf(a)), tauxHoraire: survById.get(a.surveillantId)?.tauxHoraire ?? 18 })),
      })
    : null;

  // Prédiction de sous-effectif (§21) : surveillants requis vs affectés.
  const couverture = mission ? analyseCouverture({ requis: mission.nbSurveillants, affectes: affectes.length }) : null;

  type Alerte = { affId: number; text: string };
  const alertes: Alerte[] = [];
  for (const a of rows) {
    const r = stateOf(a);
    const nom = survById.get(a.surveillantId)?.nom ?? `#${a.surveillantId}`;
    if (r.matin.length === 0 && r.apm.length === 0) alertes.push({ affId: a.id, text: `${nom} : aucun créneau assigné (ni matin ni après-midi)` });
    else if (!r.salle.trim()) alertes.push({ affId: a.id, text: `${nom} : aucune salle affectée` });
    if (r.matin.some((s) => slotHours(s) === 0)) alertes.push({ affId: a.id, text: `${nom} : horaire matin invalide (fin ≤ début)` });
    if (r.apm.some((s) => slotHours(s) === 0)) alertes.push({ affId: a.id, text: `${nom} : horaire après-midi invalide (fin ≤ début)` });
    if (hasOverlap(r.matin)) alertes.push({ affId: a.id, text: `${nom} : créneaux du matin qui se chevauchent` });
    if (hasOverlap(r.apm)) alertes.push({ affId: a.id, text: `${nom} : créneaux de l'après-midi qui se chevauchent` });
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
    alertes.push({ affId, text: `${nom} : double affectation le même jour (${c.startTime}–${c.endTime})` });
  }
  const alertAffIds = new Set(alertes.map((a) => a.affId));

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

  function corriger(affId: number) {
    setHighlightId(affId);
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
      {/* ── Vue Commandement — en-tête de mission (§6.1) ── */}
      {mission && (() => {
        const statutTone = mission.statut === "En cours"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
          : mission.statut === "Validée"
            ? "bg-indigo-50 text-indigo-700 ring-indigo-600/15"
            : "bg-sky-50 text-sky-700 ring-sky-600/15";
        return (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 md:p-6 mb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#1a6b7e]">Session principale</div>
                <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                  <h1 className="text-[24px] md:text-[27px] font-extrabold text-gray-900 tracking-tight">{mission.client} — {dateFR(mission.dateMission)}</h1>
                  <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${statutTone}`}><span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{mission.statut}</span>
                </div>
                <div className="flex items-center gap-3.5 mt-2 text-[12.5px] text-gray-500 flex-wrap">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" aria-hidden />{dateFR(mission.dateMission)}</span>
                  <span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-gray-400" aria-hidden />{mission.client}</span>
                  <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-gray-400" aria-hidden />{salles.size} salles</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden />{creneauxCount} créneaux</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {nonAffectes.length > 0 && <SurveillantPicker surveillants={nonAffectes} onSelect={add} disabled={pending} />}
                <Button variant="secondary" onClick={convocations}><Send className="w-4 h-4" aria-hidden />Convocations</Button>
                <Button variant="secondary" onClick={confirmerJ48}><CalendarCheck className="w-4 h-4" aria-hidden />Confirmer J-48</Button>
                {validable && (
                  <Button variant="accent" onClick={valider} disabled={pending} className="!bg-emerald-600 hover:!bg-emerald-700 focus-visible:!ring-emerald-400"><ShieldCheck className="w-4 h-4" aria-hidden />Valider la session</Button>
                )}
                <div className="relative">
                  <button onClick={() => setMenuOpen((v) => !v)} aria-label="Plus d'actions" className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"><MoreVertical className="w-4 h-4" aria-hidden /></button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} aria-hidden />
                      <div className="absolute right-0 top-12 z-30 w-56 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden py-1">
                        <button onClick={() => { setMenuOpen(false); exportSession(); }} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-gray-700 hover:bg-gray-50"><Download className="w-4 h-4 text-gray-400" aria-hidden />Exporter le planning</button>
                        <button onClick={() => { setMenuOpen(false); scrollToTable(); }} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-gray-700 hover:bg-gray-50"><Pencil className="w-4 h-4 text-gray-400" aria-hidden />Modifier les affectations</button>
                        <ButtonLink href="/operations/missions" variant="ghost" size="sm" className="!w-full !justify-start !px-3.5 !rounded-none !py-2.5"><Plus className="w-4 h-4 text-gray-400" aria-hidden />Nouvelle session</ButtonLink>
                        <button onClick={() => { setMenuOpen(false); supprimer(); }} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" aria-hidden />Supprimer la session</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 5 cartes de commandement (§6.2) ── */}
      {mission && sante && couverture && rentabilite && (() => {
        const covPct = Math.min(100, Math.round(couverture.tauxCouverture * 100));
        const santeCol = sante.niveau === "prête" ? "#059669" : sante.niveau === "à consolider" ? "#d97706" : "#e11d48";
        const santePill = sante.niveau === "prête" ? "bg-emerald-50 text-emerald-700" : sante.niveau === "à consolider" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
        const margeTone = rentabilite.niveau === "saine" ? "bg-emerald-50 text-emerald-700" : rentabilite.niveau === "surveiller" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
        const margeLabel = rentabilite.niveau === "saine" ? "Marge saine" : rentabilite.niveau === "surveiller" ? "Marge à surveiller" : "Marge critique";
        const RR = 26, CIRC = 2 * Math.PI * RR, off = CIRC * (1 - sante.score / 100);
        const moy = affectes.length ? totalHeures / affectes.length : 0;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 mb-4">
            {/* Carte 1 — Santé */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex flex-col">
              <div className="flex items-center gap-3">
                <div className="relative w-[62px] h-[62px] flex-shrink-0">
                  <svg width="62" height="62" viewBox="0 0 62 62" className="-rotate-90"><circle cx="31" cy="31" r={RR} fill="none" stroke="#eef0f2" strokeWidth="6" /><circle cx="31" cy="31" r={RR} fill="none" stroke={santeCol} strokeWidth="6" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={off} /></svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[16px] font-extrabold text-gray-900 leading-none">{sante.score}</span><span className="text-[8px] font-bold text-gray-400">/ 100</span></div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-[13px] font-bold text-gray-900">Santé de la session</h2>
                  <span className={`inline-flex mt-1 items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${santePill}`}>{sante.niveau}</span>
                </div>
              </div>
              <ul className="mt-2.5 space-y-1 flex-1">
                {sante.recommandations.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-slate-600"><ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: santeCol }} aria-hidden />{r}</li>
                ))}
              </ul>
              <button onClick={() => setView("liste")} className="mt-2 text-[11.5px] font-semibold text-gray-500 hover:text-gray-800 text-left">Voir le détail</button>
            </div>

            {/* Carte 2 — Couverture */}
            <CmdCard title="Couverture surveillants" icon={<Users className="w-4 h-4" />}>
              <div className="text-[26px] font-extrabold leading-none text-gray-900">{couverture.affectes} <span className="text-[15px] text-gray-400 font-bold">/ {couverture.requis} requis</span></div>
              {couverture.manque > 0 && <div className="text-[11.5px] text-rose-600 font-semibold mt-1">{couverture.manque} surveillants à trouver</div>}
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${covPct}%`, background: couverture.manque > 0 ? "#e11d48" : "#059669" }} /></div>
              <div className="text-[11.5px] text-gray-500 mt-1">{covPct} % de couverture</div>
              <button onClick={() => setView("liste")} className="mt-2 text-[11.5px] font-semibold text-gray-500 hover:text-gray-800 text-left">Voir la couverture</button>
            </CmdCard>

            {/* Carte 3 — Marge estimée */}
            <CmdCard title="Marge estimée" icon={<TrendingUp className="w-4 h-4" />}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[26px] font-extrabold leading-none text-emerald-600">{Math.round(rentabilite.tauxMarge * 100)} %</span>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${margeTone}`}>{margeLabel}</span>
              </div>
              <div className="text-[12px] text-gray-500 mt-1.5">Marge HT <span className="font-bold text-gray-800">{euro(rentabilite.margeHT)}</span></div>
              <div className="text-[11.5px] text-gray-400">Sur CA HT de {euro(rentabilite.caHT)}</div>
              <button onClick={() => setView("liste")} className="mt-2 text-[11.5px] font-semibold text-gray-500 hover:text-gray-800 text-left">Voir l&apos;analyse</button>
            </CmdCard>

            {/* Carte 4 — Heures planifiées */}
            <CmdCard title="Heures planifiées" icon={<Clock className="w-4 h-4" />}>
              <div className="text-[26px] font-extrabold leading-none text-gray-900">{heuresFR(totalHeures)}</div>
              <div className="text-[11.5px] text-gray-400 mt-1">Planifiées sur la session</div>
              <div className="text-[12px] text-gray-500 mt-1.5">Moyenne / surveillant <span className="font-bold text-gray-800">{heuresFR(moy)}</span></div>
              <button onClick={() => setView("gantt")} className="mt-2 text-[11.5px] font-semibold text-gray-500 hover:text-gray-800 text-left">Voir le planning</button>
            </CmdCard>

            {/* Carte 5 — Refus / alertes */}
            <CmdCard title="Refus / alertes" icon={<Bell className="w-4 h-4" />}>
              <div className="text-[26px] font-extrabold leading-none text-gray-900">{alertes.length}</div>
              <div className="text-[11.5px] text-gray-400 mt-1">alerte{alertes.length > 1 ? "s" : ""} active{alertes.length > 1 ? "s" : ""}</div>
              <ul className="mt-1.5 space-y-0.5 flex-1">
                {alertes.slice(0, 2).map((a, i) => (
                  <li key={i}><button onClick={() => { setView("liste"); corriger(a.affId); }} title={a.text} className="text-[11px] text-slate-500 hover:text-rose-600 truncate text-left w-full">• {a.text}</button></li>
                ))}
                {alertes.length === 0 && <li className="text-[11px] text-emerald-600">Aucune alerte — session saine</li>}
              </ul>
              <button onClick={() => { setFilter("alertes"); setView("liste"); }} className="mt-2 text-[11.5px] font-semibold text-gray-500 hover:text-gray-800 text-left">Voir les alertes</button>
            </CmdCard>
          </div>
        );
      })()}

      {/* ── Bandeau financier — Rentabilité de la session (§6.3) ── */}
      {mission && rentabilite && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm mb-5 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-[13px] font-bold text-gray-900">Rentabilité de la session</h2>
            <p className="text-[11.5px] text-gray-400">Marge HT = CA HT − coût surveillants · Taux = marge ÷ CA — calculés automatiquement</p>
          </div>
          <div className="flex items-stretch divide-x divide-gray-100 flex-wrap">
            {[
              { label: "CA HT", value: euro(rentabilite.caHT), accent: "text-gray-900" },
              { label: "Coût surveillants", value: euro(rentabilite.coutHT), accent: "text-slate-600" },
              { label: "Marge HT", value: euro(rentabilite.margeHT), accent: rentabilite.margeHT >= 0 ? "text-emerald-700" : "text-rose-600" },
              { label: "Taux de marge", value: `${Math.round(rentabilite.tauxMarge * 100)} %`, accent: "text-emerald-700" },
            ].map((m) => (
              <div key={m.label} className="flex-1 min-w-[150px] px-5 py-3.5"><div className="text-[10.5px] font-bold uppercase tracking-[.8px] text-gray-400">{m.label}</div><div className={`text-[19px] font-extrabold mt-0.5 ${m.accent}`}>{m.value}</div></div>
            ))}
            <div className="flex items-center px-4"><button onClick={() => setView("liste")} className="text-[12px] font-semibold text-[#2563eb] hover:underline whitespace-nowrap">Voir le détail financier</button></div>
          </div>
        </div>
      )}

      {/* Onglets de session (§6.4) */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {planifiables.map((m) => {
          const active = m.id === missionId;
          return (
            <button
              key={m.id}
              onClick={() => { setMissionId(m.id); setEdits({}); setFilter("all"); setQuery(""); }}
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
          {/* ── Vue Planning opérationnel — espace de travail (§7) ── */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-900">Affectations &amp; créneaux</h2>
              <p className="text-[12px] text-gray-400">Charges, disponibilités et conflits en temps réel</p>
            </div>
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-0.5">
              {VIEWS.map((v) => (
                <button key={v.key} onClick={() => setView(v.key)} aria-pressed={view === v.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${view === v.key ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>{v.icon}{v.label}</button>
              ))}
            </div>
          </div>

          {/* Tableau d'affectation */}
          <div id="session-table" className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  {mission.client} — {mission.session ?? "Session"}
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{mission.statut}</span>
                  {alertes.length > 0 && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15">{alertes.length} alerte{alertes.length > 1 ? "s" : ""}</span>
                  )}
                </h2>
                <p className="text-[12px] text-gray-400 mt-0.5">{dateFR(mission.dateMission)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <label className="text-[11px] font-semibold text-gray-400 mr-0.5">Statut</label>
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

            {view === "carte" && (
              <div className="p-12 text-center text-[13px] text-gray-400 flex flex-col items-center gap-2"><MapIcon className="w-8 h-8 text-gray-300" aria-hidden />Vue carte des salles — bientôt disponible.</div>
            )}
            {view === "gantt" && (
              <div className="px-5 py-6 text-center text-[12.5px] text-gray-400">Chronologie détaillée affichée ci-dessous.</div>
            )}
            {(view === "liste" || view === "planning") && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[1040px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Surveillant", "Rôle", "Salle", "● Matin", "● Après-midi", "Heures", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10.5px] font-bold text-slate-500 uppercase tracking-[.8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant affecté à cette session.</td></tr>
                  )}
                  {rows.length > 0 && visibleRows.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant ne correspond à la recherche / au filtre.</td></tr>
                  )}
                  {visibleRows.map((a) => {
                    const s = survById.get(a.surveillantId);
                    const r = stateOf(a);
                    const dirty = isDirty(a);
                    const h = rowHours(r);
                    const idx = rows.indexOf(a);
                    const highlight = highlightId === a.id;
                    return (
                      <tr
                        key={a.id}
                        id={`aff-${a.id}`}
                        className={`border-b border-gray-50 last:border-0 transition-colors ${highlight ? "bg-amber-50 ring-2 ring-inset ring-amber-300" : dirty ? "bg-blue-50/40" : "hover:bg-blue-50/20"}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                              {initials(s?.nom ?? "??")}
                            </span>
                            <div className="text-[13px] font-semibold text-gray-800">{s?.nom ?? `Surveillant #${a.surveillantId}`}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><RoleBadge role={a.roleMission ?? s?.role ?? ""} /></td>
                        <td className="px-5 py-3">
                          <input
                            value={r.salle}
                            onChange={(e) => setRow(a, { ...r, salle: e.target.value })}
                            placeholder="Salle…"
                            className={`w-[86px] px-2.5 py-1.5 rounded-lg border text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${r.salle.trim() ? "border-gray-200" : "border-amber-300 bg-amber-50/40"}`}
                          />
                        </td>
                        <td className="px-5 py-3 align-top">
                          <SlotsEditor slots={r.matin} onChange={(slots) => setRow(a, { ...r, matin: slots })} def={DEF_MATIN} tint={TEAL} />
                        </td>
                        <td className="px-5 py-3 align-top">
                          <SlotsEditor slots={r.apm} onChange={(slots) => setRow(a, { ...r, apm: slots })} def={DEF_APM} tint={ACCENT} />
                        </td>
                        <td className="px-5 py-3 text-[13.5px] font-extrabold text-gray-900 whitespace-nowrap">
                          {h > 0 ? `${h.toFixed(1)}h` : <span className="text-gray-300 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {dirty && (
                              <button onClick={() => save(a)} disabled={pending} title="Enregistrer les modifications" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11.5px] font-bold disabled:opacity-40" style={{ background: ACCENT }}>
                                <Check className="w-3.5 h-3.5" />Enregistrer
                              </button>
                            )}
                            <button onClick={() => remove(a)} disabled={pending} title="Retirer de la session" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50/70 border-t border-gray-100">
                      <td colSpan={5} className="px-5 py-3 text-right text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">
                        Total heures planifiées dans la session
                      </td>
                      <td className="px-5 py-3 text-[15px] font-extrabold text-gray-900">{totalHeures.toFixed(1)}h</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            )}
          </div>

          {/* Copilote d'affectation — suggestions explicables (§21) */}
          {validable && suggestions.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
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

          {/* Présence par créneau — chronologie (vues Gantt / Planning) */}
          {(view === "gantt" || view === "planning") && affectes.length > 0 && (
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
              <div className="p-5 space-y-2.5">
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
                  return (
                    <div key={a.id} className="flex items-center gap-3 flex-wrap max-[720px]:gap-1.5">
                      <div className="flex items-center gap-2.5 w-[220px] max-[720px]:w-full flex-shrink-0">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}>
                          {initials(s?.nom ?? "??")}
                        </span>
                        <span className="text-[12.5px] font-semibold text-gray-800 truncate">{s?.nom ?? `#${a.surveillantId}`}</span>
                        <span className="text-[11.5px] font-bold text-gray-500 ml-auto">{rowHours(r).toFixed(1)}h</span>
                      </div>
                      <div className="relative flex-1 min-w-[280px] h-7 rounded-lg bg-slate-100/70 overflow-hidden">
                        {r.matin.map((s, i) => <SlotBar key={`m${i}`} slot={s} color={TEAL} label="Matin" />)}
                        {r.apm.map((s, i) => <SlotBar key={`a${i}`} slot={s} color={ACCENT} label="Après-midi" />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Journal de session — append-only (Master Prompt §15.6), replié par défaut */}
          {journalMission.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <button onClick={() => setJournalOpen((v) => !v)} aria-expanded={journalOpen} className="w-full px-5 pt-4.5 pb-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors">
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900">Journal de session</h2>
                  <p className="text-[12px] text-gray-400">Historique immuable des modifications — {journalMission.length} entrée{journalMission.length > 1 ? "s" : ""}</p>
                </div>
                <span className={`text-gray-400 transition-transform ${journalOpen ? "rotate-180" : ""}`}><ArrowRight className="w-4 h-4 rotate-90" aria-hidden /></span>
              </button>
              {journalOpen && (
              <>
              <div className="overflow-x-auto border-t border-gray-100">
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
              </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
