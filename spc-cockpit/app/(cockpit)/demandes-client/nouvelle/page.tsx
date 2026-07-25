export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DemandeClientForm } from "@/components/DemandeClientForm";

export default function NouvelleDemandePage() {
  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Demandes clients" title="Nouvelle demande client" badge="Brouillon interne" badgeColor="blue" />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
          <Link href="/demandes-client" className="inline-flex items-center gap-1 text-[12px] text-white/70 mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Demandes</Link>
          <div className="text-[20px] font-extrabold text-white">Nouvelle demande</div>
        </div>

        <div className="max-w-[1000px] mx-auto p-4 md:p-6 pb-40">
          <div className="hidden md:flex items-center justify-between mb-5">
            <p className="text-[13px] text-gray-500">Centralisez la demande de surveillance avant conversion en mission et devis.</p>
            <Link href="/demandes-client" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Retour à la liste</Link>
          </div>
          <DemandeClientForm />
        </div>
      </main>
    </>
  );
}
