"use client";

import { useState, useMemo, useTransition } from "react";
import type { Mission, Surveillant, Affectation, JournalEntry } from "@/lib/operations/types";
import { updateAffectation, addAffectation, deleteAffectation, type AffectationFields } from "@/app/actions/affectations";
import { validerSession } from "@/app/actions/missions";
import { SurveillantPicker } from "@/components/ops/SurveillantPicker";
import { showToast } from "@/components/Toast";
import { dateFR } from "@/lib/operations/format";
import { parseTimeToMinutes, detectSupervisorConflicts, type SupervisorAssignmentInput } from "@/lib/operations/engine";
import { AlertTriangle, Trash2, Check, ShieldCheck } from "lucide-react";

const ACCENT = "#2563eb";
const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

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

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${on ? "" : "bg-gray-200"}`}
      style={on ? { background: "#0d2137" } : {}}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function TimeInputs({ slot, onChange }: { slot: Slot; onChange: (s: Slot) => void }) {
  if (!slot.on) return <span className="text-[12px] text-gray-300">—</span>;
  const cls = "w-[74px] px-2 py-1.5 rounded-lg border border-gray-200 text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25";
  return (
    <span className="inline-flex items-center gap-1">
      <input type="time" value={slot.debut} onChange={(e) => onChange({ ...slot, debut: e.target.value })} className={cls} />
      <span className="text-gray-300">–</span>
      <input type="time" value={slot.fin} onChange={(e) => onChange({ ...slot, fin: e.target.value })} className={cls} />
    </span>
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
    () => missions.filter((m) => m.statut === "En cours" || m.statut === "Planifiée" || m.statut === "Validée").concat(missions.filter((m) => m.statut === "Terminée")),
    [missions]
  );
  const [missionId, setMissionId] = useState<number | null>(planifiables[0]?.id ?? null);
  const mission = missions.find((m) => m.id === missionId) ?? null;

  const rows = useMemo(() => affectations.filter((a) => a.missionId === missionId), [affectations, missionId]);
  const [edits, setEdits] = useState<Record<number, RowState>>({});
  const [pending, startTransition] = useTransition();

  const survById = useMemo(() => new Map(surveillants.map((s) => [s.id, s])), [surveillants]);
  const nonAffectes = surveillants.filter((s) => !rows.some((r) => r.surveillantId === s.id));

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
      matin: r.matin.on,
      matinDebut: r.matin.debut,
      matinFin: r.matin.fin,
      apm: r.apm.on,
      apmDebut: r.apm.debut,
      apmFin: r.apm.fin,
    };
    startTransition(async () => {
      const result = await updateAffectation(a.id, fields);
      if (result.error) {
        showToast(result.error, "error");
      } else {
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

  // Résumé + alertes
  const salles = new Set(rows.map((a) => stateOf(a).salle.trim()).filter(Boolean));
  const affectes = rows.filter((a) => { const r = stateOf(a); return r.matin.on || r.apm.on; });
  const totalHeures = rows.reduce((s, a) => s + rowHours(stateOf(a)), 0);

  const alertes: string[] = [];
  for (const a of rows) {
    const r = stateOf(a);
    const nom = survById.get(a.surveillantId)?.nom ?? `#${a.surveillantId}`;
    if (!r.matin.on && !r.apm.on) alertes.push(`${nom} : aucun créneau assigné (ni matin ni après-midi)`);
    else if (!r.salle.trim()) alertes.push(`${nom} : aucune salle affectée`);
    if (r.matin.on && slotHours(r.matin) === 0) alertes.push(`${nom} : horaire matin invalide (fin ≤ début)`);
    if (r.apm.on && slotHours(r.apm) === 0) alertes.push(`${nom} : horaire après-midi invalide (fin ≤ début)`);
  }

  // Conflits inter-missions : même surveillant, même date, créneaux chevauchants
  // (moteur central — detectSupervisorConflicts). L'état d'édition local prime.
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
  const survIdsMission = new Set(rows.map((r) => String(r.surveillantId)));
  for (const c of detectSupervisorConflicts(assignments)) {
    if (!survIdsMission.has(c.supervisorId)) continue;
    const nom = survById.get(Number(c.supervisorId))?.nom ?? `#${c.supervisorId}`;
    alertes.push(`${nom} : double affectation le même jour (${c.startTime}–${c.endTime})`);
  }

  // Validation de session (Master Prompt §15.4) — toutes les alertes sont bloquantes.
  function valider() {
    if (!mission) return;
    if (rows.length === 0) {
      showToast("Impossible de valider : aucun surveillant affecté à la session", "error");
      return;
    }
    const dirty = rows.filter((a) => isDirty(a));
    if (dirty.length > 0) {
      showToast("Des modifications non enregistrées sont en cours — enregistre chaque ligne avant de valider.", "error");
      return;
    }
    if (alertes.length > 0) {
      showToast(`Impossible de valider :\n• ${alertes.slice(0, 5).join("\n• ")}${alertes.length > 5 ? `\n… et ${alertes.length - 5} autre(s)` : ""}`, "error");
      return;
    }
    startTransition(async () => {
      const result = await validerSession(mission.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`Session ${mission.client} validée — planning verrouillé pour le terrain`);
    });
  }

  return (
    <>
      {/* Sélecteur de mission */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {planifiables.map((m) => {
          const active = m.id === missionId;
          return (
            <button
              key={m.id}
              onClick={() => { setMissionId(m.id); setEdits({}); }}
              aria-pressed={active}
              className={`px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                active ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
              style={active ? { background: "#0d2137" } : {}}
            >
              {m.client} · {dateFR(m.dateMission)}
            </button>
          );
        })}
      </div>

      {mission && (
        <>
          {/* Résumé de session */}
          <div className="rounded-2xl p-5 mb-5 text-white shadow-sm" style={{ background: "#0d2137" }}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#7fb2ff]">Résumé de session</div>
                <div className="text-[16px] font-extrabold mt-0.5">{mission.client} — {dateFR(mission.dateMission)}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 text-white/70">{mission.statut}</span>
                {mission.statut !== "Validée" && mission.statut !== "Terminée" && (
                  <button
                    onClick={valider}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-[12.5px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden />
                    Valider la session
                  </button>
                )}
                {mission.statut === "Validée" && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-300">
                    <ShieldCheck className="w-4 h-4" aria-hidden />
                    Session validée
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
                {alertes.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-white/75">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    {a}
                  </div>
                ))}
                {alertes.length > 4 && (
                  <div className="text-[11.5px] text-[#7fb2ff]">+ {alertes.length - 4} alerte(s) supplémentaire(s)</div>
                )}
              </div>
            )}
          </div>

          {/* Tableau d'affectation */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900">{mission.client} — {mission.session ?? "Session"}</h2>
                <p className="text-[12px] text-gray-400">{dateFR(mission.dateMission)} · {alertes.length} alerte{alertes.length !== 1 ? "s" : ""}</p>
              </div>
              {nonAffectes.length > 0 && (
                <SurveillantPicker surveillants={nonAffectes} onSelect={add} disabled={pending} />
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#0d2137" }}>
                    {["Surveillant", "Salle", "● Matin", "● Après-midi", "Heures", ""].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10.5px] font-bold text-white/60 uppercase tracking-[.8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant affecté à cette session.</td></tr>
                  )}
                  {rows.map((a, i) => {
                    const s = survById.get(a.surveillantId);
                    const r = stateOf(a);
                    const dirty = isDirty(a);
                    const h = rowHours(r);
                    return (
                      <tr key={a.id} className={`border-b border-gray-50 last:border-0 transition-colors ${dirty ? "bg-blue-50/40" : "hover:bg-blue-50/20"}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                            >
                              {(s?.nom ?? "??").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                            </span>
                            <div>
                              <div className="text-[13px] font-semibold text-gray-800">{s?.nom ?? `Surveillant #${a.surveillantId}`}</div>
                              <div className="text-[11.5px] text-gray-400">{a.roleMission ?? s?.role ?? ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={r.salle}
                            onChange={(e) => setRow(a, { ...r, salle: e.target.value })}
                            placeholder="Salle…"
                            className="w-[86px] px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/25"
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
                              <button
                                onClick={() => save(a)}
                                disabled={pending}
                                title="Enregistrer les modifications"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11.5px] font-bold disabled:opacity-40"
                                style={{ background: ACCENT }}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Enregistrer
                              </button>
                            )}
                            <button
                              onClick={() => remove(a)}
                              disabled={pending}
                              title="Retirer de la session"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                            >
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
                      <td colSpan={4} className="px-5 py-3 text-right text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">
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
