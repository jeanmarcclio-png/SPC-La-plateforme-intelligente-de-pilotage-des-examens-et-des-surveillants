import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { SessionSummary } from "@/lib/operations/dashboard";
import { dateCourteFR } from "@/lib/operations/format";
import { MissionBadge } from "@/components/ops/badges";
import { SectionCard } from "./SectionCard";
import { CoverageBar } from "./badges";

export function SessionsCard({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <SectionCard
      title="Prochaines sessions"
      icon={<CalendarClock className="w-4 h-4" />}
      action={{ label: "Voir toutes les sessions", href: "/operations/missions" }}
      padBody={false}
    >
      {sessions.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-slate-500">Aucune session planifiée.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70">
                {["Date", "Mission", "Salles", "Surv.", "Couverture", "Statut"].map((h, i) => (
                  <th
                    key={h + i}
                    className={`px-2.5 py-2.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.7px] ${i >= 2 && i <= 3 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors">
                  <td className="px-2.5 py-3 whitespace-nowrap">
                    <Link href="/operations/missions" className="block text-[12.5px] font-semibold text-slate-700">
                      {dateCourteFR(s.dateISO)}
                    </Link>
                  </td>
                  <td className="px-2.5 py-3">
                    <Link href="/operations/missions" className="block">
                      <span className="block text-[12.5px] font-semibold text-slate-800 leading-tight">{s.client}</span>
                      <span className="block text-[10.5px] text-slate-400 leading-tight">{s.session ?? s.reference}</span>
                    </Link>
                  </td>
                  <td className="px-2.5 py-3 text-right text-[13px] text-slate-600 tabular-nums">{s.nbSalles}</td>
                  <td className="px-2.5 py-3 text-right text-[13px] text-slate-600 tabular-nums whitespace-nowrap">
                    {s.etat === "a-planifier" ? "—" : `${s.pourvus}/${s.requis}`}
                  </td>
                  <td className="px-2.5 py-3">
                    <CoverageBar taux={s.taux} etat={s.etat} />
                  </td>
                  <td className="px-2.5 py-3"><MissionBadge statut={s.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
