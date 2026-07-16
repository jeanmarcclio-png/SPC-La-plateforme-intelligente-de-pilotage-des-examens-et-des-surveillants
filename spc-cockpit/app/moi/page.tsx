export const dynamic = "force-dynamic";

import { getMonSurveillantId, getMesAffectations, getMesDisponibilites } from "@/lib/supabase/portail";
import { getCurrentUser } from "@/lib/auth/session";
import { MesAffectations } from "@/components/moi/MesAffectations";
import { MesDisponibilites } from "@/components/moi/MesDisponibilites";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

function isoDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default async function MoiPage() {
  const user = await getCurrentUser();
  const surveillantId = await getMonSurveillantId();

  // Aperçu « vue surveillant » pour les rôles non-surveillant (non liés).
  if (!surveillantId) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h1 className="text-lg font-bold text-[#0d1e2e]">Aperçu · vue surveillant</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Votre compte n&apos;est pas rattaché à une fiche surveillant. Cet espace montre
            ce que voit un surveillant : son planning, la confirmation des affectations et
            la déclaration de ses disponibilités.
          </p>
          {user?.email && (
            <p className="text-[12px] text-gray-400 mt-3">Connecté en tant que {user.email}.</p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 opacity-60 pointer-events-none">
          <div className="text-[13px] font-semibold text-gray-700 mb-2">Mes affectations</div>
          <div className="text-[12px] text-gray-400">Aucune donnée en mode aperçu.</div>
        </div>
      </div>
    );
  }

  const [affectations, dispos] = await Promise.all([
    getMesAffectations(),
    getMesDisponibilites(isoDay(0), isoDay(13)),
  ]);
  const jours = Array.from({ length: 14 }, (_, i) => isoDay(i));

  return (
    <div className="space-y-5">
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <h1 className="text-lg font-bold text-[#0d1e2e] px-1">Mon planning</h1>
      <MesAffectations affectations={affectations} />

      <h2 className="text-lg font-bold text-[#0d1e2e] px-1 pt-2">Mes disponibilités</h2>
      <MesDisponibilites jours={jours} initiales={dispos} />
    </div>
  );
}
