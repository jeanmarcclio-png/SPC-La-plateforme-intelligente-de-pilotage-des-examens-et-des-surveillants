import { CalendarDays, Activity, CheckCircle2, Euro } from "lucide-react";
import type { SerieMensuelle, StatsMissions } from "@/lib/operations/missions-dashboard";
import { euro, pourcentSigne } from "@/lib/operations/format";
import { Sparkline } from "./Charts";

// Quatre cartes KPI de largeur égale (§10). Aucun chiffre n'est calculé ici :
// tout provient de statsMissions / serieMensuelle. La variation N-1 n'est
// affichée que si l'année précédente contient des données réelles.

interface CarteKpi {
  label: string;
  valeur: string;
  sous: string;
  icone: React.ReactNode;
  couleur: string;
  fond: string;
  serie: number[];
  serieLabels: string[];
  serieLegende: string;
  variation: number | null;
  format: (n: number) => string;
  variant: "line" | "bars";
}

function EquivalentTextuel({ legende, labels, valeurs, format }: { legende: string; labels: string[]; valeurs: number[]; format: (n: number) => string }) {
  return (
    <span className="sr-only">
      {legende} : {labels.map((l, i) => `${l} : ${format(valeurs[i])}`).join(", ")}.
    </span>
  );
}

function Carte({ carte }: { carte: CarteKpi }) {
  const positif = (carte.variation ?? 0) >= 0;
  return (
    <article className="bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] px-4 py-4 flex items-center gap-3.5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,34,68,0.10)]">
      <span
        aria-hidden
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: carte.fond, color: carte.couleur }}
      >
        {carte.icone}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.9px] text-[#8D97AA]">{carte.label}</h3>
        <p className="text-[23px] font-extrabold text-[#11182D] leading-none mt-1.5 truncate">{carte.valeur}</p>
        <p className="text-[11.5px] text-[#8D97AA] mt-1.5">{carte.sous}</p>
      </div>

      <div className="w-[86px] flex-shrink-0 hidden sm:block">
        <Sparkline values={carte.serie} color={carte.couleur} variant={carte.variant} />
        <EquivalentTextuel legende={carte.serieLegende} labels={carte.serieLabels} valeurs={carte.serie} format={carte.format} />
        {carte.variation !== null && (
          <p className={`text-[10.5px] font-bold text-right mt-1 ${positif ? "text-[#13B979]" : "text-[#FF3E4D]"}`}>
            {pourcentSigne(carte.variation)} <span className="text-[#8D97AA] font-semibold">vs N-1</span>
          </p>
        )}
      </div>
    </article>
  );
}

export function MissionsKpiGrid({ stats, serie }: { stats: StatsMissions; serie: SerieMensuelle }) {
  const entier = (n: number) => String(n);

  const cartes: CarteKpi[] = [
    {
      label: "Total missions",
      valeur: String(stats.total),
      sous: "toutes périodes",
      icone: <CalendarDays className="w-[18px] h-[18px]" />,
      couleur: "#4F46F5",
      fond: "#ECEBFF",
      serie: serie.total,
      serieLabels: serie.labels,
      serieLegende: "Missions par mois",
      variation: stats.variation.total,
      format: entier,
      variant: "bars",
    },
    {
      label: "En cours",
      valeur: String(stats.enCours),
      sous: "planifiée(s) ou active(s)",
      icone: <Activity className="w-[18px] h-[18px]" />,
      couleur: "#168AF5",
      fond: "#EAF4FF",
      serie: serie.enCours,
      serieLabels: serie.labels,
      serieLegende: "Missions engagées par mois",
      variation: stats.variation.enCours,
      format: entier,
      variant: "line",
    },
    {
      label: "Terminées",
      valeur: String(stats.terminees),
      sous: "sessions clôturées",
      icone: <CheckCircle2 className="w-[18px] h-[18px]" />,
      couleur: "#13B979",
      fond: "#E7F8F1",
      serie: serie.terminees,
      serieLabels: serie.labels,
      serieLegende: "Sessions clôturées par mois",
      variation: stats.variation.terminees,
      format: entier,
      variant: "line",
    },
    {
      label: "CA total (HT)",
      valeur: euro(stats.caHT),
      sous: "montants cumulés",
      icone: <Euro className="w-[18px] h-[18px]" />,
      couleur: "#FF842B",
      fond: "#FFF1E5",
      serie: serie.caHT,
      serieLabels: serie.labels,
      serieLegende: "Chiffre d'affaires HT par mois",
      variation: stats.variation.caHT,
      format: euro,
      variant: "bars",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
      {cartes.map((c) => (
        <Carte key={c.label} carte={c} />
      ))}
    </div>
  );
}
