// Graphiques SVG du dashboard — composants serveur, sans dépendance externe.
// Sobres, sémantiques, accessibles (role="img" + aria-label + <title>).
// Aucune animation 3D, quadrillage léger, formats français côté appelant.

import { euro } from "@/lib/operations/format";

// ── Sparkline (courbe de tendance des KPI) ───────────────────────────────────

export function Sparkline({
  points,
  color = "#10B981",
  className = "",
  ariaLabel,
}: {
  points: number[];
  color?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const W = 100;
  const H = 32;
  if (points.length < 2) {
    return <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" aria-hidden />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = W / (points.length - 1);
  const coords = points.map((p, i) => [i * step, H - 3 - ((p - min) / span) * (H - 6)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const [lx, ly] = coords[coords.length - 1];
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" role="img" aria-label={ariaLabel ?? "Tendance"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── Mini histogramme (KPI Missions à venir) ──────────────────────────────────

export function MiniHistogram({
  values,
  color = "#2563EB",
  className = "",
  ariaLabel,
}: {
  values: number[];
  color?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className={`flex items-end gap-[3px] ${className}`} role="img" aria-label={ariaLabel ?? "Répartition"}>
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-[2px]"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: color, opacity: v === 0 ? 0.18 : 0.35 + 0.65 * (v / max) }}
        />
      ))}
    </div>
  );
}

// ── Barre de progression (KPI Couverture) ────────────────────────────────────

export function ProgressBar({
  value,
  color = "#F59E0B",
  track = "#EEF2F7",
  className = "",
}: {
  value: number; // 0–1
  color?: string;
  track?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={`h-2 w-full rounded-full overflow-hidden ${className}`} style={{ background: track }} role="img" aria-label={`${Math.round(pct)} %`}>
      <div className="h-full rounded-full bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Donut de couverture ──────────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export function CoverageDonut({
  segments,
  total,
  centerValue,
  centerLabel,
  size = 168,
}: {
  segments: DonutSegment[];
  total: number;
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const filtered = segments.filter((s) => s.value > 0);
  const fracs = filtered.map((s) => (s.value / sum) * c);
  const arcs = filtered.map((s, i) => {
    const dash = fracs[i];
    const before = fracs.slice(0, i).reduce((a, b) => a + b, 0);
    return { color: s.color, dash, gap: c - dash, offset: -before, label: s.label };
  });
  const aria = segments.map((s) => `${s.label} ${s.value}`).join(", ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Couverture : ${aria} sur ${total}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
          />
        ))}
      </g>
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 34, fontWeight: 800, fill: "#0F172A" }}>
        {centerValue}
      </text>
      <text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fontWeight: 600, fill: "#64748B" }}>
        {centerLabel}
      </text>
    </svg>
  );
}

// ── Courbe d'évolution (couverture sur les dernières sessions) ────────────────

export function TrendLine({
  points,
  color = "#10B981",
  height = 150,
}: {
  points: { label: string; taux: number }[];
  color?: string;
  height?: number;
}) {
  const W = 320;
  const H = height;
  const padL = 30;
  const padB = 22;
  const padT = 10;
  const padR = 10;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (points.length < 2) {
    return <div className="text-[12px] text-slate-400 py-6 text-center">Pas assez d&apos;historique pour tracer une tendance.</div>;
  }
  const step = innerW / (points.length - 1);
  const y = (t: number) => padT + innerH - t * innerH; // taux 0–1
  const coords = points.map((p, i) => [padL + i * step, y(Math.max(0, Math.min(1, p.taux)))] as const);
  const line = coords.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const last = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Évolution de la couverture : de ${Math.round(points[0].taux * 100)} % à ${Math.round(points[points.length - 1].taux * 100)} %`}>
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={padL + innerW} y1={y(g)} y2={y(g)} stroke="#EEF2F7" strokeWidth="1" />
          <text x={padL - 6} y={y(g)} textAnchor="end" dominantBaseline="middle" style={{ fontSize: 9, fill: "#94A3B8" }}>
            {Math.round(g * 100)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#trend-fill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={i === coords.length - 1 ? 4 : 2.6} fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      <g>
        <rect x={last[0] - 20} y={last[1] - 22} width="40" height="16" rx="4" fill={color} />
        <text x={last[0]} y={last[1] - 14} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9.5, fontWeight: 700, fill: "#fff" }}>
          {Math.round(points[points.length - 1].taux * 100)} %
        </text>
      </g>
      {points.map((p, i) => (
        <text key={i} x={padL + i * step} y={H - 6} textAnchor="middle" style={{ fontSize: 9, fill: "#94A3B8" }}>
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ── Histogramme mensuel (Évolution du CA HT) ─────────────────────────────────

export function MonthlyBars({
  data,
  color = "#7C3AED",
  height = 150,
}: {
  data: { label: string; total: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));
  if (data.length === 0) {
    return <div className="text-[12px] text-slate-400 py-6 text-center">Aucune donnée de CA pour la période.</div>;
  }
  return (
    <div className="flex items-end gap-2.5" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.total / max) * (height - 24));
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 group" title={`${d.label} : ${euro(d.total)}`}>
            <span
              className="w-full max-w-[34px] rounded-t-[5px] transition-opacity group-hover:opacity-100"
              style={{ height: h, background: color, opacity: isLast ? 1 : 0.42 }}
            />
            <span className={`text-[10.5px] ${isLast ? "font-bold text-slate-700" : "text-slate-400"}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
