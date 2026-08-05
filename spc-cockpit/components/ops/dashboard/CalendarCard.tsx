import { CalendarDays } from "lucide-react";
import type { CalendarDay } from "@/lib/operations/dashboard";
import { SectionCard } from "./SectionCard";
import { COUVERTURE_COULEUR, CoverageLegend } from "./badges";

export function CalendarCard({ days }: { days: CalendarDay[] }) {
  const sessions = days.flatMap((d) => d.sessions.map((s) => ({ ...s, day: d })));

  return (
    <SectionCard
      title="Calendrier des missions"
      icon={<CalendarDays className="w-4 h-4" />}
      action={{ label: "Voir le calendrier", href: "/operations/planification" }}
    >
      {/* Bandeau semaine */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {days.map((d) => {
          const has = d.sessions.length > 0;
          const worst = d.sessions.reduce<string | null>((acc, s) => {
            const order = { risque: 3, attention: 2, complet: 1, "a-planifier": 0 } as const;
            if (!acc) return s.etat;
            return order[s.etat] > order[acc as keyof typeof order] ? s.etat : acc;
          }, null);
          return (
            <div
              key={d.dateISO}
              className={`rounded-xl py-2 flex flex-col items-center gap-1 border ${
                d.isToday ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              <span className={`text-[9.5px] font-bold uppercase tracking-wide ${d.isToday ? "text-blue-100" : "text-slate-400"}`}>{d.weekday}</span>
              <span className="text-[14px] font-extrabold leading-none">{d.dayNum}</span>
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: has ? (d.isToday ? "#fff" : COUVERTURE_COULEUR[(worst as keyof typeof COUVERTURE_COULEUR) ?? "complet"]) : "transparent" }}
              />
            </div>
          );
        })}
      </div>

      {/* Sessions de la semaine */}
      <div className="space-y-2">
        {sessions.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] text-slate-400">Aucune session cette semaine.</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
              <div className="min-w-0 flex items-center gap-2.5">
                <span aria-hidden className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: COUVERTURE_COULEUR[s.etat] }} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-slate-800 truncate">{s.client}</div>
                  <div className="text-[11px] text-slate-400">{s.nbSalles} salles · {s.nbSurv} surv.</div>
                </div>
              </div>
              <span
                className="text-[12px] font-bold tabular-nums flex-shrink-0"
                style={{ color: COUVERTURE_COULEUR[s.etat] }}
              >
                {s.etat === "a-planifier" ? "à planifier" : `${Math.round(s.taux * 100)} %`}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <CoverageLegend />
      </div>
    </SectionCard>
  );
}
