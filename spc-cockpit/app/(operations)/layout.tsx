import { OpsSidebar, OpsMobileHeader } from "@/components/ops/OpsSidebar";
import { OpsTopbar } from "@/components/ops/OpsTopbar";
import { Toaster } from "@/components/Toast";
import { getIncidents, getMissions } from "@/lib/operations/queries";
import { dateFR } from "@/lib/operations/format";
import { selectionnerMissionActive } from "@/lib/operations/missions-dashboard";
import { getMyOrganizations, getActiveOrgId, requireActiveOrgId } from "@/lib/auth/org";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  // Exige une organisation active (→ /onboarding au premier login).
  await requireActiveOrgId();

  const [missions, incidents, orgs, activeOrgId] = await Promise.all([
    getMissions(),
    getIncidents(),
    getMyOrganizations(),
    getActiveOrgId(),
  ]);
  // Même sélection que la page Missions et le Cockpit — une seule règle.
  const active = selectionnerMissionActive(missions);
  const activeMission = active ? { client: active.client, dateLabel: dateFR(active.dateMission) } : null;
  const incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu").length;
  const orgOptions = orgs.map((o) => ({ orgId: o.orgId, nom: o.nom, role: o.role }));

  return (
    <div className="flex h-dvh overflow-hidden flex-col md:flex-row" style={{ background: "#F5F6F8" }}>
      <OpsMobileHeader />
      <OpsSidebar activeMission={activeMission} incidentsOuverts={incidentsOuverts} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <OpsTopbar orgs={orgOptions} activeOrgId={activeOrgId} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
