"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { SurvRow } from "./types";
import { Avatar, RoleBadge, DispoBadge, Competences, Stars, PortailBadge } from "./ui";

const PER_PAGE_OPTIONS = [10, 25, 50];

function DispoMaj({ row }: { row: SurvRow }) {
  const bribes = [row.dispoMatin, row.dispoApm].filter(Boolean).join(" · ");
  return (
    <div>
      <DispoBadge statut={row.statut} />
      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px]">{bribes || row.zone || "—"}</div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  tone = "slate",
}: {
  label: string;
  onClick: () => void;
  tone?: "slate" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
      : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${cls}`}
    >
      {tone === "danger" ? <Trash2 className="w-4 h-4" aria-hidden /> : label.startsWith("Modifier") ? <Pencil className="w-4 h-4" aria-hidden /> : <CalendarDays className="w-4 h-4" aria-hidden />}
    </button>
  );
}

export function EquipeTable({
  rows,
  totalCount,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: SurvRow[];
  totalCount: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onEdit: (row: SurvRow) => void;
  onDelete: (row: SurvRow) => void;
}) {
  const [perPage, setPerPage] = useState(10);
  const [requestedPage, setRequestedPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  // Page effective : bornée à l'intervalle valide (dérivée, pas d'effet — la
  // liste filtrée peut rétrécir sous la page demandée).
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const setPage = setRequestedPage;

  const pageRows = useMemo(() => rows.slice((page - 1) * perPage, page * perPage), [rows, page, perPage]);
  const from = rows.length === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, rows.length);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* En-tête de section */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-100 flex-wrap">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Équipe mobilisable</h2>
          <p className="text-[12px] text-slate-400">
            {rows.length} surveillant{rows.length > 1 ? "s" : ""}
            {rows.length !== totalCount && <span className="text-slate-300"> · sur {totalCount}</span>}
          </p>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              {["Surveillant", "Rôle", "Compétences", "Disponibilité (MAJ)", "Heures prévues", "Mission", "Note", ""].map((h, i) => (
                <th key={i} className={`px-5 py-2.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-[.7px] ${i >= 4 && i <= 6 ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-[13px] text-slate-400">Aucun surveillant ne correspond aux filtres.</td></tr>
            )}
            {pageRows.map((s) => {
              const selected = s.id === selectedId;
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selected ? "bg-sky-50/80" : "hover:bg-slate-50/70"}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar id={s.id} nom={s.nom} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-800 truncate">{s.nom}</div>
                        <div className="text-[11.5px] text-slate-400 truncate max-w-[180px]">{s.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><RoleBadge role={s.role} /></td>
                  <td className="px-5 py-3"><Competences qualifications={s.qualifications} /></td>
                  <td className="px-5 py-3"><DispoMaj row={s} /></td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[13.5px] font-bold text-slate-800">{s.heures}</span>
                    <span className="text-[11px] text-slate-400"> h</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="text-[12.5px] font-medium text-slate-700 truncate max-w-[140px] ml-auto">{s.missionClient ?? "—"}</div>
                    <div className="mt-0.5"><PortailBadge statut={s.portail} /></div>
                  </td>
                  <td className="px-5 py-3 text-right"><Stars note={s.note} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconAction label={`Ouvrir le profil de ${s.nom}`} onClick={() => onSelect(s.id)} />
                      <IconAction label={`Modifier ${s.nom}`} onClick={() => onEdit(s)} />
                      <IconAction label={`Supprimer ${s.nom}`} tone="danger" onClick={() => onDelete(s)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 flex-wrap">
        <div className="text-[12px] text-slate-500">
          Affichage de <span className="font-semibold text-slate-700">{from}</span> à <span className="font-semibold text-slate-700">{to}</span> sur <span className="font-semibold text-slate-700">{rows.length}</span> surveillant{rows.length > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label="Page précédente"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg text-[12.5px] font-semibold transition-colors ${
                  p === page ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Page suivante"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            aria-label="Nombre de lignes par page"
            className="text-[12px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none"
          >
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
