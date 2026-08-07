export const dynamic = "force-dynamic";

import { chargerContexteSession } from "@/lib/operations/planification-chargement";
import { OPS_CONTENT_CLASS, PageHeader } from "@/components/ops/shell";
import { CommandCenter } from "@/components/ops/planification/CommandCenter";
import { RefusPanel } from "@/components/ops/RefusPanel";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { getRefusEnAttente } from "@/lib/supabase/portail";
import { Gauge } from "lucide-react";

// PAGE 1 — PILOTER. Synthèse exécutive de la session courante.
// Les chiffres proviennent de construireVueSession : la Page 2 et la Page 3
// lisent exactement le même calcul.

export default async function PlanificationPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const [{ vue, sessions, disponibles }, refus] = await Promise.all([
    chargerContexteSession(session),
    getRefusEnAttente(),
  ]);

  return (
    <div className={OPS_CONTENT_CLASS}>
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <PageHeader
        page="Planification"
        icon={<Gauge className="w-[18px] h-[18px]" />}
        subtitle="Piloter la session : couverture, marge, heures et points de blocage"
      />
      <RefusPanel refus={refus} />
      {vue ? (
        <CommandCenter vue={vue} sessions={sessions} disponibles={disponibles} />
      ) : (
        <p className="bg-white rounded-2xl border border-[#E6EAF0] p-8 text-center text-[13px] text-[#667085]">
          Aucune session à planifier. Créez une mission pour démarrer le pilotage.
        </p>
      )}
    </div>
  );
}
