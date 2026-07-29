"use client";
import Link from "next/link";

type Prospect = {
  id: string;
  nom: string;
  segment: string;
  cluster: string;
  statut: string;
  scoreBANT: number;
  niveau: string;
  interlocuteur?: string;
};

const COLUMNS: { key: string; label: string; color: string; bg: string; border: string }[] = [
  { key: "Non contacté", label: "Non contacté", color: "#a0aec0", bg: "bg-gray-50",    border: "border-gray-200" },
  { key: "En cours",     label: "En cours",     color: "#4a90d9", bg: "bg-blue-50",    border: "border-blue-200" },
  { key: "RDV fixé",     label: "RDV fixé",     color: "#d97706", bg: "bg-orange-50",  border: "border-orange-200" },
  { key: "Converti",     label: "Converti",     color: "#38a169", bg: "bg-green-50",   border: "border-green-200" },
];

function ScoreDot({ score }: { score: number }) {
  const color = score >= 8 ? "#38a169" : score >= 6 ? "#d97706" : score >= 4 ? "#4a90d9" : "#a0aec0";
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[11px] font-bold" style={{ color }}>{score}/10</span>
    </div>
  );
}

export function ProspectKanban({ prospects }: { prospects: Prospect[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">Kanban</span>
        <span className="text-[11px] text-gray-400">{prospects.length} prospects au total</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const items = prospects.filter((p) => p.statut === col.key);
          return (
            <div key={col.key} className={`${col.bg} ${col.border} border rounded-xl p-2.5 min-h-[160px]`}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col.color }} />
                  <span className="text-[11.5px] font-bold text-gray-700">{col.label}</span>
                </div>
                <span
                  className="min-w-[20px] h-5 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center px-1.5"
                  style={{ background: items.length > 0 ? col.color : "#cbd5e0" }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-1.5">
                {items.slice(0, 8).map((p) => (
                  <Link
                    key={p.id}
                    href="/qualification"
                    className="block bg-white rounded-lg border border-gray-200 p-2 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <div className="text-[11.5px] font-semibold text-gray-800 leading-tight mb-1 truncate">{p.nom}</div>
                    <div className="text-[10px] text-gray-400 truncate mb-1.5">{p.segment} · {p.cluster}</div>
                    <div className="flex items-center justify-between">
                      <ScoreDot score={p.scoreBANT} />
                      {p.niveau === "Très chaud" && (
                        <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded">🔥</span>
                      )}
                    </div>
                  </Link>
                ))}
                {items.length > 8 && (
                  <Link href="/qualification" className="block text-center text-[10px] text-[#4a90d9] hover:underline py-1">
                    +{items.length - 8} autres
                  </Link>
                )}
                {items.length === 0 && (
                  <div className="text-[11px] text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    Aucun prospect
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion rate bar */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
        {COLUMNS.map((col) => {
          const count = prospects.filter((p) => p.statut === col.key).length;
          const pct = prospects.length > 0 ? Math.round((count / prospects.length) * 100) : 0;
          return (
            <div key={col.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11px] text-gray-500">{col.label}</span>
              <span className="text-[11px] font-bold text-gray-800">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
