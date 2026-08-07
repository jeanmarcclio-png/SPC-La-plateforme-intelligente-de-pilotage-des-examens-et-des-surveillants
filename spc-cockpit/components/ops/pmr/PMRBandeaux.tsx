import Link from "next/link";
import { Accessibility, AlertTriangle, ArrowRight, CheckCircle2, Clock, DoorOpen, ShieldCheck, Target, UserPlus } from "lucide-react";
import type { ActionImmediate, VuePMR } from "@/lib/operations/pmr-vue";
import { OBJECTIF_COUVERTURE } from "@/lib/operations/pmr-vue";
import { PMR, OMBRE_CLAIRE } from "./tokens";

// Les DEUX seules surfaces claires de la page (prompt §2) : la bande KPI et les
// cartes « Actions immédiates ». Tout le reste — tableau, cartographie,
// couverture — reste en dark navy. Cette opposition porte la hiérarchie :
// le clair attire l'œil sur l'état global et les décisions urgentes.

// ---------------------------------------------------------------------------
// Bande KPI claire (§8)
// ---------------------------------------------------------------------------

function Kpi({
  icone, teinte, valeur, libelle, sous, barre,
}: {
  icone: React.ReactNode; teinte: string; valeur: string; libelle: string; sous: string; barre?: number;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 flex-1 min-w-[190px]">
      <span
        aria-hidden
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${teinte}1A`, color: teinte }}
      >
        {icone}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[26px] font-bold leading-none" style={{ color: PMR.texteClairPrimaire }}>{valeur}</span>
          <span className="text-[13px] font-semibold" style={{ color: PMR.texteClairPrimaire }}>{libelle}</span>
        </p>
        <p className="text-[11.5px] mt-1" style={{ color: PMR.texteClairSecondaire }}>{sous}</p>
        {typeof barre === "number" && (
          <span aria-hidden className="mt-1.5 block h-1.5 w-full max-w-[120px] rounded-full overflow-hidden" style={{ background: "#E7ECF2" }}>
            <span className="block h-full rounded-full bar-fill" style={{ width: `${Math.min(100, barre * 100)}%`, background: PMR.orange }} />
          </span>
        )}
      </div>
    </div>
  );
}

export function PMRKpiBand({ vue }: { vue: VuePMR }) {
  const couverturePct = Math.round(vue.couverture * 100);

  return (
    <section
      aria-label="Indicateurs des aménagements"
      className="rounded-[14px] flex items-stretch flex-wrap divide-x mb-6"
      style={{ background: PMR.surfaceClaire, boxShadow: OMBRE_CLAIRE, borderColor: PMR.bordureClaire }}
    >
      <Kpi
        icone={<Accessibility className="w-5 h-5" />} teinte={PMR.violet}
        valeur={String(vue.nbAmenagements)} libelle="étudiants aménagés"
        sous={vue.mission ? `session ${vue.mission.client}` : "toutes sessions"}
      />
      <Kpi
        icone={<DoorOpen className="w-5 h-5" />} teinte={PMR.turquoise}
        valeur={String(vue.nbSallesDediees)} libelle="salles dédiées"
        sous={`dont ${vue.nbSallesActives} active${vue.nbSallesActives > 1 ? "s" : ""}`}
      />
      <Kpi
        icone={<Clock className="w-5 h-5" />} teinte={PMR.cyan}
        valeur={String(vue.nbTiersTemps)} libelle="tiers-temps"
        sous={vue.dureeMoyenneLabel === "—" ? "durée non planifiée" : `durée moyenne ${vue.dureeMoyenneLabel}`}
      />
      <Kpi
        icone={<AlertTriangle className="w-5 h-5" />} teinte={PMR.critique}
        valeur={String(vue.nbActionsRequises)} libelle="actions requises"
        sous={vue.nbActionsRequises > 0 ? "à traiter maintenant" : "aucun écart détecté"}
      />
      <Kpi
        icone={<Target className="w-5 h-5" />} teinte={PMR.orange}
        valeur={`${couverturePct} %`} libelle="couverture"
        sous={`objectif ≥ ${Math.round(OBJECTIF_COUVERTURE * 100)} %`}
        barre={vue.couverture}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Actions immédiates (§9)
// ---------------------------------------------------------------------------

const TON_ACTION = {
  critique: { teinte: PMR.critique, pastille: "Priorité haute", fondPastille: "#FEE4E2", textePastille: "#B42318", icone: UserPlus },
  moyenne: { teinte: PMR.alerte, pastille: "Priorité moyenne", fondPastille: "#FEF0C7", textePastille: "#B54708", icone: AlertTriangle },
  surveiller: { teinte: PMR.orange, pastille: "À surveiller", fondPastille: "#FFEAD5", textePastille: "#B93815", icone: AlertTriangle },
} as const;

function CarteAction({ action }: { action: ActionImmediate }) {
  const t = TON_ACTION[action.niveau];
  const Icone = t.icone;
  return (
    <article
      className="rounded-[14px] p-4 flex flex-col"
      style={{ background: PMR.surfaceClaire, boxShadow: OMBRE_CLAIRE }}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.teinte}1A`, color: t.teinte }}>
          <Icone className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-bold" style={{ color: PMR.texteClairPrimaire }}>{action.titre}</h3>
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: PMR.texteClairSecondaire }}>{action.detail}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3.5">
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: t.fondPastille, color: t.textePastille }}>
          {t.pastille}
        </span>
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-[9px] text-[12.5px] font-semibold transition-colors"
          style={{ border: `1px solid ${PMR.bordureClaire}`, color: PMR.texteClairPrimaire }}
        >
          {action.ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function PMRActionsImmediates({ actions }: { actions: ActionImmediate[] }) {
  return (
    <section aria-labelledby="titre-actions" className="mb-6">
      <div className="flex items-center gap-2.5 mb-3">
        <h2 id="titre-actions" className="text-[17px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>
          Actions immédiates
        </h2>
        {actions.length > 0 && (
          <span
            className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center"
            style={{ background: PMR.critique, color: "#FFFFFF" }}
          >
            {actions.length}
            <span className="sr-only"> action(s) à traiter</span>
          </span>
        )}
      </div>

      {actions.length === 0 ? (
        <div
          className="rounded-[14px] px-5 py-4 flex items-center gap-3"
          style={{ background: PMR.fondPanneau, border: `1px solid ${PMR.bordureSombre}` }}
        >
          <span aria-hidden className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${PMR.succes}1A`, color: PMR.succes }}>
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold" style={{ color: PMR.texteSombrePrimaire }}>
              Aucune action requise
            </p>
            <p className="text-[12px]" style={{ color: PMR.texteSombreSecondaire }}>
              Tous les aménagements sont conformes : surveillant dédié affecté et salle adaptée validée.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-3 sm:grid-cols-2">
          {actions.map((a) => <CarteAction key={a.id} action={a} />)}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cartographie des salles (§12) — panneau dark
// ---------------------------------------------------------------------------

function BadgeSalle({ children, teinte }: { children: React.ReactNode; teinte: string }) {
  return (
    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${teinte}26`, color: teinte }}>
      {children}
    </span>
  );
}

export function PMRCartographie({ vue }: { vue: VuePMR }) {
  return (
    <section
      aria-labelledby="titre-cartographie"
      className="rounded-[12px] overflow-hidden"
      style={{ background: PMR.fondPanneau, border: `1px solid ${PMR.bordureSombre}` }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${PMR.bordureSombre}` }}>
        <h2 id="titre-cartographie" className="text-[15px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>
          Cartographie des salles
        </h2>
        <Link href="/operations/salles" className="text-[12px] font-semibold transition-colors" style={{ color: PMR.cyan }}>
          Voir tout
        </Link>
      </div>

      {vue.salles.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px]" style={{ color: PMR.texteSombreSecondaire }}>
          Aucune salle marquée PMR ou tiers-temps — configurez-les dans la page Salles.
        </p>
      ) : (
        <ul>
          {vue.salles.map((s) => {
            const pct = Math.round(s.occupation * 100);
            return (
              <li key={s.id} style={{ borderTop: `1px solid ${PMR.bordureSombre}` }} className="first:border-t-0">
                <Link
                  href="/operations/salles"
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#102F4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/50"
                >
                  <span aria-hidden className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${PMR.turquoise}1F`, color: PMR.turquoise }}>
                    <DoorOpen className="w-4 h-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>{s.nom}</span>
                      {s.tiersTemps && <BadgeSalle teinte={PMR.cyan}>Tiers-temps</BadgeSalle>}
                      {s.pmr && <BadgeSalle teinte={PMR.violet}>PMR</BadgeSalle>}
                    </div>
                    <p className="text-[11.5px] mt-1" style={{ color: PMR.texteSombreSecondaire }}>
                      Surveillant : {s.surveillant ?? "—"}
                    </p>
                    <p className="text-[11.5px]" style={{ color: PMR.texteSombreTertiaire }}>
                      Capacité : {s.capacite}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>
                      {s.etudiants} / {s.capacite}
                    </p>
                    <p className="text-[11px]" style={{ color: PMR.texteSombreTertiaire }}>étudiants</p>
                    <p className="text-[11.5px] mt-1" style={{ color: PMR.texteSombreSecondaire }}>{pct} % occupation</p>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold mt-1" style={{ color: s.enCours ? PMR.orange : PMR.succes }}>
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: s.enCours ? PMR.orange : PMR.succes }} />
                      {s.enCours ? "En cours" : "Disponible"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Répartition & couverture (§13) — panneau dark
// ---------------------------------------------------------------------------

function Metrique({ label, faits, total, taux, teinte }: { label: string; faits: number; total: number; taux: number; teinte: string }) {
  return (
    <div className="min-w-[92px] flex-1">
      <p className="text-[11.5px]" style={{ color: PMR.texteSombreSecondaire }}>{label}</p>
      <p className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-[15px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>{faits} / {total}</span>
        <span className="text-[12px] font-semibold" style={{ color: PMR.texteSombreSecondaire }}>{Math.round(taux * 100)} %</span>
      </p>
      <span aria-hidden className="mt-1.5 block h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
        <span className="block h-full rounded-full bar-fill" style={{ width: `${Math.min(100, taux * 100)}%`, background: teinte }} />
      </span>
    </div>
  );
}

export function PMRCouverture({ vue }: { vue: VuePMR }) {
  const pct = Math.round(vue.couverture * 100);
  const R = 26;
  const C = 2 * Math.PI * R;
  const atteint = vue.couverture >= OBJECTIF_COUVERTURE;

  return (
    <section
      aria-labelledby="titre-couverture"
      className="rounded-[12px] p-4"
      style={{ background: PMR.fondPanneau, border: `1px solid ${PMR.bordureSombre}` }}
    >
      <h2 id="titre-couverture" className="text-[15px] font-bold mb-3.5" style={{ color: PMR.texteSombrePrimaire }}>
        Répartition &amp; couverture
      </h2>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex gap-4 flex-1 flex-wrap min-w-[220px]">
          <Metrique label="PMR" faits={vue.repartition.pmr.faits} total={vue.repartition.pmr.total} taux={vue.repartition.pmr.taux} teinte={PMR.orange} />
          <Metrique label="Tiers-temps" faits={vue.repartition.tiersTemps.faits} total={vue.repartition.tiersTemps.total} taux={vue.repartition.tiersTemps.taux} teinte={PMR.cyan} />
          <Metrique label="Salles dédiées" faits={vue.repartition.sallesDediees.faits} total={vue.repartition.sallesDediees.total} taux={vue.repartition.sallesDediees.taux} teinte={PMR.turquoise} />
        </div>

        <div className="text-center flex-shrink-0">
          <p className="text-[11.5px] mb-1" style={{ color: PMR.texteSombreSecondaire }}>Couverture globale</p>
          <div className="relative w-[62px] h-[62px] mx-auto">
            <svg width="62" height="62" viewBox="0 0 62 62" aria-hidden className="-rotate-90">
              <circle cx="31" cy="31" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="6" />
              <circle
                cx="31" cy="31" r={R} fill="none"
                stroke={atteint ? PMR.succes : PMR.orange}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, vue.couverture))}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>
              {pct} %
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3.5 pt-3.5 flex-wrap" style={{ borderTop: `1px solid ${PMR.bordureSombre}` }}>
        <p className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: atteint ? PMR.succes : PMR.texteSombreSecondaire }}>
          {atteint
            ? <><CheckCircle2 className="w-3.5 h-3.5" aria-hidden />Objectif atteint (≥ {Math.round(OBJECTIF_COUVERTURE * 100)} %)</>
            : <><Target className="w-3.5 h-3.5" aria-hidden />Objectif recommandé : ≥ {Math.round(OBJECTIF_COUVERTURE * 100)} %</>}
        </p>
        <Link
          href="/operations/salles"
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-[9px] text-[12px] font-semibold transition-colors"
          style={{ border: `1px solid ${PMR.bordureSombre}`, color: PMR.texteSombrePrimaire }}
        >
          Voir le détail
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
