export const dynamic = "force-dynamic";

import Link from "next/link";
import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { Kpi } from "@/components/ops/Kpi";
import { dateFR } from "@/lib/operations/format";
import { Activity, DoorOpen, CalendarClock, AlertTriangle, CheckCircle2, MapPin } from "lucide-react";

type StatutLigne = "Conforme" | "Salle manquante" | "Sans créneau";

function statutLigne(a: { salle?: string; matin: boolean; apm: boolean }): StatutLigne {
  if (!a.matin && !a.apm) return "Sans créneau";
  if (!a.salle) return "Salle manquante";
  return "Conforme";
}

function LigneBadge({ statut }: { statut: StatutLigne }) {
  if (statut === "Conforme") {
    return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden />Conforme</span>;
  }
  if (statut === "Salle manquante") {
    return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-600"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />Salle manquante</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[12px] font-bold text-red-500"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />Sans créneau</span>;
}

function Creneau({ on, debut, fin }: { on: boolean; debut?: string; fin?: string }) {
  if (!on || !debut || !fin) return <span className="text-gray-300">—</span>;
  return <span className="text-[11.5px] font-mono font-bold bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 whitespace-nowrap">{debut}→{fin}</span>;
}

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

export default async function CockpitOpsPage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);
  const survById = new Map(surveillants.map((s) => [s.id, s]));

  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Planifiée");
  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];

  const sallesCouvertes = rows.filter((a) => a.salle).length;
  const creneauxDefinis = rows.filter((a) => a.matin || a.apm).length;

  const alertes: { titre: string; detail: string; type: "planning" | "creneau" }[] = [];
  for (const a of rows) {
    const nom = survById.get(a.surveillantId)?.nom ?? `Surveillant #${a.surveillantId}`;
    const s = statutLigne(a);
    if (s === "Sans créneau") alertes.push({ titre: `Créneau manquant — ${nom}`, detail: `Session "${active?.client}" : ni matin ni après-midi`, type: "creneau" });
    else if (s === "Salle manquante") alertes.push({ titre: `Salle manquante — ${nom}`, detail: `Session "${active?.client}" : aucune salle affectée`, type: "planning" });
  }

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <OpsBreadcrumb page="Cockpit" />
          <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Cockpit opérationnel</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Pilotage temps réel de la session active</p>
        </div>
        <Link
          href="/operations/planification"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#0d2137" }}
        >
          <CalendarClock className="w-4 h-4" aria-hidden />
          Planification
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Kpi label="Sessions actives" value={active ? "1" : "0"} sub={active ? `${active.client} · ${dateFR(active.dateMission)}` : "aucune session en cours"} icon={<Activity className="w-4 h-4" />} href="/operations/missions" />
        <Kpi label="Salles couvertes" value={`${sallesCouvertes}/${rows.length}`} sub={`${rows.length - sallesCouvertes} salle(s) manquante(s)`} icon={<DoorOpen className="w-4 h-4" />} href="/operations/planification" />
        <Kpi label="Créneaux définis" value={`${creneauxDefinis}/${rows.length}`} sub={`${rows.length - creneauxDefinis} surveillant(s) sans créneau`} icon={<CalendarClock className="w-4 h-4" />} href="/operations/planification" />
        <Kpi label="Alertes" value={String(alertes.length)} sub="à corriger avant la session" icon={<AlertTriangle className="w-4 h-4" />} href="/operations/planification" />
      </div>

      {!active ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 text-center text-[13px] text-gray-400">
          Aucune session active ou planifiée. Créez une mission pour démarrer le pilotage.
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* Session active */}
          <section aria-label="Session active" className="lg:col-span-3 bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span aria-hidden className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-[14px] font-bold text-gray-900">{active.client} — {active.session ?? "Session"}</h2>
                </div>
                <p className="text-[12px] text-gray-400 mt-0.5">{dateFR(active.dateMission)} · {alertes.length} alerte{alertes.length !== 1 ? "s" : ""}</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">En préparation</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    {["Surveillant", "Salle", "Matin", "Après-midi", "Statut"].map((h) => (
                      <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => {
                    const s = survById.get(a.surveillantId);
                    const st = statutLigne(a);
                    return (
                      <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white flex-shrink-0"
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                            >
                              {(s?.nom ?? "??").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                            </span>
                            <div>
                              <div className="text-[13px] font-semibold text-gray-800">{s?.nom ?? `Surveillant #${a.surveillantId}`}</div>
                              <div className="text-[11px] text-gray-400">{a.roleMission ?? s?.role ?? ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {a.salle
                            ? <span className="inline-flex items-center gap-1 text-[12.5px] font-mono font-bold text-gray-700"><MapPin className="w-3 h-3 text-gray-400" aria-hidden />{a.salle}</span>
                            : <span className="inline-flex items-center gap-1 text-[12.5px] text-red-400"><MapPin className="w-3 h-3" aria-hidden />—</span>}
                        </td>
                        <td className="px-5 py-3"><Creneau on={a.matin} debut={a.matinDebut} fin={a.matinFin} /></td>
                        <td className="px-5 py-3"><Creneau on={a.apm} debut={a.apmDebut} fin={a.apmFin} /></td>
                        <td className="px-5 py-3"><LigneBadge statut={st} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-[12px] flex-wrap gap-2">
              <span className="text-gray-500">{rows.length} surveillants · <span className={sallesCouvertes < rows.length ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>{sallesCouvertes}/{rows.length} salles</span></span>
              <Link href="/operations/planification" className="font-bold text-blue-600 hover:text-blue-800">Ouvrir →</Link>
            </div>
          </section>

          {/* Alertes */}
          <section aria-label="Alertes" className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden self-start">
            <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-900">Alertes</h2>
              <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold flex items-center justify-center">{alertes.length}</span>
            </div>
            {alertes.length === 0 ? (
              <p className="px-5 py-6 text-[12.5px] text-gray-400">Aucune alerte — la session est prête. ✓</p>
            ) : (
              <div>
                {alertes.map((a, i) => (
                  <Link
                    key={i}
                    href="/operations/planification"
                    className="flex items-start gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition-colors border-l-[3px] border-l-amber-400"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">{a.type === "planning" ? "Planning" : "Créneau"}</span>
                      <div className="text-[13px] font-bold text-gray-900 mt-1">{a.titre}</div>
                      <div className="text-[11.5px] text-gray-500 mt-0.5">{a.detail}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
