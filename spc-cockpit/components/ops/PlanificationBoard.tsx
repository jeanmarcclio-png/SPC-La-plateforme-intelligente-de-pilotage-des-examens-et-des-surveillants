"use client";

import { useState, useMemo, useTransition } from "react";
import type { Mission, Surveillant, Affectation, JournalEntry, StatutMission } from "@/lib/operations/types";
import { updateAffectation, addAffectation, deleteAffectation, type AffectationFields } from "@/app/actions/affectations";
import { validerSession, updateMission, deleteMission } from "@/app/actions/missions";
import { SurveillantPicker } from "@/components/ops/SurveillantPicker";
import { Kpi } from "@/components/ops/Kpi";
import { Button, ButtonLink } from "@/components/ops/Button";
import { showToast } from "@/components/Toast";
import { dateFR } from "@/lib/operations/format";
import { toCSV } from "@/lib/operations/csv";
import { parseTimeToMinutes, detectSupervisorConflicts, type SupervisorAssignmentInput } from "@/lib/operations/engine";
import { statutOptions, estPlanifiable } from "@/lib/operations/mission-status";
import { suggererSurveillants } from "@/lib/operations/suggestions";
import {
  AlertTriangle, Trash2, Check, ShieldCheck, Calendar, CalendarDays, CalendarCheck,
  Download, Pencil, Plus, Send, Users, Clock, Search, ArrowRight, Sparkles,
} from "lucide-react";

const ACCENT = "#2563eb";
const NAVY = "#0d2137";
const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

// Amplitude de la timeline « présence par créneau » : 08:00 → 19:00.
const DAY_START = 8 * 60;
const DAY_END = 19 * 60;
const DAY_SPAN = DAY_END - DAY_START;

type Slot = { on: boolean; debut: string; fin: string };
type RowState = { salle: string; matin: Slot; apm: Slot };

function toRowState(a: Affectation): RowState {
  return {
    salle: a.salle ?? "",
    matin: { on: a.matin, debut: a.matinDebut ?? "08:00", fin: a.matinFin ?? "13:00" },
    apm: { on: a.apm, debut: a.apmDebut ?? "13:30", fin: a.apmFin ?? "18:00" },
  };
}

function slotHours(s: Slot): number {
  if (!s.on) return 0;
  try {
    const mins = parseTimeToMinutes(s.fin) - parseTimeToMinutes(s.debut);
    return mins > 0 ? mins / 60 : 0;
  } catch {
    return 0;
  }
}

