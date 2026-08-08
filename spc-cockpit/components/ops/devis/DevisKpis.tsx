// Bandeau KPI du cockpit commercial — 5 tuiles, direction Warm Light + Navy.
//
// Pourquoi une carte dédiée plutôt que `components/ops/Kpi.tsx` : la tuile
// Opérations est calée sur le thème clair-froid du module (classes Tailwind
// figées, pas de zone graphique, pas de comparatif). Le cockpit Devis a besoin
// des tokens warm, d'une sparkline et d'un comparatif période. Si la direction
// warm est généralisée au module, cette carte doit disparaître au profit d'une
// variante de `Kpi` — pas être dupliquée ailleurs.

import { Euro, FileText, ShoppingBag } from "lucide-react";
import { euro, euroEntier } from "@/lib/operations/format";
import { serieExploitable, type KpisDevis } from "@/lib/operations/devis-cockpit";
import { Sparkline } from "./Sparkline";

const CARTE =
  "rounded-[15px] border border-[var(--border-soft)] bg-[var(--surface-card)] px-[19px] py-[17px] min-h-[122px] flex flex-col";

function Tuile({
  label,
  valeur,
  sub,
  pied,
  icone,
  couleurIcone,
  fondIcone,
  graphe,
  secondaire,
}: {
  label: string;
  valeur: string;
  sub: string;
  pied?: React.ReactNode;
  icone?: React.ReactNode;
  couleurIcone?: string;
  fondIcone?: string;
  graphe?: React.ReactNode;
  /** Masquée sur mobile : l'écran ne garde que les KPI de décision. */
  secondaire?: boolean;
}) {
  return (
    <article className={`${CARTE} ${secondaire ? "hidden sm:flex" : ""}`} style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.9px] text-[var(--ink-secondary)] leading-tight">
          {label}
        </h3>
        {icone && (
          <span
            aria-hidden
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: fondIcone, color: couleurIcone }}
          >
            {icone}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[20px] sm:text-[27px] leading-none font-bold tracking-[-0.5px] text-[var(--ink-primary)] tabular-nums truncate">
            {valeur}
          </div>
          <div className="text-[12px] text-[var(--ink-muted)] mt-1.5">{sub}</div>
        </div>
        {graphe}
      </div>
      {pied && <div className="text-[12px] mt-auto pt-2">{pied}</div>}
    </article>
  );
}

/** Comparatif signé — muet (et non inventé) quand il n'y a rien à comparer. */
function Delta({ valeur, texte, replis }: { valeur: number | null; texte: string; replis: string }) {
  if (valeur === null) return <span className="text-[var(--ink-muted)]">{replis}</span>;
  const positif = valeur > 0;
  const stable = valeur === 0;
  const couleur = stable ? "var(--ink-muted)" : positif ? "var(--metier-green)" : "var(--metier-red)";
  return (
    <span style={{ color: couleur }} className="font-semibold inline-flex items-center gap-1">
      <span aria-hidden>{stable ? "→" : positif ? "↗" : "↘"}</span>
      {texte}
    </span>
  );
}

export function DevisKpis({ kpis }: { kpis: KpisDevis }) {
  const tauxPct = Math.round(kpis.tauxTransformation * 100);
  const tauxPrecedent =
    kpis.tauxTransformationMoisDernier === null ? null : Math.round(kpis.tauxTransformationMoisDernier * 100);

  const serieCa = kpis.serieCaPotentiel.filter((p) => !p.vide).map((p) => p.valeur);
  const serieTaux = kpis.serieTaux.filter((p) => !p.vide).map((p) => p.valeur);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-4">
      <Tuile
        label="Total devis"
        valeur={String(kpis.total)}
        sub="créés"
        icone={<FileText className="w-4 h-4" />}
        couleurIcone="var(--accent)"
        fondIcone="var(--accent-soft)"
        pied={
          <Delta
            valeur={kpis.variationCreations}
            texte={`${kpis.variationCreations !== null && kpis.variationCreations > 0 ? "+" : ""}${kpis.variationCreations} ce mois`}
            replis={`${kpis.creesCeMois} ce mois`}
          />
        }
      />

      <Tuile
        label="CA potentiel HT"
        valeur={euro(kpis.caPotentielHT)}
        sub={`sur ${kpis.nbEnvoyes} devis envoyé${kpis.nbEnvoyes > 1 ? "s" : ""}`}
        graphe={
          serieExploitable(kpis.serieCaPotentiel) ? (
            <Sparkline valeurs={serieCa} couleur="var(--accent)" label="Évolution du CA potentiel sur 6 mois" />
          ) : undefined
        }
      />

      <Tuile
        secondaire
        label="Taux de transformation"
        valeur={`${tauxPct} %`}
        sub="devis gagnés / total"
        graphe={
          serieExploitable(kpis.serieTaux) ? (
            <Sparkline
              valeurs={serieTaux}
              couleur="var(--metier-green)"
              label="Évolution du taux de transformation sur 6 mois"
            />
          ) : undefined
        }
        pied={
          <Delta
            valeur={tauxPrecedent === null ? null : tauxPct - tauxPrecedent}
            texte={`vs ${tauxPrecedent} % mois dernier`}
            replis="aucun devis le mois dernier"
          />
        }
      />

      <Tuile
        label="CA accepté HT"
        valeur={euro(kpis.caAccepteHT)}
        sub={`${kpis.nbConfirmes} mission${kpis.nbConfirmes > 1 ? "s" : ""} confirmée${kpis.nbConfirmes > 1 ? "s" : ""}`}
        icone={<Euro className="w-4 h-4" />}
        couleurIcone="var(--metier-green)"
        fondIcone="var(--metier-green-soft)"
      />

      <Tuile
        secondaire
        label="Panier moyen HT"
        valeur={euroEntier(kpis.panierMoyenHT)}
        sub={`sur ${kpis.total} devis`}
        icone={<ShoppingBag className="w-4 h-4" />}
        couleurIcone="var(--metier-cyan)"
        fondIcone="var(--metier-cyan-soft)"
        pied={
          <Delta
            valeur={
              kpis.panierMoyenMoisDernier === null
                ? null
                : Math.round(kpis.panierMoyenHT - kpis.panierMoyenMoisDernier)
            }
            texte={`vs ${euroEntier(kpis.panierMoyenMoisDernier ?? 0)} mois dernier`}
            replis="aucun devis le mois dernier"
          />
        }
      />
    </div>
  );
}
