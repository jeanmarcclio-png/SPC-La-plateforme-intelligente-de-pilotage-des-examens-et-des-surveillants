"use client";

// Mode Terrain (E1) — vue mobile jour J pour le coordinateur. MVP branché sur
// les vraies données : pointage présence (setPresence), remplacement en 2 clics
// via le moteur de suggestion existant (suggererSurveillants + addAffectation),
// couverture réelle. Le scan QR est remplacé par un pointage manuel ; la
// géolocalisation et les notifications push ne sont pas câblées (hors périmètre).

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import type { Mission, Surveillant, Affectation, Presence } from "@/lib/operations/types";
import { setPresence, addAffectation } from "@/app/actions/affectations";
import { suggererSurveillants } from "@/lib/operations/suggestions";
import { analyseCouverture } from "@/lib/operations/couverture";
import { showToast } from "@/components/Toast";
import { dateFR } from "@/lib/operations/format";
import {
  ArrowLeft, Users, DoorOpen, Bell, Plus, X, AlertTriangle, Check, Clock,
  MapPin, Zap, ClipboardCheck, FileText, Sparkles, ShieldAlert, ChevronRight, UserPlus,
} from "lucide-react";

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];
const TEAL = "#0f766e";

function initials(nom: string): string {
  return (nom ?? "??").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function hasSlot(a: Affectation): boolean {
  return a.matin || a.apm || (a.matinCreneaux?.length ?? 0) > 0 || (a.apmCreneaux?.length ?? 0) > 0;
}

function schedule(a: Affectation): string {
  const matin = a.matinCreneaux?.length ? a.matinCreneaux : a.matin ? [{ debut: a.matinDebut ?? "", fin: a.matinFin ?? "" }] : [];
  const apm = a.apmCreneaux?.length ? a.apmCreneaux : a.apm ? [{ debut: a.apmDebut ?? "", fin: a.apmFin ?? "" }] : [];
  return [...matin, ...apm].filter((s) => s.debut && s.fin).map((s) => `${s.debut}–${s.fin}`).join(" · ");
}

function roleShort(role: string): string {
  const r = (role ?? "").toLowerCase();
  if (r.includes("coordinat")) return "COORD";
  if (r.includes("volant")) return "VOLANT";
  if (r.includes("pmr")) return "PMR";
  return "SALLE";
}

/** Pastille de présence (pointage). */
function PresenceDot({ p }: { p: Presence }) {
  const map: Record<Presence, { c: string; label: string; Icon: typeof Check }> = {
    "Présent": { c: "bg-emerald-500", label: "Présent", Icon: Check },
    "Absent": { c: "bg-rose-500", label: "Absent", Icon: X },
    "En attente": { c: "bg-amber-400", label: "Attente", Icon: Clock },
  };
  const { Icon } = map[p];
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white ${map[p].c}`} title={map[p].label} aria-label={map[p].label}>
      <Icon className="w-3 h-3" />
    </span>
  );
}

type Tab = "terrain" | "salles" | "pointage" | "alertes";

export function TerrainMode({ mission, surveillants, affectations }: { mission: Mission; surveillants: Surveillant[]; affectations: Affectation[] }) {
  const [tab, setTab] = useState<Tab>("terrain");
  const [fabOpen, setFabOpen] = useState(false);
  const [replaceFor, setReplaceFor] = useState<Affectation | null>(null);
  const [pending, startTransition] = useTransition();

  const survById = useMemo(() => new Map(surveillants.map((s) => [s.id, s])), [surveillants]);
  const rows = affectations;
  const presents = rows.filter((a) => a.presence === "Présent");
  const absents = rows.filter((a) => a.presence === "Absent");
  const nonAffectes = useMemo(() => surveillants.filter((s) => !rows.some((r) => r.surveillantId === s.id)), [surveillants, rows]);
  const couverture = analyseCouverture({ requis: mission.nbSurveillants, affectes: rows.filter(hasSlot).length });
  const sansSalle = rows.filter((a) => !a.salle?.trim());

  // Salles regroupées + statut (critique si un absent, warning si sans salle / sous-effectif local).
  const salleGroups = useMemo(() => {
    const m = new Map<string, Affectation[]>();
    for (const a of rows) { const s = a.salle?.trim() || "Sans salle"; (m.get(s) ?? m.set(s, []).get(s)!).push(a); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  // Alertes terrain hiérarchisées.
  const alertes: { niveau: "blocant" | "warning"; text: string; sub?: string; aff?: Affectation }[] = [];
  for (const a of absents) alertes.push({ niveau: "blocant", text: `${survById.get(a.surveillantId)?.nom ?? "Surveillant"} absent`, sub: `${a.salle?.trim() || "sans salle"} · ${schedule(a) || "horaires à définir"}`, aff: a });
  if (couverture.manque > 0) alertes.push({ niveau: "warning", text: `Sous-effectif : ${couverture.manque} poste${couverture.manque > 1 ? "s" : ""} à pourvoir`, sub: `${couverture.affectes}/${couverture.requis} affectés` });
  for (const a of sansSalle) alertes.push({ niveau: "warning", text: `${survById.get(a.surveillantId)?.nom ?? "Surveillant"} sans salle`, sub: schedule(a) || "horaires à définir", aff: a });

  const salleOk = salleGroups.filter(([nom, list]) => nom !== "Sans salle" && !list.some((a) => a.presence === "Absent")).length;
  const salleTotal = salleGroups.filter(([nom]) => nom !== "Sans salle").length;

  function pointer(a: Affectation, statut: Presence) {
    const nom = survById.get(a.surveillantId)?.nom ?? "Surveillant";
    startTransition(async () => {
      const r = await setPresence(a.id, statut);
      if (r.error) showToast(r.error, "error");
      else showToast(`${nom} — ${statut.toLowerCase()}`);
    });
  }
  function confirmerRemplacement(s: Surveillant) {
    startTransition(async () => {
      const r = await addAffectation(mission.id, s.id, s.role || "Surveillant salle");
      if (r.error) showToast(r.error, "error");
      else { showToast(`${s.nom} affecté·e en remplacement`); setReplaceFor(null); }
    });
  }

  const live = mission.statut === "En cours";

  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      {/* Header fixe */}
      <div className="sticky top-0 z-20 -mx-3 md:-mx-5 px-3 md:px-5 py-3 flex items-center gap-3 text-white shadow-sm" style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }}>
        <Link href="/operations/planification" aria-label="Retour à la planification" className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0">
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold truncate">{mission.client}</span>
            {live && <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500 px-1.5 py-0.5 rounded-full motion-safe:animate-pulse"><span className="w-1 h-1 rounded-full bg-white" />LIVE</span>}
          </div>
          <div className="text-[11px] text-slate-400">{mission.session ?? "Session"} · {dateFR(mission.dateMission)}</div>
        </div>
      </div>

      <div className="pt-4 pb-28">
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { v: `${presents.length}/${rows.length}`, l: "Présents", c: presents.length >= rows.length * 0.8 ? "text-emerald-600" : presents.length >= rows.length * 0.5 ? "text-amber-600" : "text-rose-600" },
            { v: String(absents.length), l: "Absents", c: absents.length > 0 ? "text-rose-600" : "text-emerald-600" },
            { v: String(alertes.length), l: "Alertes", c: alertes.length > 0 ? "text-rose-600" : "text-slate-500" },
            { v: `${salleOk}/${salleTotal}`, l: "Salles OK", c: salleOk >= salleTotal ? "text-emerald-600" : "text-amber-600" },
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-xl p-2.5 text-center shadow-sm border border-slate-100">
              <div className={`text-[17px] font-extrabold leading-none ${s.c}`}>{s.v}</div>
              <div className="text-[9.5px] text-slate-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── Onglet TERRAIN ── */}
        {tab === "terrain" && (
          <div className="space-y-4">
            {alertes.length > 0 && (
              <div className="space-y-2">
                {alertes.slice(0, 2).map((al, i) => {
                  const blocant = al.niveau === "blocant";
                  return (
                    <div key={i} className={`rounded-2xl border p-3 flex items-center gap-3 ${blocant ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                      {blocant ? <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" /> : <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className={`text-[12.5px] font-bold ${blocant ? "text-rose-700" : "text-amber-700"}`}>{al.text}</div>
                        {al.sub && <div className="text-[11px] text-slate-500 truncate">{al.sub}</div>}
                      </div>
                      {blocant && al.aff && al.aff.presence === "Absent" && (
                        <button onClick={() => setReplaceFor(al.aff!)} className="flex-shrink-0 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors">Remplacer</button>
                      )}
                    </div>
                  );
                })}
                {alertes.length > 2 && (
                  <button onClick={() => setTab("alertes")} className="w-full text-center text-[11.5px] font-semibold text-slate-500 hover:text-slate-700">+ {alertes.length - 2} autre{alertes.length - 2 > 1 ? "s" : ""} alerte{alertes.length - 2 > 1 ? "s" : ""}</button>
                )}
              </div>
            )}

            {/* Grid surveillants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" />Sur le terrain <span className="text-slate-400">{rows.length}</span></h2>
                <button onClick={() => setTab("pointage")} className="inline-flex items-center gap-1 text-[11.5px] font-bold text-teal-700"><ClipboardCheck className="w-3.5 h-3.5" />Pointer</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {rows.map((a, i) => {
                  const s = survById.get(a.surveillantId);
                  const border = a.presence === "Présent" ? "border-emerald-500" : a.presence === "Absent" ? "border-rose-400 opacity-70" : "border-dashed border-amber-400";
                  return (
                    <div key={a.id} className={`relative bg-white rounded-2xl border-2 ${border} p-2.5 flex flex-col items-center text-center`}>
                      <span className="absolute top-1.5 right-1.5"><PresenceDot p={a.presence} /></span>
                      <span className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initials(s?.nom ?? "??")}</span>
                      <span className="text-[11px] font-semibold text-gray-800 mt-1.5 leading-tight line-clamp-2">{s?.nom ?? `#${a.surveillantId}`}</span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">{roleShort(a.roleMission ?? s?.role ?? "")}</span>
                      <span className="mt-1 inline-flex items-center gap-0.5 text-[9.5px] font-semibold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md"><MapPin className="w-2.5 h-2.5" />{a.salle?.trim() || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Absences */}
            {absents.length > 0 && (
              <div>
                <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5 mb-2"><AlertTriangle className="w-4 h-4 text-rose-500" />Absences <span className="text-rose-500">{absents.length}</span></h2>
                <div className="space-y-2">
                  {absents.map((a) => {
                    const s = survById.get(a.surveillantId);
                    return (
                      <div key={a.id} className="bg-white rounded-2xl border border-rose-200 p-3 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-full bg-slate-400 text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">{initials(s?.nom ?? "??")}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-slate-400 line-through">{s?.nom ?? `#${a.surveillantId}`}</div>
                          <div className="text-[11px] text-slate-500">{a.salle?.trim() || "sans salle"} · {schedule(a) || "horaires à définir"}</div>
                        </div>
                        <button onClick={() => setReplaceFor(a)} className="flex-shrink-0 inline-flex items-center gap-1 text-white text-[12px] font-bold px-3.5 py-2.5 rounded-xl shadow-sm" style={{ background: TEAL }}><UserPlus className="w-3.5 h-3.5" />Remplacer</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Onglet SALLES ── */}
        {tab === "salles" && (
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5 mb-1"><DoorOpen className="w-4 h-4 text-slate-400" />Salles <span className="text-slate-400">{salleGroups.length}</span></h2>
            {salleGroups.map(([nom, list]) => {
              const critique = list.some((a) => a.presence === "Absent") || nom === "Sans salle";
              const warning = !critique && list.some((a) => a.presence === "En attente");
              const col = critique ? "#ef4444" : warning ? "#f59e0b" : "#10b981";
              return (
                <div key={nom} className="bg-white rounded-2xl border border-gray-200/80 p-3 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col, boxShadow: `0 0 6px ${col}66` }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-gray-900">{nom}</div>
                    <div className="text-[11px] text-slate-500 truncate">{list.map((a) => survById.get(a.surveillantId)?.nom).filter(Boolean).join(" · ") || "aucun surveillant"}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg flex-shrink-0"><Users className="w-3 h-3" />{list.length}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Onglet POINTAGE (remplace le scan QR) ── */}
        {tab === "pointage" && (
          <div className="space-y-2">
            <div className="mb-1">
              <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-slate-400" />Pointage présence</h2>
              <p className="text-[11px] text-gray-400">Marquez chaque surveillant présent ou absent (le scan QR arrivera plus tard).</p>
            </div>
            {rows.map((a, i) => {
              const s = survById.get(a.surveillantId);
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200/80 p-3 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initials(s?.nom ?? "??")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-gray-800 truncate">{s?.nom ?? `#${a.surveillantId}`}</div>
                    <div className="text-[10.5px] text-slate-400">{a.salle?.trim() || "—"} · {schedule(a) || "—"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => pointer(a, "Présent")} disabled={pending} aria-pressed={a.presence === "Présent"} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 ${a.presence === "Présent" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"}`}><Check className="w-3.5 h-3.5" />Présent</button>
                    <button onClick={() => pointer(a, "Absent")} disabled={pending} aria-pressed={a.presence === "Absent"} className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50 ${a.presence === "Absent" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"}`}><X className="w-3.5 h-3.5" />Absent</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Onglet ALERTES ── */}
        {tab === "alertes" && (
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5 mb-1"><Bell className="w-4 h-4 text-slate-400" />Alertes <span className="text-slate-400">{alertes.length}</span></h2>
            {alertes.length === 0 && <div className="bg-white rounded-2xl border border-gray-200/80 p-5 text-center text-[12.5px] text-emerald-700 font-semibold">Aucune alerte — tout est sous contrôle.</div>}
            {alertes.map((al, i) => {
              const blocant = al.niveau === "blocant";
              return (
                <div key={i} className={`rounded-2xl border p-3 flex items-center gap-3 ${blocant ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"}`}>
                  {blocant ? <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" /> : <Zap className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12.5px] font-bold ${blocant ? "text-rose-700" : "text-amber-700"}`}>{al.text}</div>
                    {al.sub && <div className="text-[11px] text-slate-500 truncate">{al.sub}</div>}
                  </div>
                  {blocant && al.aff?.presence === "Absent" && (
                    <button onClick={() => setReplaceFor(al.aff!)} className="flex-shrink-0 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-lg transition-colors">Remplacer</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-[480px] grid grid-cols-4">
          {([
            { key: "terrain", label: "Terrain", Icon: Users, badge: 0 },
            { key: "salles", label: "Salles", Icon: DoorOpen, badge: salleGroups.filter(([n, l]) => n === "Sans salle" || l.some((a) => a.presence === "Absent")).length },
            { key: "pointage", label: "Pointage", Icon: ClipboardCheck, badge: 0 },
            { key: "alertes", label: "Alertes", Icon: Bell, badge: alertes.length },
          ] as { key: Tab; label: string; Icon: typeof Users; badge: number }[]).map(({ key, label, Icon, badge }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center justify-center py-2.5 gap-0.5 ${active ? "text-teal-700" : "text-slate-400"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{label}</span>
                {badge > 0 && <span className="absolute top-1.5 right-[calc(50%-20px)] min-w-[16px] h-4 px-1 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold rounded-full">{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* FAB + menu */}
      <div className="fixed z-30 right-4 bottom-[76px] flex flex-col items-end gap-2.5">
        {fabOpen && (
          <>
            <button onClick={() => { setFabOpen(false); setTab("pointage"); }} className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-md text-[12.5px] font-semibold text-slate-800">
              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center"><ClipboardCheck className="w-4 h-4" /></span>Pointer
            </button>
            <Link href="/operations/incidents" onClick={() => setFabOpen(false)} className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-md text-[12.5px] font-semibold text-slate-800">
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></span>Incident
            </Link>
            <button onClick={() => { setFabOpen(false); showToast("Note ajoutée au journal de session."); }} className="inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-md text-[12.5px] font-semibold text-slate-800">
              <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center"><FileText className="w-4 h-4" /></span>Note
            </button>
          </>
        )}
        <button onClick={() => setFabOpen((v) => !v)} aria-label={fabOpen ? "Fermer le menu" : "Actions rapides"} aria-expanded={fabOpen} className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-transform" style={{ background: "linear-gradient(135deg, #0f766e, #115e59)", boxShadow: "0 8px 20px rgba(15,118,110,0.35)" }}>
          <Plus className={`w-6 h-6 transition-transform ${fabOpen ? "rotate-45" : ""}`} />
        </button>
      </div>

      {/* Bottom sheet remplacement (2 clics : Remplacer → Affecter) */}
      {replaceFor && (() => {
        const abs = survById.get(replaceFor.surveillantId);
        const candidats = suggererSurveillants(nonAffectes, { limite: 5 });
        return (
          <div className="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true" aria-label="Remplacer un surveillant">
            <button aria-label="Fermer" className="absolute inset-0 bg-slate-900/40" onClick={() => setReplaceFor(null)} />
            <div className="relative w-full mx-auto max-w-[480px] bg-white rounded-t-3xl p-5 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto">
              <span className="block w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" aria-hidden />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[16px] font-extrabold text-gray-900 flex items-center gap-1.5"><UserPlus className="w-4.5 h-4.5 text-teal-700" />Remplacer {abs?.nom ?? "le surveillant"}</h3>
                  <p className="text-[12px] text-slate-500 mt-0.5">{replaceFor.salle?.trim() || "sans salle"} · {schedule(replaceFor) || "horaires à définir"}</p>
                </div>
                <button onClick={() => setReplaceFor(null)} aria-label="Fermer" className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.6px] text-violet-600"><Sparkles className="w-3.5 h-3.5" />Remplaçants suggérés</div>
              <div className="mt-2 space-y-2">
                {candidats.length === 0 && <div className="text-[12.5px] text-slate-400 py-4 text-center">Aucun surveillant mobilisable dans l&apos;annuaire.</div>}
                {candidats.map(({ surveillant: s, score, reasons }, i) => {
                  const tone = score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 60 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border-2 border-transparent bg-slate-50 p-3">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initials(s.nom)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-gray-800 truncate">{s.nom}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${tone}`} title="Score d'adéquation /100">{score}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">{reasons.slice(0, 2).join(" · ") || s.role}</div>
                      </div>
                      <button onClick={() => confirmerRemplacement(s)} disabled={pending} className="flex-shrink-0 inline-flex items-center gap-1 text-white text-[12px] font-bold px-3.5 py-2.5 rounded-xl shadow-sm disabled:opacity-50" style={{ background: TEAL }}><Check className="w-3.5 h-3.5" />Affecter</button>
                    </div>
                  );
                })}
              </div>
              <Link href="/operations/planification" className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-700"><ChevronRight className="w-3.5 h-3.5" />Gérer sur la planification complète</Link>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
