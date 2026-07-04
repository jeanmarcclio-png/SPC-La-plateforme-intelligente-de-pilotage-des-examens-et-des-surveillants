export const dynamic = "force-dynamic";

import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { getDevisList } from "@/lib/operations/queries";
import { DevisTable } from "@/components/ops/DevisTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { FileText, Send, CheckCircle2, Euro } from "lucide-react";

export default async function DevisPage() {
  const devis = await getDevisList();
  const envoyes = devis.filter((d) => d.statut === "Envoyé").length;
  const acceptes = devis.filter((d) => d.statut === "Accepté" || d.statut === "Facturé");
  const caConfirme = acceptes.reduce((s, d) => s + d.montantTTC, 0);

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto pb-16">
      <div className="mb-6">
        <OpsBreadcrumb page="Devis" />
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-gray-900 tracking-tight">Devis</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Gestion des devis et suivi du pipeline commercial opérations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi label="Total devis" value={String(devis.length)} sub="créés" icon={<FileText className="w-4 h-4" />} />
        <Kpi label="Envoyés" value={String(envoyes)} sub="en attente de réponse" icon={<Send className="w-4 h-4" />} />
        <Kpi label="Acceptés" value={String(acceptes.length)} sub="missions confirmées" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi label="CA confirmé" value={euro(caConfirme)} sub="TTC acceptés" icon={<Euro className="w-4 h-4" />} />
      </div>

      <DevisTable devis={devis} />
    </div>
  );
}
