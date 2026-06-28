"use client";

import { useState, useTransition } from "react";
import type { Prospect } from "@/lib/types";
import { updateProspectStatut } from "@/app/actions/prospects";

import { COLONNES_PIPELINE as COLONNES } from "@/lib/constants";
import { parseFRDate } from "@/lib/utils/date";

const NIVEAU_ICO: Record<string, string> = {
  "Très chaud": "🔥", "Chaud": "♨️", "Tiède": "〰", "Froid": "❄️",
};
const NIVEAU_CLS: Record<string, string> = {
  "Très chaud": "bg-red-100 text-red-700",
  "Chaud":      "bg-orange-100 text-orange-700",
  "Tiède":      "bg-yellow-100 text-yellow-700",
  "Froid":      "bg-gray-100 text-gray-500",
};

export function KanbanBoard({ prospects, onSelect, selectedId }: {
  prospects: Prospect[];
  onSelect: (p: Prospect) => void;
  selectedId?: string;
}) {
  const [items, setItems] = useState(prospects);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const today = new Date(); today.setHours(0, 0, 0, 0);

  function drop(statut: Prospect["statut"]) {
    if (!draggingId) return;
    const prev = items.find(p => p.id === draggingId);
    if (!prev || prev.statut === statut) { setDraggingId(null); setOverCol(null); return; }
    setItems(all => all.map(p => p.id === draggingId ? { ...p, statut } : p));
    startTransition(() => updateProspectStatut(draggingId, statut));
    setDraggingId(null); setOverCol(null);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLONNES.map(col => {
        const cards = items.filter(p => p.statut === col.key);
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            className={`flex-1 min-w-[210px] rounded-xl border-2 transition-colors ${isOver ? "border-[#4a90d9] bg-blue-50/40" : "border-gray-200 bg-gray-50"}`}
            onDragOver={e => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null); }}
            onDrop={() => drop(col.key)}
          >
            <div className="px-3 py-2.5 border-b border-gray-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
              <span className="text-[12px] font-semibold text-gray-700 flex-1">{col.label}</span>
              <span className="text-[10.5px] font-bold text-gray-500 bg-white border border-gray-200 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {cards.length}
              </span>
            </div>
            <div className="p-2 space-y-2 min-h-[140px]">
              {cards.map(p => {
                const d = parseFRDate(p.prochaineRelance);
                const diff = d ? Math.floor((d.getTime() - today.getTime()) / 86400000) : null;
                const bantColor = p.scoreBANT >= 8 ? "#38a169" : p.scoreBANT >= 5 ? "#f6ad55" : "#fc8181";
                const isSelected = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggingId(p.id)}
                    onDragEnd={() => { setDraggingId(null); setOverCol(null); }}
                    onClick={() => onSelect(p)}
                    className={`bg-white rounded-lg border p-2.5 cursor-pointer hover:shadow-md transition-all select-none ${
                      draggingId === p.id ? "opacity-40 scale-95" : ""
                    } ${isSelected ? "border-[#4a90d9] ring-2 ring-[#4a90d9]/20" : "border-gray-200 hover:border-[#4a90d9]/50"}`}
                  >
                    <div className="flex items-start gap-1.5 mb-1">
                      <span className="text-[11.5px] font-semibold text-gray-800 leading-snug flex-1 min-w-0 truncate">{p.nom}</span>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${NIVEAU_CLS[p.niveau] ?? ""}`}>
                        {NIVEAU_ICO[p.niveau]}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mb-2 truncate">{p.segment} · {p.cluster}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1 w-10 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%`, background: bantColor }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700">{p.scoreBANT}</span>
                      </div>
                      {diff !== null && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${diff < 0 ? "bg-red-100 text-red-600" : diff === 0 ? "bg-orange-100 text-orange-600" : "bg-green-50 text-green-600"}`}>
                          {diff < 0 ? `J+${Math.abs(diff)}` : diff === 0 ? "Auj." : `J-${diff}`}
                        </span>
                      )}
                    </div>
                    {p.canal && <div className="text-[9.5px] text-gray-400 mt-1.5 truncate">{p.canal}</div>}
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div className="text-center text-[11px] text-gray-300 py-10">Glissez ici</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
