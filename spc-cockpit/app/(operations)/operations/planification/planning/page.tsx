export const dynamic = "force-dynamic";

import { chargerContexteSession } from "@/lib/operations/planification-chargement";
import { OPS_CONTENT_CLASS, PageHeader } from "@/components/ops/shell";
import { PlanningWorkspace } from "@/components/ops/planification/PlanningWorkspace";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { CalendarRange } from "lucide-react";

// PAGE 2 — PLANIFIER. Cœur opérationnel : affectations, créneaux et chronologie.

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const { vue, disponibles } = await chargerContexteSession(session);

  return (
    <div className={OPS_CONTENT_CLASS} id="zone-planning">
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <PageHeader
        page="Planification"
        title="Affectations & planning"
        icon={<CalendarRange className="w-[18px] h-[18px]" />}
        subtitle="Affecter les salles et les créneaux, contrôler la charge en temps réel"
      />
      {vue ? (
        <PlanningWorkspace vue={vue} disponibles={disponibles} />
      ) : (
        <p className="bg-white rounded-2xl border border-[#E6EAF0] p-8 text-center text-[13px] text-[#667085]">
          Aucune session à planifier.
        </p>
      )}
    </div>
  );
}
