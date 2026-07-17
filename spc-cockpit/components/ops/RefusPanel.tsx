import { AlertTriangle } from "lucide-react";
import type { RefusRow } from "@/lib/supabase/portail";

// File « à traiter » (coordinateur) : refus surveillants en attente de décision.
// Présentationnel ; le remplacement se fait dans le tableau de planification
// ci-dessous (copilote d'affectation existant).
export function RefusPanel({ refus }: { refus: RefusRow[] }) {
  if (refus.length === 0) return null;
  return (
    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200/70">
        <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden />
        <span className="text-[13px] font-bold text-amber-800">
          À traiter — {refus.length} refus surveillant{refus.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="divide-y divide-amber-100">
        {refus.map((r) => (
          <li key={r.affectationId} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-[13px] text-slate-800">{r.surveillantNom}</span>
            {r.missionRef && <span className="text-[12px] text-slate-500">{r.missionRef}</span>}
            {r.salle && <span className="text-[12px] text-slate-500">Salle {r.salle}</span>}
            {r.motif ? (
              <span className="text-[12px] text-amber-700 italic">« {r.motif} »</span>
            ) : (
              <span className="text-[12px] text-slate-400 italic">sans motif</span>
            )}
            <span className="ml-auto text-[11px] text-slate-500">
              Suggérer un remplaçant ci-dessous
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
