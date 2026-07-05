export const dynamic = "force-dynamic";

import { getFactures } from "@/lib/operations/queries";
import { FacturationTable } from "@/components/ops/FacturationTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { Euro, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function FacturationPage() {
  const factures = await getFactures();
  const caTotal = factures.reduce((s, f) => s + f.montantHT, 0);
  const encaisse = factures.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0);
  const enAttente = factures.filter((f) => f.statut === "Facturée").length;
  const enRetard = factures.filter((f) => f.statut === "En retard").length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Facturation" subtitle="Suivi des factures, paiements et chiffre d&apos;affaires" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="CA total HT" value={euro(caTotal)} sub="toutes factures" icon={<Euro className="w-4 h-4" />} />
        <Kpi label="Encaissé HT" value={euro(encaisse)} sub="factures payées" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi label="En attente" value={String(enAttente)} sub="factures émises non payées" icon={<FileText className="w-4 h-4" />} />
        <Kpi label="En retard" value={String(enRetard)} sub="à relancer" icon={<AlertCircle className="w-4 h-4" />} />
      </div>

      <FacturationTable factures={factures} />
    </div>
  );
}
