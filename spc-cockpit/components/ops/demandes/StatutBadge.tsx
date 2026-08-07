import type { StatutDemande } from "@/lib/operations/demandes/types";
import { STATUTS_DEMANDE, type StatutTone } from "@/lib/operations/demandes/logic";

const TONE: Record<StatutTone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15",
  attention: "bg-amber-50 text-amber-700 ring-amber-600/15",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  accent: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  critique: "bg-rose-50 text-rose-700 ring-rose-600/15",
};

export function StatutDemandeBadge({ statut }: { statut: StatutDemande }) {
  const tone = STATUTS_DEMANDE[statut].tone;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${TONE[tone]}`}>
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {statut}
    </span>
  );
}
