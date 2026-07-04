export const dynamic = "force-dynamic";

import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getIncidents } from "@/lib/operations/queries";
import { IncidentsTable } from "@/components/ops/IncidentsTable";
import { Kpi } from "@/components/ops/Kpi";
import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

export default async function IncidentsPage() {
  const incidents = await getIncidents();
  const ouverts = incidents.filter((i) => i.statut !== "Résolu").length;
  const resolus = incidents.filter((i) => i.statut === "Résolu").length;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <OpsBreadcrumb page="Incidents" />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Incidents</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Déclaration, suivi et résolution des incidents pendant les examens</p>
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi label="Total" value={String(incidents.length)} sub="incidents déclarés" icon={<AlertTriangle className="w-4 h-4" />} />
        <Kpi label="Ouverts" value={String(ouverts)} sub="à traiter" icon={<ShieldAlert className="w-4 h-4" />} />
        <Kpi label="Résolus" value={String(resolus)} sub="clôturés" icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      <IncidentsTable incidents={incidents} />
    </div>
  );
}
