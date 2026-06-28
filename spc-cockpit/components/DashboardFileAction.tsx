"use client";

import { useState } from "react";
import type { Prospect } from "@/lib/types";
import { ProspectDrawer } from "@/components/ProspectDrawer";

import { parseFRDate } from "@/lib/utils/date";

export function DashboardFileAction({
  prospects,
  today,
}: {
  prospects: Prospect[];
  today: number; // timestamp ms
}) {
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [localProspects, setLocalProspects] = useState<Prospect[]>(prospects);

  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);

  const selectedIndex = selected ? localProspects.findIndex(p => p.id === selected.id) : -1;

  function handleUpdated(id: string, fields: Partial<Prospect>) {
    setLocalProspects(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    setSelected(prev => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  return (
    <>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span>🔔</span>
          <span className="text-[13px] font-bold text-orange-800">File d&apos;action du jour</span>
          <span className="text-[10px] font-bold bg-orange-400 text-white rounded-full px-1.5 py-0.5">{localProspects.length}</span>
        </div>
        <div className="space-y-2">
          {localProspects.map((p) => {
            const d = parseFRDate(p.prochaineRelance);
            const diff = d ? Math.floor((d.getTime() - todayDate.getTime()) / 86400000) : 0;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full flex items-center justify-between bg-white rounded-xl p-3 border border-orange-100 text-left active:bg-orange-50"
              >
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">{p.nom}</div>
                  <div className="text-[11px] text-gray-500">{p.segment} · {p.cluster}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-bold px-2 py-1 rounded-lg ${diff < 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                    {diff < 0 ? `J+${Math.abs(diff)}` : "Auj."}
                  </span>
                  <span className="text-[11px] text-[#1a6b7e] font-semibold">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" onClick={() => setSelected(null)} />
          <ProspectDrawer
            key={selected.id}
            prospect={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            allProspects={localProspects}
            currentIndex={selectedIndex}
            onNavigate={(p) => setSelected(p)}
          />
        </>
      )}
    </>
  );
}
