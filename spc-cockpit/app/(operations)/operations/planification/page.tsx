export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations, getJournal } from "@/lib/operations/queries";
import { getRefusEnAttente } from "@/lib/supabase/portail";
import { getSallesACouvrirParMission } from "@/lib/operations/planning-salles";
import { PlanificationBoard } from "@/components/ops/PlanificationBoard";
import { AlertBanner, type AlertItem } from "@/components/ops/AlertBanner";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PageHeader } from "@/components/ops/shell";

export default async function PlanificationPage() {
  const [missions, surveillants, affectations, journal, refus, sallesParMission] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(), getJournal(), getRefusEnAttente(), getSallesACouvrirParMission(),
  ]);

  // C1 — refus surveillants → alertes BLOCANT (taxonomie unifiée).
  const alertes: AlertItem[] = refus.map((r) => ({
    id: `refus-${r.affectationId}`,
    level: "BLOCANT",
    title: `Refus surveillant — ${r.surveillantNom}`,
    description: [r.missionRef, r.salle && `Salle ${r.salle}`, r.motif ? `« ${r.motif} »` : "sans motif"].filter(Boolean).join(" · "),
    ctaLabel: "Traiter",
    ctaHref: "#session-table",
  }));

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <PageHeader page="Planification" subtitle="Sessions d&apos;examens · affectation des salles et créneaux, suivi des heures" />
      <AlertBanner alerts={alertes} />
      <PlanificationBoard missions={missions} surveillants={surveillants} affectations={affectations} journal={journal} sallesParMission={sallesParMission} />
    </div>
  );
}
