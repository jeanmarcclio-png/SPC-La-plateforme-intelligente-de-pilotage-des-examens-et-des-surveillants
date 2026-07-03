export const dynamic = "force-dynamic";

import { getSurveillants } from "@/lib/operations/queries";
import { SurveillantsTable } from "@/components/ops/SurveillantsTable";

export default async function SurveillantsPage() {
  const surveillants = await getSurveillants();
  const dispo = surveillants.filter((s) => s.statut === "Disponible" || s.statut === "Planifié").length;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Surveillants</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {surveillants.length} dans l&apos;équipe · {dispo} mobilisables
        </p>
      </div>
      <SurveillantsTable surveillants={surveillants} />
    </div>
  );
}
