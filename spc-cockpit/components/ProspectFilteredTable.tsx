"use client";

import { useState, useMemo } from "react";
import type { Prospect } from "@/lib/types";
import { ProspectStatutSelect, ProspectDeleteButton } from "@/components/ProspectCRM";
import { AddProspectButton } from "@/components/AddProspectModal";
import { EmailSequenceButton } from "@/components/EmailSequenceButton";
import { ProspectDrawer } from "@/components/ProspectDrawer";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Table2, Columns, Download, Search } from "lucide-react";

import { parseFRDate } from "@/lib/utils/date";

function RelanceBadge({ date }: { date?: string }) {
  if (!date) return <span className="text-[11px] text-gray-300">—</span>;
  const d = parseFRDate(date);
  if (!d) return <span className="text-[11px] text-gray-400">{date}</span>;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  const cls = diff < 0 ? "bg-red-100 text-red-600" : diff === 0 ? "bg-orange-100 text-orange-600" : diff <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500";
  const label = diff < 0 ? `J+${Math.abs(diff)}` : diff === 0 ? "Auj." : diff === 1 ? "Demain" : date;
  return <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}

function exportCSV(prospects: Prospect[]) {
  const headers = ["Nom", "Segment", "Cluster", "Score BANT", "Niveau", "Priorité", "Statut", "Relance", "Notes"];
  const rows = prospects.map((p) => [
    p.nom, p.segment, p.cluster, p.scoreBANT, p.niveau, p.priorite, p.statut,
    p.prochaineRelance ?? "", p.notes ?? "",
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
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
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
  const selectedIndex = selected ? filtered.findIndex(p => p.id === selected.id) : -1;

  function handleUpdated(id: string, fields: Partial<Prospect>) {
    setLocalProspects((prev) => prev.map((p) => p.id === id ? { ...p, ...fields } : p));
    setSelected((prev) => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[14px] font-semibold text-gray-900">
          Top prospects — Vague 1
          {hasFilters && <span className="ml-2 text-[12px] font-normal text-gray-400">{filtered.length} résultat{filtered.length !== 1 ? "s" : ""}</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-400">{allProspects.length} prospects</span>

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              title="Vue tableau"
              className={`px-2.5 py-1.5 transition-colors ${viewMode === "table" ? "bg-[#1a6b7e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              title="Vue Kanban"
              className={`px-2.5 py-1.5 transition-colors ${viewMode === "kanban" ? "bg-[#1a6b7e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => exportCSV(filtered)}
            title="Exporter CSV"
            className="text-[12px] font-semibold text-gray-500 hover:text-[#1a6b7e] border border-gray-200 hover:border-[#1a6b7e]/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <AddProspectButton />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un prospect…" className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
        </div>
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600">
          <option value="">Tous segments</option>
          {segments.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cluster} onChange={(e) => setCluster(e.target.value)} className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600">
          <option value="">Tous clusters</option>
          {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 text-gray-600">
          <option value="">Tous statuts</option>
          {statuts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setSegment(""); setCluster(""); setStatut(""); }} className="text-[11.5px] text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Effacer ✕
          </button>
        )}
      </div>

      {/* Kanban view */}
      {viewMode === "kanban" && (
        <KanbanBoard prospects={filtered} onSelect={(p) => setSelected(p)} selectedId={selected?.id} />
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["#", "Établissement", "Segment", "Score", "Relance", "Statut", "Email", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-[.5px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-[13px] text-gray-400">Aucun prospect ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors ${i === 0 && !hasFilters ? "bg-[#1a6b7e]/[0.03]" : ""} ${selected?.id === p.id ? "bg-blue-50/60" : ""}`}
                >
                  <td className="px-3 py-2.5 text-[12px] font-bold text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-[12.5px] font-semibold text-gray-800">{p.nom}</div>
                    <div className="text-[11px] text-gray-400">{p.cluster}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-600">{p.segment}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-10 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%`, background: p.scoreBANT >= 8 ? "#38a169" : p.scoreBANT >= 5 ? "#f6ad55" : "#fc8181" }} />
                      </div>
                      <span className="text-[12px] font-bold text-gray-800">{p.scoreBANT}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <RelanceBadge date={p.prochaineRelance} />
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ProspectStatutSelect id={p.id} statut={p.statut} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <EmailSequenceButton prospectId={p.id} prospectNom={p.nom} />
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ProspectDeleteButton id={p.id} nom={p.nom} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer + backdrop */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={() => setSelected(null)} />
          <ProspectDrawer
            key={selected.id}
            prospect={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            allProspects={filtered}
            currentIndex={selectedIndex}
            onNavigate={(p) => setSelected(p)}
          />
        </>
      )}
    </div>
  );
}
