export const dynamic = "force-dynamic";

import { chargerContexteSession } from "@/lib/operations/planification-chargement";
import { OPS_CONTENT_CLASS, PageHeader } from "@/components/ops/shell";
import { CopiloteBoard } from "@/components/ops/planification/CopiloteBoard";
import { Sparkles } from "lucide-react";

// PAGE 3 — OPTIMISER. Recommandations, contrôle et historique.
// Aucune des 5 cartes de la Page 1 n'est reprise ici (règle de non-redondance).

const ONGLETS = ["suggestions", "remplacements", "sous-effectifs", "conflits", "historique", "journal"] as const;
type Onglet = (typeof ONGLETS)[number];

export default async function CopilotePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; onglet?: string }>;
}) {
  const { session, onglet } = await searchParams;
  const { vue, disponibles, journal } = await chargerContexteSession(session);
  const ongletInitial = ONGLETS.includes(onglet as Onglet) ? (onglet as Onglet) : "suggestions";

  return (
    <div className={OPS_CONTENT_CLASS}>
      <PageHeader
        page="Planification"
        title="Copilote IA & contrôle"
        icon={<Sparkles className="w-[18px] h-[18px]" />}
        subtitle="Optimiser la couverture, détecter les risques et guider les décisions"
      />
      {vue ? (
        <CopiloteBoard vue={vue} disponibles={disponibles} journal={journal} ongletInitial={ongletInitial} />
      ) : (
        <p className="bg-white rounded-2xl border border-[#E6EAF0] p-8 text-center text-[13px] text-[#667085]">
          Aucune session à optimiser.
        </p>
      )}
    </div>
  );
}
