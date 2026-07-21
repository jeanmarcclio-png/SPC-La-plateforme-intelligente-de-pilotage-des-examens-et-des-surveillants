import Link from "next/link";

// Carte KPI UNIQUE du module Opérations.
//   accent   : indigo (défaut) | amber | emerald | blue | red | slate | violet
//   emphasis : "soft" (fond très clair) | "strong" (fond plus marqué)
//   variant  : "soft" (défaut, fond teinté discret) | "vivid" (carte blanche,
//              couleur SATURÉE — puce d'icône pleine + chiffre coloré + filet haut)
//   icon     : optionnel · href : carte cliquable · truncate : valeurs longues

export type KpiAccent = "indigo" | "amber" | "emerald" | "blue" | "red" | "slate" | "violet";
export type KpiEmphasis = "soft" | "strong";
export type KpiVariant = "soft" | "vivid";

interface AccentStyle {
  soft: string; // fond + bordure carte (emphasis soft)
  strong: string; // fond + bordure carte (emphasis strong)
  chip: string; // pastille d'icône (variant soft)
  value: string; // couleur du chiffre (variant soft)
  label: string; // couleur du libellé
  bar: string; // filet haut (variant vivid)
  chipVivid: string; // pastille d'icône pleine (variant vivid)
  valueVivid: string; // couleur du chiffre (variant vivid)
}

const ACCENTS: Record<KpiAccent, AccentStyle> = {
  indigo: { soft: "bg-indigo-50/60 border-indigo-100", strong: "bg-indigo-100/70 border-indigo-200", chip: "bg-indigo-100 text-indigo-600", value: "text-indigo-700", label: "text-slate-500", bar: "bg-indigo-500", chipVivid: "bg-indigo-600 text-white", valueVivid: "text-indigo-600" },
  amber: { soft: "bg-amber-50/60 border-amber-100", strong: "bg-amber-100/70 border-amber-200", chip: "bg-amber-100 text-amber-600", value: "text-amber-700", label: "text-slate-500", bar: "bg-amber-500", chipVivid: "bg-amber-500 text-white", valueVivid: "text-amber-600" },
  emerald: { soft: "bg-emerald-50/60 border-emerald-100", strong: "bg-emerald-100/70 border-emerald-200", chip: "bg-emerald-100 text-emerald-600", value: "text-emerald-700", label: "text-slate-500", bar: "bg-emerald-500", chipVivid: "bg-emerald-600 text-white", valueVivid: "text-emerald-600" },
  blue: { soft: "bg-sky-50/60 border-sky-100", strong: "bg-sky-100/70 border-sky-200", chip: "bg-sky-100 text-sky-600", value: "text-sky-700", label: "text-slate-500", bar: "bg-sky-500", chipVivid: "bg-sky-600 text-white", valueVivid: "text-sky-600" },
  red: { soft: "bg-rose-50/60 border-rose-100", strong: "bg-rose-100/70 border-rose-200", chip: "bg-rose-100 text-rose-600", value: "text-rose-700", label: "text-slate-500", bar: "bg-rose-500", chipVivid: "bg-rose-600 text-white", valueVivid: "text-rose-600" },
  slate: { soft: "bg-white border-gray-200/80", strong: "bg-slate-50 border-slate-200", chip: "bg-slate-100 text-slate-600", value: "text-slate-900", label: "text-slate-500", bar: "bg-slate-400", chipVivid: "bg-slate-700 text-white", valueVivid: "text-slate-800" },
  violet: { soft: "bg-violet-50/60 border-violet-100", strong: "bg-violet-100/70 border-violet-200", chip: "bg-violet-100 text-violet-600", value: "text-violet-700", label: "text-slate-500", bar: "bg-violet-500", chipVivid: "bg-violet-600 text-white", valueVivid: "text-violet-600" },
};

function KpiBody({
  label, value, sub, icon, style, emphasis, variant, truncate,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode;
  style: AccentStyle; emphasis: KpiEmphasis; variant: KpiVariant; truncate: boolean;
}) {
  const vivid = variant === "vivid";
  const chipCls = vivid ? style.chipVivid : style.chip;
  const valCls = vivid ? style.valueVivid : style.value;
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-[1px] ${style.label}`}>{label}</span>
        {icon && <span aria-hidden className={`w-8 h-8 rounded-lg flex items-center justify-center ${chipCls}`}>{icon}</span>}
      </div>
      <div className={`text-[26px] font-extrabold leading-none ${valCls} ${truncate ? "truncate" : ""}`}>{value}</div>
      <div className={`text-[12px] mt-1.5 ${emphasis === "strong" && !vivid ? style.value + " font-semibold" : "text-slate-500"}`}>{sub}</div>
    </>
  );
}

export function Kpi({
  label, value, sub, icon, href, accent = "indigo", emphasis = "soft", variant = "soft", truncate = false,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode; href?: string;
  accent?: KpiAccent; emphasis?: KpiEmphasis; variant?: KpiVariant; truncate?: boolean;
}) {
  const style = ACCENTS[accent];
  const vivid = variant === "vivid";
  const card = vivid
    ? "relative rounded-2xl border border-gray-200/80 bg-white shadow-sm p-5 pt-[22px] overflow-hidden"
    : `rounded-2xl border shadow-sm p-5 ${emphasis === "strong" ? style.strong : style.soft}`;
  const body = (
    <>
      {vivid && <span aria-hidden className={`absolute top-0 left-0 right-0 h-[3px] ${style.bar}`} />}
      <KpiBody label={label} value={value} sub={sub} icon={icon} style={style} emphasis={emphasis} variant={variant} truncate={truncate} />
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label} : ${value} — ${sub}. Ouvrir la page.`}
        className={`${card} block transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-indigo-500`}
      >
        {body}
      </Link>
    );
  }
  return <div className={card}>{body}</div>;
}
