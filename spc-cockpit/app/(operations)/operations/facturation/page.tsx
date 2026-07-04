export const dynamic = "force-dynamic";

import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getFactures } from "@/lib/operations/queries";
import { FacturationTable } from "@/components/ops/FacturationTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { Euro, CheckCircle2, FileText, AlertCircle } from "lucide-react";

export default async function FacturationPage() {
  const factures = await getFactures();
  const caTotal = factures.reduce((s, f) => s + f.montantHT, 0);
  const encaisse = factures.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0);
  const enAttente = factures.filter((f) => f.statut === "Facturée").length;
  const enRetard = factures.filter((f) => f.statut === "En retard").length;

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <OpsBreadcrumb page="Facturation" />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Facturation</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Suivi des factures, paiements et chiffre d&apos;affaires</p>
      </div>

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
