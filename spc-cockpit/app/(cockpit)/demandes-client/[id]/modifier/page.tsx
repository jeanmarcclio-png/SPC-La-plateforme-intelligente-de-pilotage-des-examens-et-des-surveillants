export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DemandeClientForm } from "@/components/DemandeClientForm";
import { getDemandeClient } from "@/lib/operations/demandes";
import { STATUTS_VERROUILLES } from "@/lib/operations/demandes-constants";

export default async function ModifierDemandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demande = await getDemandeClient(Number(id));
  if (!demande) notFound();
  if (STATUTS_VERROUILLES.includes(demande.statut)) redirect(`/demandes-client/${demande.id}`);

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Demandes clients" title={`Modifier — ${demande.etablissement}`} badge={demande.reference} badgeColor="blue" />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
          <Link href={`/demandes-client/${demande.id}`} className="inline-flex items-center gap-1 text-[12px] text-white/70 mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Fiche</Link>
          <div className="text-[20px] font-extrabold text-white">Modifier la demande</div>
          <div className="text-[12px] text-white/70 font-mono">{demande.reference}</div>
        </div>

        <div className="max-w-[1000px] mx-auto p-4 md:p-6 pb-40">
          <div className="hidden md:flex items-center justify-between mb-5">
            <p className="text-[13px] text-gray-500">Modifiez les informations de la demande, puis enregistrez.</p>
            <Link href={`/demandes-client/${demande.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Retour à la fiche</Link>
          </div>
          <DemandeClientForm demande={demande} />
        </div>
      </main>
    </>
  );
}
