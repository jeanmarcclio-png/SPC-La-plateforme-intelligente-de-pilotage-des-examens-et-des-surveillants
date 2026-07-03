export const dynamic = "force-dynamic";

import { getMissions } from "@/lib/operations/queries";
import { MissionsTable } from "@/components/ops/MissionsTable";
import { euro } from "@/lib/operations/format";

export default async function MissionsPage() {
  const missions = await getMissions();
  const enCours = missions.filter((m) => m.statut === "En cours" || m.statut === "Planifiée").length;
  const terminees = missions.filter((m) => m.statut === "Terminée").length;
  const caTotal = missions.filter((m) => m.statut !== "Annulée").reduce((s, m) => s + m.montantHT, 0);

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Missions</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          {missions.length} missions · {enCours} à venir ou en cours · {terminees} terminée{terminees > 1 ? "s" : ""} · {euro(caTotal)} HT au total
        </p>
      </div>
      <MissionsTable missions={missions} />
    </div>
  );
}
