import { OpsSidebar, OpsMobileHeader } from "@/components/ops/OpsSidebar";
import { OpsTopbar } from "@/components/ops/OpsTopbar";
import { Toaster } from "@/components/Toast";
import { getMissions } from "@/lib/operations/queries";
import { dateFR } from "@/lib/operations/format";
import { getMyOrganizations, getActiveOrgId, requireActiveOrgId } from "@/lib/auth/org";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  // Exige une organisation active (→ /onboarding au premier login).
  await requireActiveOrgId();

  const [missions, orgs, activeOrgId] = await Promise.all([
    getMissions(),
    getMyOrganizations(),
    getActiveOrgId(),
  ]);
  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Validée") ?? missions.find((m) => m.statut === "Planifiée");
  const activeMission = active ? { client: active.client, dateLabel: dateFR(active.dateMission) } : null;
  const orgOptions = orgs.map((o) => ({ orgId: o.orgId, nom: o.nom, role: o.role }));

  return (
    <div className="flex h-dvh overflow-hidden flex-col md:flex-row" style={{ background: "#F5F6F8" }}>
      <OpsMobileHeader />
      <OpsSidebar activeMission={activeMission} />
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
