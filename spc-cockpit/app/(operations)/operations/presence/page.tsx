export const dynamic = "force-dynamic";

import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { PresenceBoard } from "@/components/ops/PresenceBoard";
import { Kpi } from "@/components/ops/Kpi";
import { dateFR } from "@/lib/operations/format";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default async function PresencePage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);

  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Planifiée");
  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];

  const presents = rows.filter((a) => a.presence === "Présent").length;
  const absents = rows.filter((a) => a.presence === "Absent").length;
  const attente = rows.filter((a) => a.presence === "En attente").length;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <OpsBreadcrumb page="Présence" />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Suivi des présences</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Émargement numérique des surveillants{active ? ` — ${active.client}, ${dateFR(active.dateMission)}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi label="Présents" value={String(presents)} sub="émargés" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi label="Absents" value={String(absents)} sub="signalés" icon={<XCircle className="w-4 h-4" />} />
        <Kpi label="En attente" value={String(attente)} sub="pas encore émargés" icon={<Clock className="w-4 h-4" />} />
      </div>

      <PresenceBoard affectations={rows} surveillants={surveillants} />
    </div>
  );
}
