export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { PresenceBoard } from "@/components/ops/PresenceBoard";
import { Kpi } from "@/components/ops/Kpi";
import { dateFR } from "@/lib/operations/format";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function PresencePage() {
  const [missions, surveillants, affectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);

  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Validée") ?? missions.find((m) => m.statut === "Planifiée");
  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];

  const presents = rows.filter((a) => a.presence === "Présent").length;
  const absents = rows.filter((a) => a.presence === "Absent").length;
  const attente = rows.filter((a) => a.presence === "En attente").length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader
        page="Présence"
        title="Suivi des présences"
        subtitle={`Émargement numérique des surveillants${active ? ` — ${active.client}, ${dateFR(active.dateMission)}` : ""}`}
      />

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi label="Présents" value={String(presents)} sub="émargés" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi label="Absents" value={String(absents)} sub="signalés" icon={<XCircle className="w-4 h-4" />} />
        <Kpi label="En attente" value={String(attente)} sub="pas encore émargés" icon={<Clock className="w-4 h-4" />} />
      </div>

      <PresenceBoard affectations={rows} surveillants={surveillants} />
    </div>
  );
}
