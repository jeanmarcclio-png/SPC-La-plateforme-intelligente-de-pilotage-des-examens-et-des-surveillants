export const dynamic = "force-dynamic";

import { getDevisList, getDevisSalles, getDevisEquipe, getFactures, getSurveillants } from "@/lib/operations/queries";
import {
  construireCockpitDevis,
  filtrerParPeriode,
  libellePeriode,
  periodeValide,
} from "@/lib/operations/devis-cockpit";
import { OPS_CONTENT_CLASS } from "@/components/ops/shell";
import { DevisCockpit } from "@/components/ops/devis/DevisCockpit";

// Cockpit commercial des devis — direction « Warm Light + Navy ».
// La page ne fait que charger et calculer : tous les chiffres viennent du
// view-model pur `construireCockpitDevis`, jamais du composant d'affichage.
// Le workspace ivoire est porté par la classe `.cockpit-warm` (app/globals.css),
// scopée à cet écran tant que la direction n'est pas généralisée au module.

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const [{ periode: periodeParam }, devisTous, devisSalles, equipe, factures, surveillants] = await Promise.all([
    searchParams,
    getDevisList(),
    getDevisSalles(),
    getDevisEquipe(),
    getFactures(),
    getSurveillants(),
  ]);

  const aujourdhui = new Date();
  const periode = periodeValide(periodeParam);
  const devis = filtrerParPeriode(devisTous, periode, aujourdhui);
  const vue = construireCockpitDevis({ devis, equipe, factures, surveillants, aujourdhui });

  return (
    <div className="cockpit-warm min-h-full bg-[var(--surface-app)]">
      <div className={OPS_CONTENT_CLASS}>
        <DevisCockpit
          vue={vue}
          devis={devis}
          devisSalles={devisSalles}
          periode={periode}
          libelle={libellePeriode(periode, aujourdhui)}
          aujourdhui={aujourdhui.toISOString()}
        />
      </div>
    </div>
  );
}
