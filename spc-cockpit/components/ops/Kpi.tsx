import Link from "next/link";

// Carte KPI UNIQUE du module Opérations — source de vérité unique.
// Remplace les implémentations locales (CockpitKpi, Kpi de la page Risques).
//   variant   : style de carte + pastille d'icône (default / amber / alert)
//   valueTone : couleur du chiffre sur carte claire (défaut / red / amber / blue / emerald)
//   icon      : optionnel (certaines pages n'en ont pas)
//   href      : rend la carte cliquable
//   truncate  : coupe les valeurs longues (ex. nom de client)

export type KpiVariant = "default" | "amber" | "alert";
export type KpiValueTone = "default" | "red" | "amber" | "blue" | "emerald";

const VALUE_TONE: Record<KpiValueTone, string> = {
  default: "text-gray-900",
  red: "text-red-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  emerald: "text-emerald-600",
};

function KpiBody({
  label,
  value,
  sub,
  icon,
  variant,
  valueTone,
  truncate,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  variant: KpiVariant;
  valueTone: KpiValueTone;
  truncate: boolean;
}) {
  const alert = variant === "alert";
  const chip = alert
    ? "bg-amber-100 text-amber-600"
    : variant === "amber"
    ? "bg-amber-50 text-amber-600"
    : "bg-blue-50 text-blue-600";
  const labelCls = alert ? "text-amber-700" : "text-gray-500";
  const valueCls = alert ? "text-amber-600" : VALUE_TONE[valueTone];
  const subCls = alert ? "text-amber-600 font-semibold" : "text-gray-500";
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-[1px] ${labelCls}`}>{label}</span>
        {icon && <span aria-hidden className={`w-8 h-8 rounded-lg flex items-center justify-center ${chip}`}>{icon}</span>}
      </div>
      <div className={`text-[26px] font-extrabold leading-none ${valueCls} ${truncate ? "truncate" : ""}`}>{value}</div>
      <div className={`text-[12px] mt-1.5 ${subCls}`}>{sub}</div>
    </>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon,
  href,
  variant = "default",
  valueTone = "default",
  truncate = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
  href?: string;
  variant?: KpiVariant;
  valueTone?: KpiValueTone;
  truncate?: boolean;
}) {
  const card =
    variant === "alert"
      ? "rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm p-5"
      : "bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5";
  const body = <KpiBody label={label} value={value} sub={sub} icon={icon} variant={variant} valueTone={valueTone} truncate={truncate} />;
  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label} : ${value} — ${sub}. Ouvrir la page.`}
        className={`${card} block transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500`}
      >
        {body}
      </Link>
    );
  }
  return <div className={card}>{body}</div>;
}
