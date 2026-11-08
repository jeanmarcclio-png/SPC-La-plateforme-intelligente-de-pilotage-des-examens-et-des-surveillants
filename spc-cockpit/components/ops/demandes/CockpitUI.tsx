// Primitives visuelles du cockpit des demandes clients (thème Dark Graphite).
// Composants purement présentationnels : aucune logique métier ici.

import { ACCENTS, DG, FOCUS_RING, OMBRE_CARTE, type Accent } from "./cockpit-theme";

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Carte({
  children,
  className = "",
  accent,
  halo = false,
  fond = DG.surface1,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: Accent;
  /** Halo coloré très discret, réservé aux cartes critiques (§12). */
  halo?: boolean;
  fond?: string;
}) {
  const a = accent ? ACCENTS[accent] : null;
  return (
    <div
      className={`relative rounded-xl border ${className}`}
      style={{
        background: fond,
        borderColor: a && halo ? a.ring : DG.borderSoft,
        boxShadow: halo && a ? `${OMBRE_CARTE}, 0 0 32px -14px ${a.glow}` : OMBRE_CARTE,
      }}
    >
      {children}
    </div>
  );
}

/** Pastille d'icône teintée (cercle discret, épaisseur de trait homogène). */
export function Pastille({
  accent = "neutral",
  children,
  taille = 34,
  rond = true,
}: {
  accent?: Accent;
  children: React.ReactNode;
  taille?: number;
  rond?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center flex-shrink-0 ${rond ? "rounded-full" : "rounded-lg"}`}
      style={{ width: taille, height: taille, background: a.soft, color: a.color, boxShadow: `inset 0 0 0 1px ${a.ring}` }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function BadgeDG({
  accent = "neutral",
  children,
  point = false,
  compact = false,
}: {
  accent?: Accent;
  children: React.ReactNode;
  /** Pastille pleine devant le libellé (statut). */
  point?: boolean;
  compact?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        compact ? "px-2 py-[3px] text-[10px] tracking-[.04em]" : "px-2.5 py-[4px] text-[11px]"
      }`}
      style={{ background: a.soft, color: a.color, boxShadow: `inset 0 0 0 1px ${a.ring}` }}
    >
      {point && <span aria-hidden className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />}
      {children}
    </span>
  );
}

/** Point d'état + libellé (fraîcheur d'une mise à jour). */
export function PointEtat({ accent }: { accent: Accent }) {
  return (
    <span
      aria-hidden
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: ACCENTS[accent].color, boxShadow: `0 0 0 3px ${ACCENTS[accent].soft}` }}
    />
  );
}

// ---------------------------------------------------------------------------
// Anneaux de progression
// ---------------------------------------------------------------------------

function arc(pct: number, rayon: number) {
  const circ = 2 * Math.PI * rayon;
  const part = (Math.max(0, Math.min(100, pct)) / 100) * circ;
  return { circ, dash: `${part} ${circ - part}` };
}

/**
 * Donut de conversion — anneau dégradé bleu → violet.
 * Le pourcentage est aussi restitué en texte : jamais une information par la
 * seule couleur (§29).
 */
export function Donut({
  pct,
  taille = 104,
  epaisseur = 9,
  libelle,
  sousLibelle,
}: {
  pct: number;
  taille?: number;
  epaisseur?: number;
  libelle: string;
  sousLibelle?: string;
}) {
  const r = (taille - epaisseur) / 2;
  const { dash } = arc(pct, r);
  const id = `donut-${taille}-${Math.round(pct)}`;
  return (
    <div className="relative flex-shrink-0" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label={`${libelle} : ${pct}%`}>
        <defs>
          <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={DG.blue} />
            <stop offset="100%" stopColor={DG.violetLight} />
          </linearGradient>
        </defs>
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(148,163,184,.16)" strokeWidth={epaisseur} />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={epaisseur}
          strokeDasharray={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        <span className="text-[20px] font-bold leading-none" style={{ color: DG.textPrimary }}>
          {pct}%
        </span>
        {sousLibelle && (
          <span className="text-[9.5px] leading-[1.2] mt-1" style={{ color: DG.textTertiary }}>
            {sousLibelle}
          </span>
        )}
      </div>
    </div>
  );
}

/** Petit anneau de complétude affiché dans le tableau. */
export function Anneau({ pct, accent, taille = 28 }: { pct: number; accent: Accent; taille?: number }) {
  const epaisseur = 3.5;
  const r = (taille - epaisseur) / 2;
  const { dash } = arc(pct, r);
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden className="flex-shrink-0">
      <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(148,163,184,.16)" strokeWidth={epaisseur} />
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={r}
        fill="none"
        stroke={ACCENTS[accent].color}
        strokeWidth={epaisseur}
        strokeDasharray={dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Contrôles
// ---------------------------------------------------------------------------

const BOUTON_BASE = `inline-flex items-center justify-center gap-2 font-semibold rounded-[9px] transition-[background-color,border-color,box-shadow,color] duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none ${FOCUS_RING}`;

export function BoutonDG({
  variante = "secondaire",
  className = "",
  children,
  ...rest
}: {
  variante?: "principal" | "secondaire" | "fantome" | "contour-violet";
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, React.CSSProperties> = {
    principal: { background: DG.violet, color: "#FFFFFF", boxShadow: "0 0 0 1px rgba(114,91,255,.22), 0 8px 20px rgba(76,48,220,.20)" },
    secondaire: { background: DG.surface2, color: DG.textSecondary, border: `1px solid ${DG.borderSoft}` },
    fantome: { background: "transparent", color: DG.textSecondary },
    "contour-violet": { background: "rgba(115, 93, 255, 0.08)", color: DG.violetLight, border: `1px solid ${ACCENTS.violet.ring}` },
  };
  return (
    <button
      {...rest}
      className={`${BOUTON_BASE} h-[42px] px-4 text-[13px] ${className}`}
      style={{ ...styles[variante], ...rest.style }}
    >
      {children}
    </button>
  );
}

/** Bouton d'action iconographique du tableau (toujours accompagné d'un libellé accessible). */
export function ActionIcone({
  label,
  accent = "neutral",
  children,
  ...rest
}: {
  label: string;
  accent?: Accent;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`w-[30px] h-[30px] inline-flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[rgba(255,255,255,.06)] ${FOCUS_RING}`}
      style={{ color: accent === "neutral" ? DG.textTertiary : ACCENTS[accent].color }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

export function LabelCarte({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: DG.textTertiary }}>
      {children}
    </span>
  );
}

/** Indicateur de tendance d'une carte KPI. */
export function Tendance({ valeur, accent = "neutral" }: { valeur: number; accent?: Accent }) {
  const hausse = valeur >= 0;
  const a = ACCENTS[valeur === 0 ? "neutral" : accent];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-full px-1.5 py-[2px]"
      style={{ background: a.soft, color: a.color }}
    >
      <span aria-hidden>{hausse ? "↗" : "↘"}</span>
      {Math.abs(valeur)}% vs 7j
    </span>
  );
}
