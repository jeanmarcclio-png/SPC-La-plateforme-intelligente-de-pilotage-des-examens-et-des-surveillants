export const dynamic = "force-dynamic";

import { Users, UserCheck, Clock, ShieldCheck, Lock } from "lucide-react";
import { PageHeader, OPS_CONTENT_CLASS } from "@/components/ops/shell";
import { Kpi } from "@/components/ops/Kpi";
import { CollaborateursWorkspace, InviterBouton } from "@/components/ops/collaborateurs/CollaborateursWorkspace";
import { listerCollaborateurs } from "@/app/actions/collaborateurs";
import { getCurrentRole } from "@/lib/auth/session";
import { canAdminOrg } from "@/lib/auth/roles";

const SOUS_TITRE = "Accès à Survéo des membres de votre équipe : invitations, rôles et retraits";

export default async function CollaborateursPage() {
  const role = await getCurrentRole();

  if (!role || !canAdminOrg(role)) {
    return (
      <div className={OPS_CONTENT_CLASS}>
        <PageHeader page="Collaborateurs" subtitle={SOUS_TITRE} />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-10 text-center max-w-xl">
          <Lock className="w-6 h-6 text-gray-400 mx-auto mb-3" aria-hidden />
          <p className="text-[14px] font-semibold text-gray-800">Écran réservé aux administrateurs</p>
          <p className="text-[13px] text-gray-500 mt-1">
            Demandez à un administrateur de votre organisation de gérer les accès.
          </p>
        </div>
      </div>
    );
  }

  const { collaborateurs, error } = await listerCollaborateurs();
  const actifs = collaborateurs.filter((c) => c.statut === "actif").length;
  const enAttente = collaborateurs.length - actifs;
  const admins = collaborateurs.filter((c) => c.role === "administrateur").length;

  return (
    <div className={OPS_CONTENT_CLASS}>
      <PageHeader page="Collaborateurs" subtitle={SOUS_TITRE} actions={!error && <InviterBouton />} />

      {error ? (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-700 text-[13px] rounded-2xl px-5 py-4">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
            <Kpi variant="vivid" accent="indigo" label="Collaborateurs" value={String(collaborateurs.length)} sub="ayant un accès" icon={<Users className="w-4 h-4" />} />
            <Kpi variant="vivid" accent="emerald" label="Actifs" value={String(actifs)} sub="déjà connectés" icon={<UserCheck className="w-4 h-4" />} />
            <Kpi variant="vivid" accent="amber" label="En attente" value={String(enAttente)} sub="invitation non utilisée" icon={<Clock className="w-4 h-4" />} />
            <Kpi variant="vivid" accent="violet" label="Administrateurs" value={String(admins)} sub="gèrent les accès" icon={<ShieldCheck className="w-4 h-4" />} />
          </div>
          <CollaborateursWorkspace collaborateurs={collaborateurs} />
        </>
      )}
    </div>
  );
}
