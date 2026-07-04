export const dynamic = "force-dynamic";

import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { PlanificationBoard } from "@/components/ops/PlanificationBoard";

export default async function PlanificationPage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <OpsBreadcrumb page="Planification" />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Planification</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Sessions d&apos;examens · affectation des salles et créneaux, suivi des heures</p>
      </div>
      <PlanificationBoard missions={missions} surveillants={surveillants} affectations={affectations} />
    </div>
  );
}
