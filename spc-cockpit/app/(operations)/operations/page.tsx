export const dynamic = "force-dynamic";

import { getSurveillants, getMissions, getDevisList, getIncidents } from "@/lib/operations/queries";
import type { StatutMission, StatutDevis, StatutSurveillant } from "@/lib/operations/types";
import { Briefcase, Users, Euro, FileCheck2, AlertTriangle, Star } from "lucide-react";

const ACCENT = "#6366f1";

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function dateFR(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function MissionBadge({ statut }: { statut: StatutMission }) {
  const cls: Record<StatutMission, string> = {
    "Planifiée": "bg-indigo-50 text-indigo-600",
    "En cours":  "bg-amber-50 text-amber-600",
    "Terminée":  "bg-emerald-50 text-emerald-600",
    "Annulée":   "bg-red-50 text-red-500",
  };
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{statut}
  </span>;
}

function DevisBadge({ statut }: { statut: StatutDevis }) {
  const cls: Record<StatutDevis, string> = {
    "Brouillon": "bg-gray-100 text-gray-500",
    "Envoyé":    "bg-sky-50 text-sky-600",
    "Accepté":   "bg-emerald-50 text-emerald-600",
    "Refusé":    "bg-red-50 text-red-500",
    "Facturé":   "bg-indigo-50 text-indigo-600",
  };
  return <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>{statut}</span>;
}

function SurvBadge({ statut }: { statut: StatutSurveillant }) {
  const cls: Record<StatutSurveillant, string> = {
    "Disponible":   "bg-emerald-50 text-emerald-600",
    "Planifié":     "bg-indigo-50 text-indigo-600",
    "Annulé":       "bg-red-50 text-red-500",
    "Indisponible": "bg-gray-100 text-gray-500",
  };
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{statut}
  </span>;
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-gray-400">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}12`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[12px] text-gray-400 mt-1.5">{sub}</div>
    </div>
  );
}

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#6366f1"];

export default async function OperationsPage() {
  const [surveillants, missions, devis, incidents] = await Promise.all([
    getSurveillants(), getMissions(), getDevisList(), getIncidents(),
  ]);

  const dispo = surveillants.filter((s) => s.statut === "Disponible" || s.statut === "Planifié");
  const missionsAVenir = missions.filter((m) => m.statut === "Planifiée" || m.statut === "En cours");
  const pipeline = devis.filter((d) => d.statut === "Brouillon" || d.statut === "Envoyé");
  const acceptes = devis.filter((d) => d.statut === "Accepté" || d.statut === "Facturé");
  const incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu");

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Pilotage opérationnel des examens — missions, équipe, devis, incidents</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <Kpi label="Missions" value={String(missionsAVenir.length)} sub={`${missions.length} au total`} icon={<Briefcase className="w-4 h-4" />} />
        <Kpi label="Équipe" value={`${dispo.length}/${surveillants.length}`} sub="surveillants mobilisables" icon={<Users className="w-4 h-4" />} />
        <Kpi label="Pipeline devis" value={euro(pipeline.reduce((s, d) => s + d.montantHT, 0))} sub={`${pipeline.length} devis en cours (HT)`} icon={<Euro className="w-4 h-4" />} />
        <Kpi label="CA accepté" value={euro(acceptes.reduce((s, d) => s + d.montantHT, 0))} sub={`${acceptes.length} devis confirmé${acceptes.length > 1 ? "s" : ""} (HT)`} icon={<FileCheck2 className="w-4 h-4" />} />
      </div>

      {/* Incidents ouverts */}
      {incidentsOuverts.map((inc) => (
        <div key={inc.id} className="flex items-start gap-3 bg-white border border-red-200 rounded-2xl p-4 mb-6 shadow-sm">
          <span className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13.5px] font-bold text-gray-900">{inc.titre}</span>
              <span className="text-[10.5px] font-bold uppercase tracking-wide bg-red-500 text-white rounded px-1.5 py-0.5">{inc.gravite}</span>
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5">
              {inc.salle ? `Salle ${inc.salle} · ` : ""}{dateFR(inc.dateIncident)}{inc.description ? ` — ${inc.description}` : ""}
            </div>
          </div>
        </div>
      ))}

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Missions */}
        <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">Missions</h2>
            <p className="text-[12px] text-gray-400">Sessions d&apos;examens planifiées et récentes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {["Référence", "Client", "Date", "Volume", "Statut"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-mono text-gray-400">{m.reference}</td>
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-semibold text-gray-800">{m.client}</div>
                      {m.session && <div className="text-[11.5px] text-gray-400">{m.session}</div>}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(m.dateMission)}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{m.nbSalles} salles · {m.nbSurveillants} surv.</td>
                    <td className="px-5 py-3"><MissionBadge statut={m.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Devis */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden self-start">
          <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">Devis</h2>
            <p className="text-[12px] text-gray-400">Pipeline commercial opérations</p>
          </div>
          <div>
            {devis.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-800 truncate">{d.client}</div>
                  <div className="text-[11.5px] text-gray-400 truncate">{d.session ?? d.reference} · {d.nbSurveillants} surv.</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13.5px] font-extrabold text-gray-900">{euro(d.montantHT)}</div>
                  <DevisBadge statut={d.statut} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Équipe */}
      <section className="mt-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-baseline justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Équipe — Disponibilité</h2>
            <p className="text-[12px] text-gray-400">{dispo.length} mobilisables sur {surveillants.length}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Surveillant", "Statut", "Examens", "Heures", "Note"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveillants.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      >
                        {s.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-gray-800">{s.nom}</div>
                        <div className="text-[11.5px] text-gray-400">{s.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><SurvBadge statut={s.statut} /></td>
                  <td className="px-5 py-3 text-[13px] text-gray-700">{s.nbExamens}</td>
                  <td className="px-5 py-3 text-[13px] text-gray-700">{s.heures}h</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />{s.note.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
