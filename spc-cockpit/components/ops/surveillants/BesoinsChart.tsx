"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { JourBesoin } from "@/lib/operations/disponibilites";

export function BesoinsChart({
  jours,
  couvertureMoyenne,
}: {
  jours: JourBesoin[];
  couvertureMoyenne: number;
}) {
  // Jours ouvrés porteurs de charge, on garde les 12 derniers (lisibilité).
  const ouvres = jours.filter((j) => !j.weekend && j.planifies > 0);
  const data = ouvres.slice(-12);
  const max = Math.max(1, ...data.map((j) => j.planifies));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-bold text-slate-900">Présence par jour</h2>
          <p className="text-[11.5px] text-slate-400">Planifiés vs confirmés</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" aria-hidden />Planifiés</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden />Confirmés</span>
        </div>
      </div>

      {/* Barres groupées */}
      <div className="mt-4 flex-1 min-h-[132px] flex items-end gap-1.5">
        {data.length === 0 ? (
          <div className="w-full text-center text-[12px] text-slate-400 py-8">Aucune charge planifiée sur la période.</div>
        ) : (
          data.map((j) => (
            <div key={j.jour} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full flex items-end justify-center gap-[2px] h-[120px]"
                title={`Jour ${j.jour} — ${j.planifies} planifié(s), ${j.confirmes} confirmé(s), ${j.heures}h`}
              >
                <div className="w-1/2 rounded-t bg-sky-400/90 group-hover:bg-sky-500 transition-colors" style={{ height: `${(j.planifies / max) * 100}%` }} />
                <div className="w-1/2 rounded-t bg-emerald-500/90 group-hover:bg-emerald-600 transition-colors" style={{ height: `${(j.confirmes / max) * 100}%` }} />
              </div>
              <div className="text-[9.5px] text-slate-400 tabular-nums">{j.jour}</div>
            </div>
          ))
        )}
      </div>

      {/* Couverture moyenne + lien */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px] text-slate-400">Couverture moyenne</div>
          <div className="text-[26px] font-extrabold leading-none text-emerald-600">{couvertureMoyenne}%</div>
        </div>
        <Link href="/operations/planification" className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">
          Détail des besoins
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
