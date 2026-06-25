"use client";

import { useState, useMemo } from "react";
import type { Prospect } from "@/lib/types";

const niveauBg: Record<string, string> = {
  "Très chaud": "bg-red-100 text-red-700",
  "Chaud":      "bg-orange-100 text-orange-700",
  "Tiède":      "bg-yellow-100 text-yellow-700",
};

const statutBg: Record<string, string> = {
  "Converti": "bg-green-100 text-green-700",
  "RDV fixé": "bg-orange-100 text-orange-700",
  "En cours": "bg-blue-100 text-blue-700",
};

export function MobileProspectList({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return prospects;
    return prospects.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        p.segment.toLowerCase().includes(q) ||
        p.cluster.toLowerCase().includes(q) ||
        p.statut.toLowerCase().includes(q)
    );
  }, [prospects, search]);

  return (
    <div className="space-y-3">
      {/* Barre de recherche */}
      <div className="relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un prospect…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/30 focus:border-[#1a6b7e]"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[16px] leading-none">
            ×
          </button>
        )}
      </div>

      {/* Compteur */}
      <div className="text-[13px] font-bold text-gray-900">
        {search ? `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}` : `Tous les prospects (${prospects.length})`}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-[13px] text-gray-400 border border-gray-100">
          Aucun prospect trouvé pour &quot;{search}&quot;
        </div>
      ) : (
        filtered.map((p) => {
          const bantColor = p.scoreBANT >= 8 ? "#38a169" : p.scoreBANT >= 5 ? "#f6ad55" : "#fc8181";
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-gray-900 truncate">{p.nom}</div>
                  <div className="text-[11px] text-gray-400">{p.segment} · {p.cluster}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${niveauBg[p.niveau] ?? "bg-gray-100 text-gray-500"}`}>
                  {p.niveau}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%`, background: bantColor }} />
                  </div>
                  <span className="text-[13px] font-extrabold text-gray-800 min-w-[20px]">{p.scoreBANT}</span>
                </div>
                <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${statutBg[p.statut] ?? "bg-gray-100 text-gray-500"}`}>
                  {p.statut}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
