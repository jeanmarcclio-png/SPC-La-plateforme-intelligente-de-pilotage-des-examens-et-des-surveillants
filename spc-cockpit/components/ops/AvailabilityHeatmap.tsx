"use client";

// Heatmap charge & disponibilité (E2). Vue calendaire surveillants × jours du
// mois : chaque cellule est colorée par la charge RÉELLEMENT planifiée ce jour
// (dérivée des affectations, cf. lib/operations/disponibilite). Lecture seule —
// il n'existe pas encore de modèle de disponibilité déclarée par date.

import { useMemo, useState } from "react";
import type { Surveillant, Affectation, Mission } from "@/lib/operations/types";
import { chargeMensuelle, moisJours, estWeekend, type EtatJour } from "@/lib/operations/disponibilite";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const ETAT_STYLE: Record<EtatJour, { bg: string; label: string }> = {
  libre: { bg: "#dcfce7", label: "Libre" },
  demi: { bg: "#fcd34d", label: "Demi-journée" },
  charge: { bg: "#f87171", label: "Affecté" },
  indispo: { bg: "#e2e8f0", label: "Indisponible" },
};

type RoleFiltre = "all" | "coord" | "salle" | "volant" | "pmr";
const ROLE_FILTERS: { key: RoleFiltre; label: string; match: (r: string) => boolean }[] = [
  { key: "all", label: "Tous", match: () => true },
  { key: "coord", label: "Coordinateurs", match: (r) => r.includes("coordinat") },
  { key: "salle", label: "Salle", match: (r) => r.includes("salle") },
  { key: "volant", label: "Volants", match: (r) => r.includes("volant") },
  { key: "pmr", label: "PMR", match: (r) => r.includes("pmr") },
];

function initials(nom: string): string {
  return (nom ?? "??").split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AvailabilityHeatmap({ surveillants, affectations, missions }: { surveillants: Surveillant[]; affectations: Affectation[]; missions: Mission[] }) {
  // Mois par défaut : celui qui concentre le plus de sessions.
  const defMonth = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of missions) if (m.dateMission) counts.set(m.dateMission.slice(0, 7), (counts.get(m.dateMission.slice(0, 7)) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const now = new Date();
    return top ? { y: Number(top.slice(0, 4)), m: Number(top.slice(5, 7)) - 1 } : { y: now.getUTCFullYear(), m: now.getUTCMonth() };
  }, [missions]);

  const [{ y, m }, setMonth] = useState(defMonth);
  const [role, setRole] = useState<RoleFiltre>("all");

  const jours = useMemo(() => moisJours(y, m), [y, m]);
  const roleMatch = ROLE_FILTERS.find((f) => f.key === role)!.match;
  const lignes = useMemo(
    () => chargeMensuelle({
      surveillants: surveillants.filter((s) => roleMatch(s.role.toLowerCase())).map((s) => ({ id: s.id, nom: s.nom, role: s.role, statut: s.statut })),
      affectations, missions, jours,
    }),
    [surveillants, affectations, missions, jours, roleMatch]
  );

  function shift(delta: number) {
    setMonth(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  const totalSessions = lignes.reduce((n, l) => n + l.totalSessions, 0);

  return (
    <div className="mb-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2"><CalendarRange className="w-4 h-4 text-slate-400" aria-hidden />Charge &amp; disponibilité</h2>
          <p className="text-[12px] text-gray-400">Charge planifiée par jour — repérer les fenêtres libres pour anticiper les renforts</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => shift(-1)} aria-label="Mois précédent" className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[12.5px] font-bold text-gray-800 min-w-[120px] text-center capitalize">{MOIS[m]} {y}</span>
          <button onClick={() => shift(1)} aria-label="Mois suivant" className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Filtres rôle + légende */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setRole(f.key)} aria-pressed={role === f.key}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors ${role === f.key ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-500 flex-wrap">
          {(["libre", "demi", "charge", "indispo"] as EtatJour[]).map((e) => (
            <span key={e} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px]" style={{ background: ETAT_STYLE[e].bg }} />{ETAT_STYLE[e].label}</span>
          ))}
        </div>
      </div>

      {lignes.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-gray-400">Aucun surveillant pour ce filtre.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max p-4">
            {/* En-tête jours */}
            <div className="flex items-end gap-[3px] mb-1.5 pl-[176px]">
              {jours.map((iso) => {
                const day = Number(iso.slice(8, 10));
                const we = estWeekend(iso);
                return <div key={iso} className={`w-4 text-center text-[8.5px] font-bold tabular-nums ${we ? "text-rose-300" : "text-gray-400"}`}>{day}</div>;
              })}
            </div>
            {/* Lignes surveillants */}
            <div className="flex flex-col gap-[3px]">
              {lignes.map((l, i) => (
                <div key={l.surveillantId} className="flex items-center gap-[3px]">
                  <div className="sticky left-0 z-10 bg-white w-[176px] pr-3 flex items-center gap-2 flex-shrink-0">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"][i % 8] }}>{initials(l.nom)}</span>
                    <span className="text-[12px] font-semibold text-gray-700 truncate">{l.nom}</span>
                    {l.totalSessions > 0 && <span className="ml-auto text-[10px] font-bold text-slate-400 tabular-nums flex-shrink-0">{l.totalSessions}</span>}
                  </div>
                  {l.jours.map((c) => {
                    const we = estWeekend(c.date);
                    const st = ETAT_STYLE[c.etat];
                    const title = `${l.nom} · ${Number(c.date.slice(8, 10))} ${MOIS[m]} — ${st.label}${c.heures > 0 ? ` · ${c.heures.toFixed(1)}h` : ""}`;
                    return <div key={c.date} title={title} className="w-4 h-4 rounded-[3px]" style={{ background: st.bg, opacity: we && c.etat === "libre" ? 0.45 : 1 }} />;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-2.5 border-t border-gray-100 text-[11px] text-gray-400">
        {lignes.length} surveillant{lignes.length > 1 ? "s" : ""} · {totalSessions} affectation{totalSessions > 1 ? "s" : ""} ce mois · charge dérivée du planning (vue lecture)
      </div>
    </div>
  );
}
