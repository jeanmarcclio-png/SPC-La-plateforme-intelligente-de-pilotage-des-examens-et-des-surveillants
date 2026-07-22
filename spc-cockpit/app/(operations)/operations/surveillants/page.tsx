export const dynamic = "force-dynamic";

import { getSurveillants, getAffectations } from "@/lib/operations/queries";
import { getInvitationStatuses } from "@/lib/supabase/portail";
import { SurveillantsTable } from "@/components/ops/SurveillantsTable";
import { SurveillantsImportExport } from "@/components/ops/SurveillantsImportExport";
import { InvitationsPanel } from "@/components/ops/InvitationsPanel";
import { Kpi } from "@/components/ops/Kpi";
import { Users, UserCheck, Clock, Star, AlertTriangle, Shield, UsersRound } from "lucide-react";
import { SEUIL_SURCHARGE_H } from "@/lib/operations/constants";
import { PageHeader } from "@/components/ops/shell";

function PilotageCard({ tag, titre, detail, icon }: { tag: string; titre: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[220px] px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500">{icon}</span>
        <span className="text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400">{tag}</span>
      </div>
      <div className="text-[13.5px] font-bold text-gray-900">{titre}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">{detail}</div>
    </div>
  );
}

export default async function SurveillantsPage() {
  const [surveillants, affectations, invitations] = await Promise.all([
    getSurveillants(), getAffectations(), getInvitationStatuses(),
  ]);

  // Salles où chaque surveillant est déjà affecté (cross-check à l'import).
  const sallesBySurvId = new Map<number, Set<string>>();
  for (const a of affectations) {
    if (!a.salle) continue;
    const set = sallesBySurvId.get(a.surveillantId) ?? new Set<string>();
    set.add(a.salle);
    sallesBySurvId.set(a.surveillantId, set);
  }
  const assignments = surveillants
    .map((s) => ({ nom: s.nom, salles: [...(sallesBySurvId.get(s.id) ?? [])] }))
    .filter((a) => a.salles.length > 0);
  const dispo = surveillants.filter((s) => s.statut === "Disponible" || s.statut === "Planifié");
  const heuresMoy = surveillants.length
    ? Math.round(surveillants.reduce((s, x) => s + x.heures, 0) / surveillants.length)
    : 0;
  const noteMoy = surveillants.length
    ? surveillants.reduce((s, x) => s + x.note, 0) / surveillants.length
    : 0;

  const surcharges = surveillants.filter((s) => s.heures >= SEUIL_SURCHARGE_H);
  const coordinateurs = surveillants.filter((s) => s.role.toLowerCase().includes("coordinat"));
  const pmr = surveillants.filter((s) => s.role.toLowerCase().includes("pmr") && (s.statut === "Disponible" || s.statut === "Planifié"));
  const noyau = [...dispo].sort((a, b) => b.note - a.note).slice(0, 3);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader page="Surveillants" subtitle="Annuaire, rôles et disponibilités de l&apos;équipe" />

      {/* Accès portail surveillant — invitations */}
      <InvitationsPanel rows={invitations} />

      {/* Import / Export CSV */}
      <SurveillantsImportExport surveillants={surveillants} assignments={assignments} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="teal" label="Total" value={String(surveillants.length)} sub="surveillants" icon={<Users className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Disponibles" value={String(dispo.length)} sub="mobilisables ce mois" icon={<UserCheck className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="amber" label="Heures moy." value={`${heuresMoy}h`} sub="par surveillant" icon={<Clock className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="indigo" label="Note moy." value={`${noteMoy.toFixed(1)} / 5`} sub="satisfaction" icon={<Star className="w-4 h-4" />} />
      </div>

      {/* Pilotage de l'équipe */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm mb-5 overflow-hidden">
        <div className="px-5 pt-4.5 pb-1 flex items-baseline justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Pilotage de l&apos;équipe</h2>
            <p className="text-[12px] text-gray-400">Points de vigilance pour affecter les bons profils aux prochaines missions</p>
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-wide border border-gray-200 text-gray-500 rounded-full px-2.5 py-1">
            {surveillants.length - dispo.length} indisponible{surveillants.length - dispo.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex flex-wrap divide-x divide-gray-100">
          <PilotageCard
            tag="Risque fatigue"
            titre="Charge à équilibrer"
            detail={surcharges.length ? `${surcharges.map((s) => s.nom).join(", ")} ≥ ${SEUIL_SURCHARGE_H}h planifiées` : "Aucune surcharge détectée"}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <PilotageCard
            tag="Rôles clés"
            titre="Couverture spécialisée"
            detail={`${coordinateurs.length} coordinateur${coordinateurs.length > 1 ? "s" : ""} · ${pmr.length} PMR disponible${pmr.length > 1 ? "s" : ""}`}
            icon={<Shield className="w-4 h-4" />}
          />
          <PilotageCard
            tag={`${dispo.length}/${surveillants.length} disponibles`}
            titre="Noyau mobilisable"
            detail={noyau.map((s) => s.nom.split(" ")[0]).join(", ") || "—"}
            icon={<UsersRound className="w-4 h-4" />}
          />
        </div>
      </div>

      <SurveillantsTable surveillants={surveillants} />
    </div>
  );
}
