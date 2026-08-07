import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

// Carte KPI du dashboard exécutif (référence SPC Cockpit).
// Titre en capitales · grande valeur · delta signé · sous-titre · pastille
// d'icône colorée · mini-visualisation en pied. Cliquable (href) vers la source.

export type KpiTone = "emerald" | "violet" | "amber" | "blue" | "cyan" | "red";

const TONE: Record<KpiTone, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-50 text-emerald-600", icon: "text-emerald-600" },
  violet: { chip: "bg-violet-50 text-violet-600", icon: "text-violet-600" },
  amber: { chip: "bg-amber-50 text-amber-600", icon: "text-amber-600" },
  blue: { chip: "bg-blue-50 text-blue-600", icon: "text-blue-600" },
  cyan: { chip: "bg-cyan-50 text-cyan-600", icon: "text-cyan-600" },
  red: { chip: "bg-rose-50 text-rose-600", icon: "text-rose-600" },
};

export interface KpiDelta {
  text: string;
  direction: "up" | "down" | "flat";
  /** Une baisse est-elle défavorable ? (true par défaut : vert = hausse). */
  positiveWhenUp?: boolean;
}

export function KpiProCard({
  label,
  value,
  delta,
  sub,
  icon,
  tone = "blue",
  viz,
  href,
}: {
  label: string;
  value: string;
  delta?: KpiDelta;
  sub: string;
  icon: React.ReactNode;
  tone?: KpiTone;
  viz?: React.ReactNode;
  href?: string;
}) {
  const t = TONE[tone];
  const favorable = delta ? (delta.direction === "up") === (delta.positiveWhenUp ?? true) || delta.direction === "flat" : true;
  const deltaCls = delta?.direction === "flat" ? "text-slate-500 bg-slate-100" : favorable ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50";

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.6px] text-slate-500">{label}</span>
        <span aria-hidden className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${t.chip}`}>{icon}</span>
      </div>
      <div className="mt-2 flex items-end gap-2 flex-wrap">
        <span className="text-[27px] leading-none font-extrabold text-slate-900 tracking-tight">{value}</span>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold px-1.5 py-0.5 rounded-md ${deltaCls}`}>
            {delta.direction === "up" && <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />}
            {delta.direction === "down" && <ArrowDownRight className="w-3.5 h-3.5" aria-hidden />}
            {delta.text}
          </span>
        )}
      </div>
      <div className="text-[12px] text-slate-500 mt-1.5">{sub}</div>
      {viz && <div className="mt-3 h-9">{viz}</div>}
    </>
  );

  const card = "block bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-5";
  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label} : ${value} — ${sub}`}
        className={`${card} transition-all hover:shadow-[0_6px_18px_rgba(15,23,42,0.09)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}
      >
        {body}
      </Link>
    );
  }
  return <div className={card}>{body}</div>;
}
