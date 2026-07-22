export const dynamic = "force-dynamic";

import { getIncidents } from "@/lib/operations/queries";
import { IncidentsTable } from "@/components/ops/IncidentsTable";
import { Kpi } from "@/components/ops/Kpi";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function IncidentsPage() {
  const incidents = await getIncidents();
  const ouverts = incidents.filter((i) => i.statut !== "Résolu").length;
  const resolus = incidents.filter((i) => i.statut === "Résolu").length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Incidents" subtitle="Déclaration, suivi et résolution des incidents pendant les examens" />

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="indigo" label="Total" value={String(incidents.length)} sub="incidents déclarés" icon={<AlertTriangle className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="amber" label="Ouverts" value={String(ouverts)} sub="à traiter" icon={<ShieldAlert className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Résolus" value={String(resolus)} sub="clôturés" icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <IncidentsTable incidents={incidents} />
    </div>
  );
}
