"use client";

import { DoorOpen, Users, Accessibility, Clock3 } from "lucide-react";
import type { SalleACouvrir } from "@/lib/operations/planning-salles";
import type { Affectation } from "@/lib/operations/types";

const CRENEAU: Record<string, string> = { matin: "Matin", "apres-midi": "Après-midi" };

/**
 * Panneau « Salles à couvrir » (§16) : rappelle au coordinateur les salles,
 * horaires et besoins validés (issus du devis) et le taux de couverture des
 * postes de surveillance par les affectations en cours.
 */
export function SallesACouvrirPanel({ salles, affectations }: { salles: SalleACouvrir[]; affectations: Affectation[] }) {
  if (salles.length === 0) return null;

  const postesRequis = salles.reduce((n, s) => n + (s.surveillants || 0), 0);
  const postesAffectes = affectations.length;
  const pct = postesRequis > 0 ? Math.min(100, Math.round((postesAffectes / postesRequis) * 100)) : 0;
  const nbPmr = salles.filter((s) => s.pmr).length;
  const nbTt = salles.filter((s) => s.tiersTemps).length;
  const complet = postesAffectes >= postesRequis && postesRequis > 0;
  const barColor = complet ? "#059669" : postesAffectes === 0 ? "#e11d48" : "#d97706";

  return (
    <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-[var(--color-primary)]" aria-hidden />
          <h2 className="text-[15px] font-extrabold text-gray-900">Salles à couvrir</h2>
          <span className="text-[11.5px] text-gray-400">issu du devis validé · {salles.length} salle{salles.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-gray-500">
          {nbPmr > 0 && <span className="inline-flex items-center gap-1"><Accessibility className="w-3.5 h-3.5 text-amber-500" aria-hidden />{nbPmr} PMR</span>}
          {nbTt > 0 && <span className="inline-flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-sky-500" aria-hidden />{nbTt} tiers-temps</span>}
        </div>
      </div>

      {/* Couverture des postes de surveillance */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[12px] mb-1.5">
          <span className="inline-flex items-center gap-1.5 font-semibold text-gray-600"><Users className="w-3.5 h-3.5 text-gray-400" aria-hidden />Couverture des postes</span>
          <span className="font-bold" style={{ color: barColor }}>{postesAffectes} / {postesRequis} affecté{postesAffectes > 1 ? "s" : ""}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} aria-hidden />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Créneau", "Salle", "Étud.", "Surv. requis", "Besoins", "Surveillance", "Observations"].map((h, i) => (
                <th key={i} className={`px-3 py-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.4px] ${i >= 2 && i <= 3 ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {salles.map((s, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-[12px] text-gray-600">{CRENEAU[s.session] ?? s.session}</td>
                <td className="px-3 py-2 text-[12.5px] font-mono font-semibold text-gray-800">{s.salle}</td>
                <td className="px-3 py-2 text-[12.5px] font-semibold text-gray-800 text-center">{s.etudiants || "—"}</td>
                <td className="px-3 py-2 text-[12.5px] font-semibold text-gray-800 text-center">{s.surveillants || "—"}</td>
                <td className="px-3 py-2 text-[11px]">{[s.pmr && "PMR", s.tiersTemps && "T.-t."].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2 text-[12px] font-mono text-gray-600 whitespace-nowrap">{s.debut ?? "—"}–{s.fin ?? "—"}</td>
                <td className="px-3 py-2 text-[12px] text-gray-500">{s.observations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Affectez un surveillant par poste requis, en respectant salles et horaires ci-dessus.</p>
    </div>
  );
}
