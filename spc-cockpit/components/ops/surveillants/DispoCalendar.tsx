"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { GrilleDispo, TypeCellule, CelluleDispo } from "@/lib/operations/disponibilites";
import { Avatar } from "./ui";

const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Vue = "mois" | "2s" | "semaine";
const VUE_JOURS: Record<Vue, number> = { mois: 99, "2s": 14, semaine: 7 };

const LEGENDE: { type: Exclude<TypeCellule, "non-ouvre">; label: string; swatch: string }[] = [
  { type: "libre", label: "Libre", swatch: "bg-emerald-100 ring-emerald-300" },
  { type: "demi", label: "Demi-journée", swatch: "bg-amber-100 ring-amber-300" },
  { type: "affecte", label: "Affecté", swatch: "bg-sky-200 ring-sky-400" },
  { type: "indispo", label: "Indisponible", swatch: "bg-rose-100 ring-rose-300" },
];

function cellClasses(type: TypeCellule): string {
  switch (type) {
    case "libre": return "bg-emerald-50 text-emerald-700";
    case "demi": return "bg-amber-50 text-amber-700";
    case "affecte": return "bg-sky-100 text-sky-700 font-semibold";
    case "indispo": return "bg-rose-50 text-rose-500";
    default: return "text-transparent";
  }
}

const HACHURE: React.CSSProperties = {
  backgroundImage: "repeating-linear-gradient(45deg, #f1f5f9 0, #f1f5f9 3px, #ffffff 3px, #ffffff 6px)",
};

function cellText(c: CelluleDispo): string {
  if (c.type === "non-ouvre") return "";
  if (c.type === "indispo") return "✕";
  return c.heures > 0 ? `${c.heures}h` : "";
}

function typeLabel(type: TypeCellule): string {
  return type === "affecte" ? "Affecté" : type === "demi" ? "Demi-journée" : type === "indispo" ? "Indisponible" : type === "libre" ? "Libre" : "Non ouvré";
}

export function DispoCalendar({
  grille,
  onPrev,
  onNext,
  onToday,
  onSelect,
}: {
  grille: GrilleDispo;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelect: (id: number) => void;
}) {
  const [vue, setVue] = useState<Vue>("mois");

  // Fenêtre de jours affichée (centrée sur aujourd'hui si présent).
  const win = VUE_JOURS[vue];
  let start = 0;
  if (win < grille.jours.length) {
    const todayIdx = grille.jours.findIndex((j) => j.aujourdhui);
    if (todayIdx >= 0) start = Math.max(0, Math.min(todayIdx - Math.floor(win / 2), grille.jours.length - win));
  }
  const end = Math.min(grille.jours.length, start + win);
  const joursVisibles = grille.jours.slice(start, end);
  const colWidth = 34;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">
            Disponibilités — {MOIS_FR[grille.mois]} {grille.annee}
          </h2>
          <p className="text-[12px] text-slate-400">Charge planifiée par jour et par surveillant</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            <button onClick={onPrev} aria-label="Mois précédent" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" aria-hidden /></button>
            <button onClick={onToday} className="h-8 px-3 inline-flex items-center rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Aujourd&apos;hui</button>
            <button onClick={onNext} aria-label="Mois suivant" className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronRight className="w-4 h-4" aria-hidden /></button>
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            {(["mois", "2s", "semaine"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVue(v)}
                className={`px-2.5 h-8 text-[12px] font-semibold transition-colors ${vue === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {v === "mois" ? "Mois" : v === "2s" ? "2 sem." : "Semaine"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="px-5 py-2.5 flex items-center gap-4 flex-wrap border-b border-slate-100">
        {LEGENDE.map((l) => (
          <span key={l.type} className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <span className={`w-3 h-3 rounded ring-1 ring-inset ${l.swatch}`} aria-hidden />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
          <span className="w-3 h-3 rounded ring-1 ring-inset ring-slate-200" style={HACHURE} aria-hidden />
          Non ouvré
        </span>
      </div>

      {/* Grille */}
      {grille.lignes.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-slate-400">Aucun surveillant à afficher pour ces filtres.</div>
      ) : (
        <div className="overflow-auto max-h-[440px]">
          <table className="border-collapse" style={{ minWidth: 220 + joursVisibles.length * colWidth }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 bg-white text-left px-4 py-2 text-[10.5px] font-bold text-slate-400 uppercase tracking-[.6px] border-b border-r border-slate-100 min-w-[200px]">
                  Surveillant
                </th>
                {joursVisibles.map((j) => (
                  <th
                    key={j.jour}
                    className={`px-0 py-1.5 text-center border-b border-slate-100 ${j.weekend ? "bg-slate-50" : "bg-white"} ${j.aujourdhui ? "bg-indigo-50" : ""}`}
                    style={{ width: colWidth, minWidth: colWidth }}
                  >
                    <div className={`text-[9px] font-semibold uppercase ${j.aujourdhui ? "text-indigo-600" : "text-slate-400"}`}>{DOW_FR[j.dow]}</div>
                    <div className={`text-[11px] font-bold ${j.aujourdhui ? "text-indigo-700" : "text-slate-600"}`}>{j.jour}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grille.lignes.map((ligne) => (
                <tr key={ligne.surveillantId} className="hover:bg-slate-50/40">
                  <th className="sticky left-0 z-10 bg-white text-left px-4 py-1.5 border-b border-r border-slate-100 min-w-[200px]">
                    <button onClick={() => onSelect(ligne.surveillantId)} className="flex items-center gap-2 text-left group">
                      <Avatar id={ligne.surveillantId} nom={ligne.nom} size={22} />
                      <span className="text-[12px] font-medium text-slate-700 truncate max-w-[150px] group-hover:text-indigo-600">{ligne.nom}</span>
                    </button>
                  </th>
                  {ligne.cells.slice(start, end).map((c) => (
                    <td
                      key={c.jour}
                      className="p-0.5 border-b border-slate-50"
                      style={{ width: colWidth, minWidth: colWidth }}
                    >
                      <div
                        title={`${ligne.nom} — ${c.jour} : ${typeLabel(c.type)}${c.heures > 0 ? ` (${c.heures}h)` : ""}`}
                        className={`h-7 rounded flex items-center justify-center text-[10.5px] ${cellClasses(c.type)} ${c.aujourdhui ? "ring-1 ring-inset ring-indigo-400" : ""}`}
                        style={c.type === "non-ouvre" ? HACHURE : undefined}
                      >
                        {cellText(c)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
