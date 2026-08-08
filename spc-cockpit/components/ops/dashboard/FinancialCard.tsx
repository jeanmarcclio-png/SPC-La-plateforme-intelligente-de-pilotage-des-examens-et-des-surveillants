import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { DashboardFinancials } from "@/lib/operations/dashboard";
import { euro, pctFR, deltaPct } from "@/lib/operations/format";
import { SectionCard } from "./SectionCard";
import { MonthlyBars } from "./charts";

function Metric({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-slate-400">{label}</div>
      <div className="text-[19px] font-extrabold text-slate-900 mt-1 tabular-nums">{value}</div>
      {delta != null && (
        <div className={`inline-flex items-center gap-0.5 text-[11.5px] font-bold mt-0.5 ${up ? "text-emerald-600" : "text-rose-500"}`}>
          {up ? <ArrowUpRight className="w-3 h-3" aria-hidden /> : <ArrowDownRight className="w-3 h-3" aria-hidden />}
          {deltaPct(delta)}
        </div>
      )}
    </div>
  );
}

export function FinancialCard({ financials }: { financials: DashboardFinancials }) {
  const { caConfirmeHT, caTTC, margeHT, tauxMarge, variationCA, evolutionMensuelle } = financials;
  return (
    <SectionCard title="Performance financière" icon={<TrendingUp className="w-4 h-4" />} action={{ label: "Voir les devis", href: "/operations/devis" }}>
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Synthèse */}
        <div className="grid grid-cols-2 gap-3 content-start">
          <Metric label="CA HT confirmé" value={euro(caConfirmeHT)} delta={variationCA} />
          <Metric label="CA TTC" value={euro(caTTC)} />
          <Metric label="Marge HT — portefeuille" value={euro(margeHT)} />
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.6px] text-slate-400">Taux de marge — portefeuille</div>
            <div className="text-[19px] font-extrabold text-slate-900 mt-1 tabular-nums">{pctFR(tauxMarge)}</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">devis acceptés · coût au taux horaire moyen</div>
          </div>
        </div>

        {/* Évolution du CA HT */}
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.7px] text-slate-500 mb-2">Évolution du CA HT</div>
          <MonthlyBars data={evolutionMensuelle.map((e) => ({ label: e.label, total: e.total }))} />
        </div>
      </div>
    </SectionCard>
  );
}
