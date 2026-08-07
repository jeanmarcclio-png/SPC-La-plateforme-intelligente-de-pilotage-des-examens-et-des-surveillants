import type { ActionSeverite, EtatCouverture } from "@/lib/operations/dashboard";

// Badges spécifiques au dashboard (priorité d'action, couverture de session).
// Le point coloré double la couleur par une forme → statut lisible sans la
// couleur seule (WCAG). Les badges de statut mission/devis restent dans
// components/ops/badges.tsx (source unique partagée).

const PRIORITE: Record<ActionSeverite, { cls: string; label: string }> = {
  critique: { cls: "bg-rose-100 text-rose-700", label: "Critique" },
  important: { cls: "bg-amber-100 text-amber-700", label: "Important" },
  suivre: { cls: "bg-blue-100 text-blue-700", label: "À suivre" },
};

export function PriorityBadge({ severite }: { severite: ActionSeverite }) {
  const p = PRIORITE[severite];
  return <span className={`text-[10px] font-extrabold uppercase tracking-wide rounded px-1.5 py-0.5 ${p.cls}`}>{p.label}</span>;
}

// Pastille de couleur pour l'état de couverture (calendrier / sessions).
export const COUVERTURE_COULEUR: Record<EtatCouverture, string> = {
  complet: "#10B981",
  attention: "#F59E0B",
  risque: "#EF4444",
  "a-planifier": "#94A3B8",
};

const COUVERTURE_LABEL: Record<EtatCouverture, string> = {
  complet: "Bonne couverture",
  attention: "Attention",
  risque: "Risque",
  "a-planifier": "À planifier",
};

export function CoverageBar({ taux, etat, className = "" }: { taux: number; etat: EtatCouverture; className?: string }) {
  const color = COUVERTURE_COULEUR[etat];
  const pct = Math.round(Math.max(0, Math.min(1, taux)) * 100);
  if (etat === "a-planifier") {
    return <span className="text-[11px] font-semibold text-slate-400">À planifier</span>;
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 w-14 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums" style={{ color }}>{pct} %</span>
    </div>
  );
}

export function CoverageLegend() {
  const items: EtatCouverture[] = ["complet", "attention", "risque", "a-planifier"];
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {items.map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: COUVERTURE_COULEUR[e] }} />
          {COUVERTURE_LABEL[e]}
        </span>
      ))}
    </div>
  );
}
