export const dynamic = "force-dynamic";

import { getDevisList, getDevisSalles } from "@/lib/operations/queries";
import { DevisTable } from "@/components/ops/DevisTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { FileText, PenLine, Send, CheckCircle2, Euro } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";

export default async function DevisPage() {
  const [devis, devisSalles] = await Promise.all([getDevisList(), getDevisSalles()]);
  const brouillons = devis.filter((d) => d.statut === "Brouillon").length;
  const envoyes = devis.filter((d) => d.statut === "Envoyé").length;
  const acceptes = devis.filter((d) => d.statut === "Accepté" || d.statut === "Facturé");
  const caAccepteHT = acceptes.reduce((s, d) => s + d.montantHT, 0);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Devis" subtitle="Gestion des devis et suivi du pipeline commercial opérations" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="indigo" label="Total devis" value={String(devis.length)} sub="créés" icon={<FileText className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="slate" label="Brouillons" value={String(brouillons)} sub="à finaliser" icon={<PenLine className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="blue" label="Envoyés" value={String(envoyes)} sub="en attente de réponse" icon={<Send className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Acceptés" value={String(acceptes.length)} sub="missions confirmées" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="teal" label="CA accepté HT" value={euro(caAccepteHT)} sub="devis acceptés ou facturés" icon={<Euro className="w-4 h-4" />} />
      </div>

      <DevisTable devis={devis} devisSalles={devisSalles} />
    </div>
  );
}
