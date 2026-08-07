// Mini-graphiques du centre de pilotage Missions.
// Purement présentationnels : ils ne calculent RIEN, ils tracent les séries
// réelles fournies par lib/operations/missions-dashboard. Chaque graphique est
// masqué aux lecteurs d'écran (aria-hidden) et systématiquement accompagné
// d'un équivalent textuel côté carte (WCAG — jamais la couleur seule).

/** Trace une courbe (ou un histogramme) dans un viewBox 100×32 déformable. */
export function Sparkline({
  values,
  color,
  variant = "line",
  className = "",
}: {
  values: number[];
  color: string;
  variant?: "line" | "bars";
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const amplitude = max - min || 1;
  const y = (v: number) => 30 - ((v - min) / amplitude) * 26;

  if (variant === "bars") {
    const larg = 100 / (values.length * 1.6);
    const pas = 100 / values.length;
    return (
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className={`w-full h-8 ${className}`}>
        {values.map((v, i) => {
          const hauteur = Math.max(2, 30 - y(v));
          return (
            <rect
              key={i}
              x={i * pas + (pas - larg) / 2}
              y={32 - hauteur}
              width={larg}
              height={hauteur}
              rx={1.2}
              fill={color}
              opacity={i === values.length - 1 ? 1 : 0.34}
            />
          );
        })}
      </svg>
    );
  }

  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${y(v)}`);
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className={`w-full h-8 ${className}`}>
      <polyline
        points={`0,32 ${points.join(" ")} 100,32`}
        fill={color}
        opacity={0.1}
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Anneau de progression (0–100). Le pourcentage est rendu en texte au centre. */
export function ProgressRing({
  valeur,
  taille = 118,
  epaisseur = 11,
  couleur = "#695CFF",
  fond = "rgba(255,255,255,0.12)",
  children,
}: {
  valeur: number;
  taille?: number;
  epaisseur?: number;
  couleur?: string;
  fond?: string;
  children?: React.ReactNode;
}) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, valeur));
  return (
    <div className="relative flex-shrink-0" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} aria-hidden className="-rotate-90">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={fond} strokeWidth={epaisseur} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={couleur}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="[transition:stroke-dashoffset_900ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export interface SegmentDonut {
  label: string;
  valeur: number;
  couleur: string;
}

/** Donut compact — segments proportionnels, centre libre. */
export function Donut({
  segments,
  taille = 132,
  epaisseur = 16,
  children,
}: {
  segments: SegmentDonut[];
  taille?: number;
  epaisseur?: number;
  children?: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.valeur), 0);
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  let cumul = 0;

  return (
    <div className="relative flex-shrink-0" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} aria-hidden className="-rotate-90">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="#EDF0F5" strokeWidth={epaisseur} />
        {total > 0 &&
          segments.map((s) => {
            const part = Math.max(0, s.valeur) / total;
            if (part <= 0) return null;
            const offset = cumul;
            cumul += part;
            return (
              <circle
                key={s.label}
                cx={taille / 2}
                cy={taille / 2}
                r={r}
                fill="none"
                stroke={s.couleur}
                strokeWidth={epaisseur}
                strokeDasharray={`${c * part} ${c * (1 - part)}`}
                strokeDashoffset={-c * offset}
              />
            );
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Barre d'avancement horizontale (tableau des missions). */
export function ProgressBar({ valeur, couleur }: { valeur: number; couleur: string }) {
  const pct = Math.max(0, Math.min(100, valeur));
  return (
    <span aria-hidden className="block h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <span className="block h-full rounded-full bar-fill" style={{ width: `${pct}%`, background: couleur }} />
    </span>
  );
}
