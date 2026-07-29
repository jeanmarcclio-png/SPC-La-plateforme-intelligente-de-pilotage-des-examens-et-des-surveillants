export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DemandeModeleButton } from "@/components/DemandeModeleButton";
import { DemandeImporter } from "@/components/DemandeImporter";

export default function ImporterDemandePage() {
  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Demandes clients" title="Importer une demande" badge="Excel" badgeColor="blue" actions={<DemandeModeleButton />} />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
          <Link href="/demandes-client" className="inline-flex items-center gap-1 text-[12px] text-white/70 mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Demandes</Link>
          <div className="text-[20px] font-extrabold text-white">Importer une demande</div>
          <div className="mt-3"><DemandeModeleButton /></div>
        </div>

        <div className="max-w-[1000px] mx-auto p-4 md:p-6 pb-40">
          <div className="hidden md:flex items-center justify-between mb-5">
            <p className="text-[13px] text-gray-500">Déposez le modèle Excel rempli par le client : SPC lit les salles et pré-remplit la fiche.</p>
            <Link href="/demandes-client" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Retour à la liste</Link>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 mb-5 text-[12.5px] text-blue-800">
            Pas encore de fichier ? Téléchargez d&apos;abord le <strong>modèle Excel</strong> (bouton en haut), envoyez-le au client, puis réimportez-le ici une fois rempli.
          </div>

          <DemandeImporter />
        </div>
      </main>
    </>
  );
}
