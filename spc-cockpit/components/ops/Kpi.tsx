import Link from "next/link";

const ACCENT = "#2563eb";

function KpiBody({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-gray-400">{label}</span>
        <span aria-hidden className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}12`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[12px] text-gray-400 mt-1.5">{sub}</div>
    </>
  );
}

export function Kpi({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const base = "bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5";
  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label} : ${value} — ${sub}. Ouvrir la page.`}
        className={`${base} block transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500`}
      >
        <KpiBody label={label} value={value} sub={sub} icon={icon} />
      </Link>
    );
  }
  return (
    <div className={base}>
      <KpiBody label={label} value={value} sub={sub} icon={icon} />
    </div>
  );
}
