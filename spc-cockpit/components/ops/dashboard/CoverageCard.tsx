import Link from "next/link";
import { Users } from "lucide-react";
import type { StaffingCoverage } from "@/lib/operations/dashboard";
import { SectionCard } from "./SectionCard";
import { CoverageDonut, TrendLine } from "./charts";
import { COUVERTURE_COULEUR } from "./badges";

function LegendRow({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px] whitespace-nowrap">
      <span className="inline-flex items-center gap-2 text-slate-600">
        <span aria-hidden className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        {label}
      </span>
      <span className="font-bold text-slate-800 tabular-nums">
        {value} <span className="text-slate-400 font-semibold">· {pct} %</span>
      </span>
    </div>
  );
}

export function CoverageCard({ coverage }: { coverage: StaffingCoverage }) {
  const { requis, pourvus, manquants, vacants } = coverage;
  const total = requis || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <SectionCard title="Couverture des surveillants" icon={<Users className="w-4 h-4" />}>
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Donut + légende */}
        <div className="flex items-center gap-4 lg:w-[47%] flex-shrink-0">
          <CoverageDonut
            size={124}
            segments={[
              { value: pourvus, color: COUVERTURE_COULEUR.complet, label: "Pourvus" },
              { value: manquants, color: COUVERTURE_COULEUR.risque, label: "Manquants" },
              { value: vacants, color: "#CBD5E1", label: "Vacants" },
            ]}
            total={requis}
            centerValue={String(requis)}
            centerLabel="Postes"
          />
          <div className="flex-1 min-w-0 space-y-2.5">
            <LegendRow color={COUVERTURE_COULEUR.complet} label="Pourvus" value={pourvus} pct={pct(pourvus)} />
            <LegendRow color={COUVERTURE_COULEUR.risque} label="Manquants" value={manquants} pct={pct(manquants)} />
            <LegendRow color="#CBD5E1" label="Vacants" value={vacants} pct={pct(vacants)} />
          </div>
        </div>

        {/* Évolution */}
        <div className="flex-1 min-w-0">
          {/* Titre dérivé de la courbe, jamais fixe : « ÉVOLUTION SUR 7 JOURS »
              coiffait des points étalés sur 3,5 mois (BUG-017). */}
          <div className="text-[11px] font-bold uppercase tracking-[0.7px] text-slate-500">{coverage.trendTitre}</div>
          {coverage.trendPeriode && (
            <div className="text-[11px] font-semibold text-slate-400 mb-1 tabular-nums">{coverage.trendPeriode}</div>
          )}
          <TrendLine points={coverage.trend} color="#10B981" height={132} />
        </div>
      </div>

      {manquants > 0 && (
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <Link
            href={coverage.missionHref}
            className="text-[12px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            Pourvoir les {manquants} poste{manquants > 1 ? "s" : ""} manquant{manquants > 1 ? "s" : ""} →
          </Link>
        </div>
      )}
    </SectionCard>
  );
}
