import { OpsSidebar, OpsMobileHeader } from "@/components/ops/OpsSidebar";
import { Toaster } from "@/components/Toast";
import { getMissions } from "@/lib/operations/queries";
import { dateFR } from "@/lib/operations/format";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  const missions = await getMissions();
  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Planifiée");
  const activeMission = active ? { client: active.client, dateLabel: dateFR(active.dateMission) } : null;

  return (
    <div className="flex h-dvh overflow-hidden flex-col md:flex-row" style={{ background: "#f1f5f9" }}>
      <OpsMobileHeader />
      <OpsSidebar activeMission={activeMission} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