function rowHours(r: RowState): number {
  return slotHours(r.matin) + slotHours(r.apm);
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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${on ? "" : "bg-gray-200"}`}
      style={on ? { background: NAVY } : {}}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function TimeInputs({ slot, onChange }: { slot: Slot; onChange: (s: Slot) => void }) {
  if (!slot.on) return <span className="text-[12px] text-gray-300">—</span>;
  const cls = "w-[112px] px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12.5px] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/25";
  return (
    <span className="inline-flex items-center gap-1">
      <input type="time" value={slot.debut} onChange={(e) => onChange({ ...slot, debut: e.target.value })} className={cls} />
      <span className="text-gray-300">–</span>
      <input type="time" value={slot.fin} onChange={(e) => onChange({ ...slot, fin: e.target.value })} className={cls} />
    </span>
  );
}

/** Barre d'un créneau sur la timeline (matin navy, après-midi bleu vif). */
function SlotBar({ slot, color, label }: { slot: Slot; color: string; label: string }) {
  if (!slot.on) return null;
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
      matin: r.matin.on, matinDebut: r.matin.debut, matinFin: r.matin.fin,
      apm: r.apm.on, apmDebut: r.apm.debut, apmFin: r.apm.fin,
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
  const affectes = rows.filter((a) => { const r = stateOf(a); return r.matin.on || r.apm.on; });
  const totalHeures = rows.reduce((s, a) => s + rowHours(stateOf(a)), 0);

  type Alerte = { affId: number; text: string };
  const alertes: Alerte[] = [];
  for (const a of rows) {
    const r = stateOf(a);
    const nom = survById.get(a.surveillantId)?.nom ?? `#${a.surveillantId}`;
    if (!r.matin.on && !r.apm.on) alertes.push({ affId: a.id, text: `${nom} : aucun créneau assigné (ni matin ni après-midi)` });
    else if (!r.salle.trim()) alertes.push({ affId: a.id, text: `${nom} : aucune salle affectée` });
    if (r.matin.on && slotHours(r.matin) === 0) alertes.push({ affId: a.id, text: `${nom} : horaire matin invalide (fin ≤ début)` });
    if (r.apm.on && slotHours(r.apm) === 0) alertes.push({ affId: a.id, text: `${nom} : horaire après-midi invalide (fin ≤ début)` });
  }

  // Conflits inter-missions : même surveillant, même date, créneaux chevauchants
  // (moteur central detectSupervisorConflicts). L'état d'édition local prime.
  const dateByMission = new Map(missions.map((m) => [m.id, m.dateMission]));
  const assignments: SupervisorAssignmentInput[] = affectations.flatMap((a) => {
    const date = dateByMission.get(a.missionId);
    if (!date) return [];
    const r = a.missionId === missionId ? stateOf(a) : toRowState(a);
    const out: SupervisorAssignmentInput[] = [];
    if (r.matin.on)
      out.push({ id: `${a.id}-matin`, sessionId: `${date}-matin`, roomId: `${a.missionId}:${r.salle}`, supervisorId: String(a.surveillantId), startTime: r.matin.debut, endTime: r.matin.fin });
    if (r.apm.on)
      out.push({ id: `${a.id}-apm`, sessionId: `${date}-apm`, roomId: `${a.missionId}:${r.salle}`, supervisorId: String(a.surveillantId), startTime: r.apm.debut, endTime: r.apm.fin });
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
      case "matin": return r.matin.on;
      case "apm": return r.apm.on;
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
        r.matin.on ? `${r.matin.debut}-${r.matin.fin}` : "",
        r.apm.on ? `${r.apm.debut}-${r.apm.fin}` : "",
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
        <Kpi label="Total surveillants" value={String(surveillants.length)} sub="dans l'annuaire" accent="indigo" icon={<Users className="w-4 h-4" />} />
        <Kpi label="Sessions créées" value={String(sessionsCreees)} sub="au total" accent="blue" icon={<CalendarDays className="w-4 h-4" />} />
        {/* Carte mise en avant — bleu nuit (§5) */}
        <div className="rounded-2xl border border-white/10 shadow-sm p-5 text-white" style={{ background: NAVY }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-white/50">Sessions terminées</span>
            <span aria-hidden className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 text-white/80"><CalendarCheck className="w-4 h-4" /></span>
          </div>
          <div className="text-[26px] font-extrabold leading-none">{sessionsTerminees}</div>
          <div className="text-[12px] mt-1.5 text-white/60 font-semibold">sessions clôturées</div>
        </div>
        <Kpi label="Heures accumulées" value={`${Math.round(heuresAccumulees)}h`} sub="planifiées toutes sessions" accent="emerald" icon={<Clock className="w-4 h-4" />} />
      </div>

      {/* Sélecteur de sessions (pastilles date) */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {planifiables.map((m) => {
          const active = m.id === missionId;
          return (
            <button
              key={m.id}
              onClick={() => { setMissionId(m.id); setEdits({}); setFilter("all"); setQuery(""); }}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                active ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              style={active ? { background: NAVY } : {}}
            >
              <Calendar className={`w-3.5 h-3.5 ${active ? "text-[#7fb2ff]" : "text-gray-400"}`} aria-hidden />
              <span>{dateFR(m.dateMission)}</span>
              <span className={active ? "text-white/50" : "text-gray-400"}>· {m.client}</span>
            </button>
          );
        })}
      </div>

      {mission && (
        <>
          {/* Résumé de session (bleu nuit) */}
          <div className="rounded-2xl p-5 mb-5 text-white shadow-sm" style={{ background: NAVY }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#7fb2ff]">Résumé de session</div>
                <div className="text-[16px] font-extrabold mt-0.5">{mission.client} — {dateFR(mission.dateMission)}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 text-white/70">{mission.statut}</span>
                {validable && (
                  <button onClick={valider} disabled={pending} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-[12.5px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                    <ShieldCheck className="w-4 h-4" aria-hidden />Valider la session
                  </button>
                )}
                {mission.statut === "Validée" && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-300">
                    <ShieldCheck className="w-4 h-4" aria-hidden />Session validée
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { label: "Surveillants", value: String(rows.length) },
                { label: "Salles", value: String(salles.size) },
                { label: "Affectés", value: String(affectes.length) },
                { label: "Heures tot.", value: `${totalHeures.toFixed(1)}h` },
              ].map((k) => (
                <div key={k.label} className="rounded-xl bg-white/[0.06] border border-white/[0.06] px-4 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[1px] text-white/40">{k.label}</div>
                  <div className="text-[20px] font-extrabold mt-0.5">{k.value}</div>
                </div>
              ))}
            </div>
            {alertes.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {alertes.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-[12px] text-white/75">
                    <span className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{a.text}</span>
                    </span>
                    <button onClick={() => corriger(a.affId)} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#7fb2ff] hover:text-white transition-colors flex-shrink-0">
                      Corriger <ArrowRight className="w-3 h-3" aria-hidden />
                    </button>
                  </div>
                ))}
                {alertes.length > 5 && (
                  <div className="text-[11.5px] text-[#7fb2ff]">+ {alertes.length - 5} alerte(s) supplémentaire(s)</div>
                )}
              </div>
            )}
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
              <table className="w-full border-collapse min-w-[1040px]">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: NAVY }}>
                    {["Surveillant", "Rôle", "Salle", "● Matin", "● Après-midi", "Heures", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10.5px] font-bold text-white/60 uppercase tracking-[.8px]">{h}</th>
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
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Toggle on={r.matin.on} onChange={(v) => setRow(a, { ...r, matin: { ...r.matin, on: v } })} />
                            <TimeInputs slot={r.matin} onChange={(slot) => setRow(a, { ...r, matin: slot })} />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Toggle on={r.apm.on} onChange={(v) => setRow(a, { ...r, apm: { ...r.apm, on: v } })} />
                            <TimeInputs slot={r.apm} onChange={(slot) => setRow(a, { ...r, apm: slot })} />
                          </div>
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

          {/* Présence par créneau (timeline) */}
          {affectes.length > 0 && (
            <div className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-[14px] font-bold text-gray-900">Présence par créneau</h2>
                  <p className="text-[12px] text-gray-400">{dateFR(mission.dateMission)} · amplitude 08:00 – 19:00</p>
                </div>
                <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-gray-600"><span className="w-3 h-3 rounded" style={{ background: NAVY }} />Matin</span>
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
                {(visibleRows.filter((a) => { const r = stateOf(a); return r.matin.on || r.apm.on; })).map((a) => {
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
                        <SlotBar slot={r.matin} color={NAVY} label="Matin" />
                        <SlotBar slot={r.apm} color={ACCENT} label="Après-midi" />
                      </div>
                    </div>
                  );
                })}
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
