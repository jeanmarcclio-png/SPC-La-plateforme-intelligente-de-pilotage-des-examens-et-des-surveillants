"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import type { WorkloadRow } from "@/lib/operations/dashboard";
import { heuresFR } from "@/lib/operations/format";
import { SectionCard } from "./SectionCard";

const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

type Tab = "semaine" | "jour" | "dispo";
const TABS: { key: Tab; label: string }[] = [
  { key: "semaine", label: "Par semaine" },
  { key: "jour", label: "Par jour" },
  { key: "dispo", label: "Disponibilité" },
];

function initiales(nom: string) {
  return nom.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function barColor(row: WorkloadRow): string {
  if (row.surcharge) return "#F59E0B";
  if (row.statut === "Disponible") return "#10B981";
  return "#3B82F6";
}

function etatLabel(row: WorkloadRow): { label: string; cls: string } {
  if (row.surcharge) return { label: "Surcharge", cls: "text-amber-600" };
  if (row.statut === "Disponible") return { label: "Disponible", cls: "text-emerald-600" };
  return { label: "Planifié", cls: "text-blue-600" };
}

export function WorkloadCard({ rows }: { rows: WorkloadRow[] }) {
  const [tab, setTab] = useState<Tab>("semaine");

  const view = useMemo(() => {
    // Par jour : heures hebdo réparties sur ~5 jours de session ; disponibilité :
    // les surveillants disponibles remontent en tête.
    const mapped = rows.map((r) => ({
      ...r,
      heuresAffichees: tab === "jour" ? Math.round((r.heures / 5) * 10) / 10 : r.heures,
    }));
    if (tab === "dispo") {
      const rank = (r: WorkloadRow) => (r.statut === "Disponible" ? 0 : r.surcharge ? 2 : 1);
      return [...mapped].sort((a, b) => rank(a) - rank(b) || b.heures - a.heures);
    }
    return mapped;
  }, [rows, tab]);

  const maxH = Math.max(1, ...view.map((r) => r.heuresAffichees));

  return (
    <SectionCard
      title="Charge des surveillants"
      icon={<UsersRound className="w-4 h-4" />}
      action={{ label: "Voir tout", href: "/operations/surveillants" }}
    >
      {/* Onglets */}
      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {view.map((r, i) => {
          const etat = etatLabel(r);
          return (
            <Link
              key={r.id}
              href="/operations/surveillants"
              className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-lg"
            >
              <span
                aria-hidden
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white flex-shrink-0"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {initiales(r.nom)}
              </span>
              <div className="w-[130px] min-w-0 flex-shrink-0">
                <div className="text-[12.5px] font-semibold text-slate-800 truncate group-hover:text-blue-700">{r.nom}</div>
                <div className="text-[10.5px] text-slate-400 truncate">{r.role}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, (r.heuresAffichees / maxH) * 100)}%`, background: barColor(r) }} />
                </div>
              </div>
              <div className="w-[86px] text-right flex-shrink-0">
                <div className="text-[12.5px] font-bold text-slate-800 tabular-nums">{heuresFR(r.heuresAffichees)}</div>
                <div className={`text-[10.5px] font-semibold ${etat.cls}`}>{etat.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {[
          { c: "#3B82F6", l: "Planifié" },
          { c: "#10B981", l: "Disponible" },
          { c: "#F59E0B", l: "Surcharge" },
        ].map((x) => (
          <span key={x.l} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: x.c }} />
            {x.l}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}
