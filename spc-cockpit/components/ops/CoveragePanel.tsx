"use client";

import { LayoutGrid } from "lucide-react";

/** Un créneau de 2h avec son taux de couverture (C2). */
export interface CoverageSlot {
  label: string;   // "08-10"
  requis: number;
  affectes: number;
}

/**
 * Panneau « Couverture » par tranche de 2h (C2) : rappelle, créneau par créneau,
 * le nombre de surveillants affectés vs requis, et compte les trous critiques.
 * Présentationnel — les données sont calculées en amont (salles du devis vs
 * affectations en cours).
 */
export function CoveragePanel({ slots }: { slots: CoverageSlot[] }) {
  if (slots.length === 0) return null;
  const trousCritiques = slots.filter((s) => s.requis > 0 && s.affectes / s.requis < 0.5).length;

  return (
    <div className="lg:w-[230px] shrink-0 rounded-xl border border-gray-100 bg-slate-50/60 p-4 lg:sticky lg:top-5 self-start">
      <div className="flex items-center gap-1.5 mb-3">
        <LayoutGrid className="w-3.5 h-3.5 text-gray-400" aria-hidden />
        <h3 className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Couverture</h3>
      </div>
      <div className="space-y-1.5">
        {slots.map((s) => {
          const pct = s.requis > 0 ? s.affectes / s.requis : 1;
          const { color, icon } =
            s.requis === 0 ? { color: "#94a3b8", icon: "—" }
            : pct >= 0.8 ? { color: "#10b981", icon: "✅" }
            : pct >= 0.5 ? { color: "#f59e0b", icon: "⚠️" }
            : { color: "#ef4444", icon: "🚨" };
          return (
            <div key={s.label} className="flex items-center justify-between text-[12px]">
              <span className="font-mono text-gray-500">{s.label}h</span>
              <span className="inline-flex items-center gap-1.5 font-bold tabular-nums" style={{ color }}>
                {s.requis > 0 ? `${s.affectes}/${s.requis}` : "—"} <span aria-hidden>{icon}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-200/70">
        <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[.5px]">Trous critiques</div>
        <div className="text-[22px] font-extrabold tabular-nums leading-tight" style={{ color: trousCritiques > 0 ? "#dc2626" : "#047857" }}>
          {trousCritiques}
        </div>
      </div>
    </div>
  );
}
