export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations, getJournal } from "@/lib/operations/queries";
import { getRefusEnAttente } from "@/lib/supabase/portail";
import { PlanificationBoard } from "@/components/ops/PlanificationBoard";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PageHeader } from "@/components/ops/shell";

export default async function PlanificationPage() {
  const [missions, surveillants, affectations, journal, refus] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(), getJournal(), getRefusEnAttente(),
  ]);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <PageHeader page="Planification" subtitle="Sessions d&apos;examens · affectation des salles et créneaux, suivi des heures" />
      {/* Les refus surveillants sont désormais consolidés dans le Centre d'alertes
          du board (taxonomie unique Bloquant / À surveiller / Information). */}
      <PlanificationBoard missions={missions} surveillants={surveillants} affectations={affectations} journal={journal} refus={refus} />
    </div>
  );
}
