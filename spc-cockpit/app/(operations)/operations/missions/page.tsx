export const dynamic = "force-dynamic";

import {
  getMissions, getAffectations, getDevisList, getDevisSalles, getIncidents,
} from "@/lib/operations/queries";
import { construireVueMissions } from "@/lib/operations/missions-dashboard";
import { OPS_CONTENT_CLASS, PageHeader } from "@/components/ops/shell";
import { MissionsKpiGrid } from "@/components/ops/missions/MissionsKpiGrid";
import { ActiveMissionCard, AucuneMissionActive } from "@/components/ops/missions/ActiveMissionCard";
import { UpcomingMissionsCard } from "@/components/ops/missions/UpcomingMissionsCard";
import { MissionAlertsCard } from "@/components/ops/missions/MissionAlertsCard";
import { RevenueDistributionCard } from "@/components/ops/missions/RevenueDistributionCard";
import { MissionsTable } from "@/components/ops/missions/MissionsTable";
import { NouvelleMissionBouton } from "@/components/ops/missions/NouvelleMissionBouton";
import { CalendarCheck2 } from "lucide-react";
import { origineGlobale, premiereErreur } from "@/lib/operations/source";
import { BandeauSource } from "@/components/ops/EtatSource";

// Centre de pilotage des missions.
// La page ne calcule rien : elle charge les données du tenant puis délègue
// l'intégralité des chiffres à construireVueMissions (source unique), ce qui
// garantit la cohérence entre KPI, bandeau actif, alertes et tableau.

export default async function MissionsPage() {
  const [jMissions, jAffectations, jDevis, jDevisSalles, jIncidents] = await Promise.all([
    getMissions(),
    getAffectations(),
    getDevisList(),
    getDevisSalles(),
    getIncidents(),
  ]);
  const missions = jMissions.lignes;
  const affectations = jAffectations.lignes;
  const devis = jDevis.lignes;
  const devisSalles = jDevisSalles.lignes;
  const incidents = jIncidents.lignes;
  const origine = origineGlobale(jMissions, jAffectations, jDevis, jIncidents);

  const vue = construireVueMissions({ missions, affectations, devis, devisSalles, incidents });

  return (
    <div className={OPS_CONTENT_CLASS}>
      <PageHeader
        page="Missions"
        icon={<CalendarCheck2 className="w-[18px] h-[18px]" />}
        subtitle="Suivi des sessions d&apos;examens et de la mission active"
        actions={<NouvelleMissionBouton />}
      />

      <BandeauSource origine={origine} detail={premiereErreur(jMissions, jAffectations, jDevis, jIncidents)} />

      <MissionsKpiGrid stats={vue.stats} serie={vue.serie} />

      {vue.active ? (
        <ActiveMissionCard vue={vue.active} />
      ) : (
        <AucuneMissionActive prochaine={vue.prochaines[0] ?? null} />
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3.5 mb-5 items-start">
        <UpcomingMissionsCard missions={missions} todayISO={vue.todayISO} />
        <MissionAlertsCard alertes={vue.alertes} />
        <RevenueDistributionCard ca={vue.ca} />
      </div>

      <MissionsTable lignes={vue.lignes} missionActiveId={vue.active?.mission.id ?? null} />
    </div>
  );
}
