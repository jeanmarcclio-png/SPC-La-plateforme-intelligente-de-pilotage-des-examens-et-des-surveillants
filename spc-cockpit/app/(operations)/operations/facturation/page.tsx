export const dynamic = "force-dynamic";

import { getFactures } from "@/lib/operations/queries";
import { FacturationTable } from "@/components/ops/FacturationTable";
import { Kpi } from "@/components/ops/Kpi";
import { euro } from "@/lib/operations/format";
import { Euro, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";
import { BandeauSource, EtatVide } from "@/components/ops/EtatSource";

export default async function FacturationPage() {
  const jeu = await getFactures();
  const factures = jeu.lignes;
  const caTotal = factures.reduce((s, f) => s + f.montantHT, 0);
  const encaisse = factures.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0);
  const enAttente = factures.filter((f) => f.statut === "Facturée").length;
  const enRetard = factures.filter((f) => f.statut === "En retard").length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Facturation" subtitle="Suivi des factures, paiements et chiffre d&apos;affaires" />

      <BandeauSource origine={jeu.origine} detail={jeu.erreur} />

      {jeu.origine === "vide" ? (
        <EtatVide
          titre="Aucune facture"
          message="Aucune facture n'a encore été émise. Une facture se crée depuis un devis accepté, une fois la session terminée."
          action={{ label: "Voir les devis", href: "/operations/devis" }}
        />
      ) : (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="indigo" label="CA total HT" value={euro(caTotal)} sub="toutes factures" icon={<Euro className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Encaissé HT" value={euro(encaisse)} sub="factures payées" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="amber" label="En attente" value={String(enAttente)} sub="factures émises non payées" icon={<FileText className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="red" label="En retard" value={String(enRetard)} sub="à relancer" icon={<AlertCircle className="w-4 h-4" />} />
      </div>

      <FacturationTable factures={factures} />
      </>
      )}
    </div>
  );
}
