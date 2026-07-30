export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { TerrainMode } from "@/components/ops/TerrainMode";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

export default async function TerrainPage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);
  // Session du jour : « En cours » en priorité, puis Validée / Planifiée.
  const active =
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée") ??
    missions[0] ?? null;

  return (
    <div className="p-3 md:p-5 w-full">
      <RealtimeRefresh tables={["affectations"]} />
      {active ? (
        <TerrainMode
          mission={active}
          surveillants={surveillants}
          affectations={affectations.filter((a) => a.missionId === active.id)}
        />
      ) : (
        <div className="mx-auto max-w-[480px] mt-10 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 text-center text-[13px] text-gray-500">
          Aucune session à piloter aujourd&apos;hui.
        </div>
      )}
    </div>
  );
}
