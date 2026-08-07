export const dynamic = "force-dynamic";

import { getAffectations, getAmenagements, getMissions, getSalles, getSurveillants } from "@/lib/operations/queries";
import { selectionnerMissionActive } from "@/lib/operations/missions-dashboard";
import { construireVuePMR } from "@/lib/operations/pmr-vue";
import { OPS_CONTENT_CLASS } from "@/components/ops/shell";
import { OpsBreadcrumb } from "@/components/ops/OpsBreadcrumb";
import { PMRKpiBand, PMRActionsImmediates, PMRCartographie, PMRCouverture } from "@/components/ops/pmr/PMRBandeaux";
import { PlanAmenagement } from "@/components/ops/pmr/PlanAmenagement";
import { PMR } from "@/components/ops/pmr/tokens";

// PMR & Tiers-temps — centre de commandement « Dark Navy + bandeaux blancs ».
// Les chiffres proviennent tous de construireVuePMR : KPI, actions, tableau,
// cartographie et couverture lisent le même calcul.

export default async function PMRPage() {
  const [amenagements, salles, surveillants, affectations, missions] = await Promise.all([
    getAmenagements(), getSalles(), getSurveillants(), getAffectations(), getMissions(),
  ]);

  const mission = selectionnerMissionActive(missions) ?? null;
  const vue = construireVuePMR({ amenagements, salles, affectations, mission });

  return (
    <div className="min-h-full" style={{ background: PMR.fondApp }}>
      <div className={OPS_CONTENT_CLASS}>
        {/* En-tête de page (§7) — sur fond dark, contraste AA */}
        <div className="mb-6">
          <div className="[&_a]:text-[#8FA0B2] [&_span]:text-[#B7C2CF]">
            <OpsBreadcrumb page="PMR & Tiers-temps" />
          </div>
          <h1 className="text-[26px] md:text-[30px] font-bold tracking-tight" style={{ color: PMR.texteSombrePrimaire }}>
            PMR &amp; Tiers-temps
          </h1>
          <p className="text-[13.5px] mt-1" style={{ color: PMR.texteSombreSecondaire }}>
            Gestion des aménagements pour étudiants à besoins spécifiques
          </p>
        </div>

        <PMRKpiBand vue={vue} />
        <PMRActionsImmediates actions={vue.actions} />

        {/* Zone de pilotage 65 / 35 (§10) */}
        <div className="grid gap-4 xl:grid-cols-[1.85fr_1fr]">
          <PlanAmenagement lignes={vue.lignes} amenagements={amenagements} surveillants={surveillants} />
          <div className="space-y-4">
            <PMRCartographie vue={vue} />
            <PMRCouverture vue={vue} />
          </div>
        </div>
      </div>
    </div>
  );
}
