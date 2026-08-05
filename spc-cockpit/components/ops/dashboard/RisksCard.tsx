import Link from "next/link";
import { AlertTriangle, Clock, Users, FileWarning } from "lucide-react";
import type { DashboardRisk, RiskTone } from "@/lib/operations/dashboard";
import { SectionCard, SeeAllLink } from "./SectionCard";

const TONE: Record<RiskTone, { tile: string; chip: string; value: string }> = {
  critique: { tile: "bg-rose-50/70 border-rose-100", chip: "bg-rose-100 text-rose-600", value: "text-rose-600" },
  attention: { tile: "bg-amber-50/70 border-amber-100", chip: "bg-amber-100 text-amber-600", value: "text-amber-600" },
  info: { tile: "bg-slate-50 border-slate-200", chip: "bg-slate-200/70 text-slate-600", value: "text-slate-700" },
  accent: { tile: "bg-violet-50/70 border-violet-100", chip: "bg-violet-100 text-violet-600", value: "text-violet-600" },
};

const ICONS: Record<string, React.ReactNode> = {
  postes: <AlertTriangle className="w-4 h-4" />,
  j48: <Clock className="w-4 h-4" />,
  conflits: <Users className="w-4 h-4" />,
  incidents: <FileWarning className="w-4 h-4" />,
};

function RiskTile({ risk }: { risk: DashboardRisk }) {
  const t = TONE[risk.ton];
  return (
    <Link
      href={risk.href}
      className={`flex items-start gap-3 rounded-xl border p-3.5 transition-colors hover:shadow-sm ${t.tile} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}
    >
      <span aria-hidden className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.chip}`}>{ICONS[risk.key]}</span>
      <div className="min-w-0">
        <div className={`text-[19px] font-extrabold leading-none ${t.value}`}>{risk.valeur}</div>
        <div className="text-[12.5px] font-bold text-slate-800 mt-1 leading-tight">{risk.titre}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{risk.instruction}</div>
      </div>
    </Link>
  );
}

export function RisksCard({ risks }: { risks: DashboardRisk[] }) {
  return (
    <SectionCard title="Risques & points d'attention" icon={<AlertTriangle className="w-4 h-4" />}>
      <div className="grid grid-cols-2 gap-3">
        {risks.map((r) => (
          <RiskTile key={r.key} risk={r} />
        ))}
      </div>
      <div className="mt-3.5 pt-3 border-t border-slate-100">
        <SeeAllLink label="Voir tous les risques" href="/operations/risques" />
      </div>
    </SectionCard>
  );
}
