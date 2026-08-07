// Sparkline de tendance — SVG pur, aucune dépendance.
// Elle ne décore pas : elle n'est rendue que lorsque la série porte une
// information réelle (cf. serieExploitable). Les mois sans devis sont des trous
// dans la série, pas des zéros.

export function Sparkline({
  valeurs,
  couleur,
  label,
}: {
  valeurs: number[];
  couleur: string;
  label: string;
}) {
  if (valeurs.length < 2) return null;
  const W = 78;
  const H = 26;
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || 1;
  const pas = W / (valeurs.length - 1);
  const points = valeurs.map((v, i) => {
    const x = i * pas;
    const y = H - 2 - ((v - min) / amplitude) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const dernier = points[points.length - 1].split(",");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="flex-shrink-0 overflow-visible"
    >
      <polygon points={`0,${H} ${points.join(" ")} ${W},${H}`} fill={couleur} opacity={0.08} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={couleur}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={dernier[0]} cy={dernier[1]} r={2} fill={couleur} />
    </svg>
  );
}
