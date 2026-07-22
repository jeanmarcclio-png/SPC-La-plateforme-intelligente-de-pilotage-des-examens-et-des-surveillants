export const dynamic = "force-dynamic";

import { getMissions } from "@/lib/operations/queries";
import { MissionsTable } from "@/components/ops/MissionsTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { Briefcase, Activity, CheckCircle2, Euro } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function MissionsPage() {
  const missions = await getMissions();
  const enCours = missions.filter((m) => m.statut === "En cours" || m.statut === "Planifiée").length;
  const terminees = missions.filter((m) => m.statut === "Terminée").length;
  const caTotal = missions.filter((m) => m.statut !== "Annulée").reduce((s, m) => s + m.montantHT, 0);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Missions" subtitle="Suivi des sessions d&apos;examens et de la mission active" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="indigo" label="Total missions" value={String(missions.length)} sub="toutes périodes" icon={<Briefcase className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="cyan" label="En cours" value={String(enCours)} sub="planifiées ou actives" icon={<Activity className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Terminées" value={String(terminees)} sub="sessions clôturées" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="teal" label="CA total" value={euro(caTotal)} sub="montants HT cumulés" icon={<Euro className="w-4 h-4" />} />
      </div>

      <MissionsTable missions={missions} />
    </div>
  );
}
