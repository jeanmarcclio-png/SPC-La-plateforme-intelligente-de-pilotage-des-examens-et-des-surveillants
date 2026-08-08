"use client";

// Pipeline commercial — visualisation horizontale compacte des 5 étapes.
// Chaque segment est un FILTRE : cliquer « En attente » ne raconte pas une
// histoire, il restreint le tableau aux devis concernés.

import { ArrowRight } from "lucide-react";
import { euro, euroEntier } from "@/lib/operations/format";
import type { EtapePipeline, EtapePipelineVue, FiltreRapide } from "@/lib/operations/devis-cockpit";

const COULEUR: Record<EtapePipeline, string> = {
  brouillon: "var(--metier-neutral)",
  envoye: "var(--metier-blue)",
  attente: "var(--metier-amber)",
  accepte: "var(--metier-green)",
  facture: "var(--accent)",
};

export function DevisPipeline({
  pipeline,
  filtre,
  onFiltrer,
}: {
  pipeline: EtapePipelineVue[];
  filtre: FiltreRapide | null;
  onFiltrer: (f: FiltreRapide | null) => void;
}) {
  const actif = filtre?.type === "etape" ? filtre.valeur : null;

  return (
    <section
      className="rounded-[15px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-[19px] flex flex-col"
      style={{ boxShadow: "var(--shadow-card)" }}
      aria-labelledby="titre-pipeline-libelle"
    >
      <h2
        id="titre-pipeline-libelle"
        className="text-[11px] font-bold uppercase tracking-[0.9px] text-[var(--ink-secondary)] mb-4"
      >
        Pipeline commercial
      </h2>

      {/* Sur petit écran la ligne défile plutôt que d'écraser les 5 étapes. */}
      <div className="overflow-x-auto">
        <ul className="grid grid-cols-5 gap-1.5 min-w-[340px]">
        {pipeline.map((e) => {
          const estActif = actif === e.cle;
          return (
            <li key={e.cle} className="min-w-0">
              <button
                type="button"
                onClick={() => onFiltrer(estActif ? null : { type: "etape", valeur: e.cle })}
                aria-pressed={estActif}
                className="w-full min-w-0 text-left rounded-[10px] px-1.5 pt-2 pb-2 transition-colors hover:bg-[var(--surface-subtle)]"
                style={estActif ? { background: "var(--surface-subtle)" } : undefined}
                title={`Filtrer sur « ${e.libelle} » — ${e.nb} devis · ${euro(e.montantHT)}`}
              >
                <span className="flex items-center gap-1.5 mb-2.5" aria-hidden>
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: COULEUR[e.cle] }} />
                  <span className="h-[2px] flex-1 rounded-full" style={{ background: COULEUR[e.cle], opacity: e.nb ? 1 : 0.3 }} />
                </span>
                <span className="block text-[11.5px] font-semibold truncate" style={{ color: COULEUR[e.cle] }}>
                  {e.libelle}
                </span>
                <span className="block text-[21px] font-bold leading-tight text-[var(--ink-primary)] tabular-nums">
                  {e.nb}
                </span>
                <span className="block text-[11.5px] text-[var(--ink-muted)] tabular-nums truncate">
                  {euroEntier(e.montantHT)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </div>

      <div className="mt-auto pt-3.5 border-t border-[var(--border-soft)]">
        <button
          type="button"
          onClick={() => onFiltrer(null)}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] rounded"
        >
          Voir le détail du pipeline
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
