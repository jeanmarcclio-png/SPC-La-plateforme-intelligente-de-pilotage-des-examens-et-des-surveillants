export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getPortailByToken } from "@/lib/operations/portail";
import { portailEtatMessage } from "@/lib/operations/portail-constants";
import { PortailDemandeForm } from "@/components/PortailDemandeForm";

export const metadata = {
  title: "Demande de surveillance — Survéo",
  description: "Complétez votre demande de surveillance d'examens.",
  robots: { index: false, follow: false },
};

const NAVY = "#0d2137";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-[#f0f2f5] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-[18px] font-extrabold" style={{ color: NAVY }}>Survéo</div>
          <span className="text-[12px] text-gray-400">· Demande de surveillance d&apos;examens</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8">{children}</div>
        <p className="text-center text-[11px] text-gray-400 mt-4">SPC — Surveillance d&apos;examens · SAS Henriques de Oliveira</p>
      </div>
    </div>
  );
}

function Invalide({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
        <ShieldAlert className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-[19px] font-extrabold" style={{ color: NAVY }}>Lien indisponible</h1>
      <p className="text-[14px] text-gray-500 mt-2 max-w-md mx-auto">{message}</p>
      <Link href="/confidentialite" className="inline-block mt-4 text-[12.5px] text-[#1a6b7e] underline">Politique de confidentialité</Link>
    </div>
  );
}

export default async function PortailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await getPortailByToken(token);

  if (res.etat !== "ok" || !res.form) {
    return (
      <Shell>
        <Invalide message={res.etat === "soumis" ? portailEtatMessage("soumis") : portailEtatMessage(res.etat)} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="pb-4 border-b border-gray-100">
        <h1 className="text-[21px] font-extrabold" style={{ color: NAVY }}>Complétez votre demande</h1>
        <p className="text-[13.5px] text-gray-500 mt-1">Vérifiez et complétez les informations ci-dessous, puis transmettez-les à SPC. Les champs marqués <span className="text-red-500">*</span> sont obligatoires.</p>
      </header>
      <PortailDemandeForm token={token} initial={res.form} reference={res.reference} expiresAt={res.expiresAt} />
    </Shell>
  );
}
