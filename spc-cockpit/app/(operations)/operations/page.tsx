export const dynamic = "force-dynamic";

import { getSurveillants, getMissions, getDevisList, getIncidents, getAffectations, getDevisEquipe } from "@/lib/operations/queries";
import { buildDashboardData } from "@/lib/operations/dashboard";
import { euro, pctFR } from "@/lib/operations/format";
import { Receipt, Coins, Users, CalendarClock } from "lucide-react";
import { CockpitSubtitle, RefreshButton } from "@/components/ops/CockpitRefresh";

import { KpiProCard } from "@/components/ops/dashboard/KpiProCard";
import { Sparkline, MiniHistogram, ProgressBar } from "@/components/ops/dashboard/charts";
import { CoverageCard } from "@/components/ops/dashboard/CoverageCard";
import { RisksCard } from "@/components/ops/dashboard/RisksCard";
import { ImmediateActionsCard } from "@/components/ops/dashboard/ImmediateActionsCard";
import { SessionsCard } from "@/components/ops/dashboard/SessionsCard";
import { WorkloadCard } from "@/components/ops/dashboard/WorkloadCard";
import { CalendarCard } from "@/components/ops/dashboard/CalendarCard";
import { FinancialCard } from "@/components/ops/dashboard/FinancialCard";
import { QuotesCard } from "@/components/ops/dashboard/QuotesCard";
import { origineGlobale, premiereErreur } from "@/lib/operations/source";
import { BandeauSource } from "@/components/ops/EtatSource";

export default async function DashboardPage() {
  const [jSurv, jMissions, jDevis, jIncidents, jAff, jEquipe] = await Promise.all([
    getSurveillants(), getMissions(), getDevisList(), getIncidents(), getAffectations(), getDevisEquipe(),
  ]);
  const surveillants = jSurv.lignes;
  const missions = jMissions.lignes;
  const devis = jDevis.lignes;
  const incidents = jIncidents.lignes;
  const affectations = jAff.lignes;
  const devisEquipe = jEquipe.lignes;
  const origine = origineGlobale(jSurv, jMissions, jDevis, jIncidents, jAff);
  const detailErreur = premiereErreur(jSurv, jMissions, jDevis, jIncidents, jAff, jEquipe);

  const data = buildDashboardData({ missions, surveillants, affectations, devis, incidents, devisEquipe });
  const { financials: fin, coverage, upcoming } = data;

  const caPoints = fin.evolutionMensuelle.map((e) => e.total);
  const margePoints = fin.evolutionMensuelle.map((e) => e.total * fin.tauxMarge);
  const couvColor = coverage.taux >= 0.85 ? "#10B981" : coverage.taux >= 0.7 ? "#F59E0B" : "#EF4444";
  const couvTone = coverage.taux >= 0.85 ? "emerald" : coverage.taux >= 0.7 ? "amber" : "red";

  return (
    <div className="min-h-full bg-[#F6F8FC]">
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-5 pb-16">
        <BandeauSource origine={origine} detail={detailErreur} />
        {/* En-tête compact */}
        <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] md:text-[22px] font-extrabold text-slate-900 tracking-tight">Tableau de bord</h1>
            <CockpitSubtitle />
          </div>
          <RefreshButton />
        </div>

        {/* ── Ligne 1 — KPI de synthèse ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          {/* BUG-007 : ce montant est un STOCK — le portefeuille de devis
              acceptés, sans notion de mois. Le delta « −56,2 % vs mois
              précédent » qui l'accompagnait venait d'une AUTRE série (le CA
              réalisé des missions) et faisait lire « notre CA confirmé chute de
              56 % », affirmation que la donnée ne porte pas. La variation
              mensuelle est désormais rendue par la carte « Performance
              financière », sur la série qu'elle mesure réellement. */}
          <KpiProCard
            label="CA confirmé HT"
            value={euro(fin.caConfirmeHT)}
            sub={`${fin.nbDevisConfirmes} devis accepté${fin.nbDevisConfirmes > 1 ? "s" : ""} · portefeuille total — courbe : CA réalisé par mois`}
            tone="emerald"
            icon={<Receipt className="w-[18px] h-[18px]" />}
            href="/operations/devis"
            viz={<Sparkline points={caPoints} color="#10B981" className="w-full h-full" ariaLabel="CA réalisé par mois" />}
          />
          <KpiProCard
            label="Marge HT — portefeuille"
            value={euro(fin.margeHT)}
            delta={{ text: pctFR(fin.tauxMarge), direction: "flat" }}
            sub="Sur devis acceptés"
            tone="violet"
            icon={<Coins className="w-[18px] h-[18px]" />}
            href="/operations/facturation"
            viz={<Sparkline points={margePoints} color="#7C3AED" className="w-full h-full" ariaLabel="Évolution de la marge" />}
          />
          <KpiProCard
            label="Couverture surveillants"
            value={pctFR(coverage.taux)}
            sub={`${coverage.pourvus} sur ${coverage.requis} postes pourvus`}
            tone={couvTone}
            icon={<Users className="w-[18px] h-[18px]" />}
            href="/operations/planification"
            viz={<div className="flex h-full items-center"><ProgressBar value={coverage.taux} color={couvColor} className="w-full" /></div>}
          />
          <KpiProCard
            label="Missions à venir"
            value={String(upcoming.count)}
            sub="Sur les 30 prochains jours"
            tone="blue"
            icon={<CalendarClock className="w-[18px] h-[18px]" />}
            href="/operations/missions"
            viz={<MiniHistogram values={upcoming.histogram} color="#2563EB" className="w-full h-full" ariaLabel="Missions par période" />}
          />
        </div>

        {/* ── Ligne 2 — Couverture · Risques · Actions ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-5"><CoverageCard coverage={coverage} /></div>
          <div className="lg:col-span-4"><RisksCard risks={data.risks} /></div>
          <div className="lg:col-span-3"><ImmediateActionsCard actions={data.actions} /></div>
        </div>

        {/* ── Ligne 3 — Sessions · Charge · Calendrier ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-5"><SessionsCard sessions={data.sessions} /></div>
          <div className="lg:col-span-4"><WorkloadCard rows={data.workload} /></div>
          <div className="lg:col-span-3"><CalendarCard days={data.calendar} /></div>
        </div>

        {/* ── Ligne 4 — Finance · Devis ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8"><FinancialCard financials={fin} /></div>
          <div className="lg:col-span-4"><QuotesCard quotes={data.quotes} /></div>
        </div>
      </div>
    </div>
  );
}
