export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { PlanificationBoard } from "@/components/ops/PlanificationBoard";
import { PageHeader } from "@/components/ops/shell";

export default async function PlanificationPage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Planification" subtitle="Sessions d&apos;examens · affectation des salles et créneaux, suivi des heures" />
      <PlanificationBoard missions={missions} surveillants={surveillants} affectations={affectations} />
    </div>
  );
}
