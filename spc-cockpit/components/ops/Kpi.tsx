const ACCENT = "#6366f1";

export function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-gray-400">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}12`, color: ACCENT }}>
          {icon}
        </span>
      </div>
      <div className="text-[26px] font-extrabold text-gray-900 leading-none">{value}</div>
      <div className="text-[12px] text-gray-400 mt-1.5">{sub}</div>
    </div>
  );
}
