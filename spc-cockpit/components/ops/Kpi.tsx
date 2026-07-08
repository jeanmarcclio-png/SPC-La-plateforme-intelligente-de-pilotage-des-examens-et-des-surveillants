import Link from "next/link";

// Carte KPI UNIQUE du module Opérations — direction « Indigo premium ».
// Chaque carte reçoit un fond légèrement teinté + un chiffre coloré (accent),
// pour un rendu vivant et contrasté plutôt que blanc plat.
//   accent   : indigo (défaut) | amber | emerald | blue | red | slate
//   emphasis : "soft" (fond très clair) | "strong" (fond plus marqué, ex. Alertes)
//   icon     : optionnel · href : carte cliquable · truncate : valeurs longues

export type KpiAccent = "indigo" | "amber" | "emerald" | "blue" | "red" | "slate";
export type KpiEmphasis = "soft" | "strong";

interface AccentStyle {
  soft: string; // fond + bordure carte (emphasis soft)
  strong: string; // fond + bordure carte (emphasis strong)
  chip: string; // pastille d'icône
  value: string; // couleur du chiffre
  label: string; // couleur du libellé
}

const ACCENTS: Record<KpiAccent, AccentStyle> = {
  indigo: { soft: "bg-indigo-50/60 border-indigo-100", strong: "bg-indigo-100/70 border-indigo-200", chip: "bg-indigo-100 text-indigo-600", value: "text-indigo-700", label: "text-slate-500" },
  amber: { soft: "bg-amber-50/60 border-amber-100", strong: "bg-amber-100/70 border-amber-200", chip: "bg-amber-100 text-amber-600", value: "text-amber-700", label: "text-slate-500" },
  emerald: { soft: "bg-emerald-50/60 border-emerald-100", strong: "bg-emerald-100/70 border-emerald-200", chip: "bg-emerald-100 text-emerald-600", value: "text-emerald-700", label: "text-slate-500" },
  blue: { soft: "bg-sky-50/60 border-sky-100", strong: "bg-sky-100/70 border-sky-200", chip: "bg-sky-100 text-sky-600", value: "text-sky-700", label: "text-slate-500" },
  red: { soft: "bg-rose-50/60 border-rose-100", strong: "bg-rose-100/70 border-rose-200", chip: "bg-rose-100 text-rose-600", value: "text-rose-700", label: "text-slate-500" },
  slate: { soft: "bg-white border-gray-200/80", strong: "bg-slate-50 border-slate-200", chip: "bg-slate-100 text-slate-600", value: "text-slate-900", label: "text-slate-500" },
};

function KpiBody({
  label, value, sub, icon, style, emphasis, truncate,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode;
  style: AccentStyle; emphasis: KpiEmphasis; truncate: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-[1px] ${style.label}`}>{label}</span>
        {icon && <span aria-hidden className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.chip}`}>{icon}</span>}
      </div>
      <div className={`text-[26px] font-extrabold leading-none ${style.value} ${truncate ? "truncate" : ""}`}>{value}</div>
      <div className={`text-[12px] mt-1.5 ${emphasis === "strong" ? style.value + " font-semibold" : "text-slate-500"}`}>{sub}</div>
    </>
  );
}

export function Kpi({
  label, value, sub, icon, href, accent = "indigo", emphasis = "soft", truncate = false,
}: {
  label: string; value: string; sub: string; icon?: React.ReactNode; href?: string;
  accent?: KpiAccent; emphasis?: KpiEmphasis; truncate?: boolean;
}) {
  const style = ACCENTS[accent];
  const card = `rounded-2xl border shadow-sm p-5 ${emphasis === "strong" ? style.strong : style.soft}`;
  const body = <KpiBody label={label} value={value} sub={sub} icon={icon} style={style} emphasis={emphasis} truncate={truncate} />;
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
