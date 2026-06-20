"use client";

import { useState, useMemo } from "react";
import type { Prospect } from "@/lib/types";
import { ProspectStatutSelect, ProspectDeleteButton } from "@/components/ProspectCRM";
import { AddProspectButton } from "@/components/AddProspectModal";
import { EmailSequenceButton } from "@/components/EmailSequenceButton";
import { EmailHistoryButton } from "@/components/EmailHistory";
import { ProspectDrawer } from "@/components/ProspectDrawer";

function exportCSV(prospects: Prospect[]) {
  const headers = ["Nom", "Segment", "Cluster", "Score BANT", "Niveau", "Priorité", "Vague", "Interlocuteur", "Canal", "Statut", "Action", "Notes"];
  const rows = prospects.map((p) => [
    p.nom, p.segment, p.cluster, p.scoreBANT, p.niveau, p.priorite, p.vague,
    p.interlocuteur, p.canal, p.statut, p.action, p.notes ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prospects-spc-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProspectFilteredTable({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [cluster, setCluster] = useState("");
  const [statut, setStatut] = useState("");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [localProspects, setLocalProspects] = useState<Prospect[]>(prospects);

  const allProspects = localProspects.length ? localProspects : prospects;

  const segments = useMemo(() => [...new Set(allProspects.map((p) => p.segment))].sort(), [allProspects]);
  const clusters = useMemo(() => [...new Set(allProspects.map((p) => p.cluster).filter(Boolean))].sort(), [allProspects]);
  const statuts = useMemo(() => [...new Set(allProspects.map((p) => p.statut))].sort(), [allProspects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allProspects.filter((p) => {
      if (q && !p.nom.toLowerCase().includes(q) && !p.cluster.toLowerCase().includes(q)) return false;
      if (segment && p.segment !== segment) return false;
      if (cluster && p.cluster !== cluster) return false;
      if (statut && p.statut !== statut) return false;
      return true;
    });
  }, [allProspects, search, segment, cluster, statut]);

  const hasFilters = search || segment || cluster || statut;

  function handleUpdated(id: string, fields: Partial<Prospect>) {
    setLocalProspects((prev) => prev.map((p) => p.id === id ? { ...p, ...fields } : p));
    setSelected((prev) => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  return (
    <div>
      {/* Header + filters */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] font-semibold text-gray-900">
          Top prospects — Vague 1
          {hasFilters && <span className="ml-2 text-[12px] font-normal text-gray-400">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-400">{allProspects.length} chargés</span>
          <button
            onClick={() => exportCSV(filtered)}
            title="Exporter les prospects filtrés en CSV"
            className="text-[12px] font-semibold text-gray-500 hover:text-[#1a6b7e] border border-gray-200 hover:border-[#1a6b7e]/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
          <AddProspectButton />
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un prospect…"
            className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600"
        >
          <option value="">Tous les segments</option>
          {segments.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value)}
          className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600"
        >
          <option value="">Tous les clusters</option>
          {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600"
        >
          <option value="">Tous les statuts</option>
          {statuts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setSegment(""); setCluster(""); setStatut(""); }}
            className="text-[11.5px] text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Effacer ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["#", "Établissement", "Segment", "Score", "Statut", "Email", "Historique", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10.5px] font-semibold text-gray-500 uppercase tracking-[.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[13px] text-gray-400">
                  Aucun prospect ne correspond aux filtres.
                </td>
              </tr>
            )}
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer ${i === 0 && !hasFilters ? "bg-[#1a6b7e]/[0.03]" : ""} ${selected?.id === p.id ? "bg-blue-50/60" : ""}`}
              >
                <td className="px-3 py-2.5 text-[12px] font-bold text-gray-400">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="text-[12.5px] font-semibold text-gray-800">{p.nom}</div>
                  <div className="text-[11px] text-gray-400">{p.cluster}</div>
                </td>
                <td className="px-3 py-2.5 text-[12px] text-gray-600">{p.segment}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-12 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1a6b7e] rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%` }} />
                    </div>
                    <span className="text-[12px] font-bold text-gray-800">{p.scoreBANT}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <ProspectStatutSelect id={p.id} statut={p.statut} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <EmailSequenceButton prospectId={p.id} prospectNom={p.nom} />
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <EmailHistoryButton prospectId={p.id} prospectNom={p.nom} />
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <ProspectDeleteButton id={p.id} nom={p.nom} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={() => setSelected(null)}
          />
          <ProspectDrawer
            prospect={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
          />
        </>
      )}
    </div>
  );
}
