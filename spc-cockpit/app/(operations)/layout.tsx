import { OpsSidebar, OpsMobileHeader } from "@/components/ops/OpsSidebar";
import { Toaster } from "@/components/Toast";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden flex-col md:flex-row" style={{ background: "#f4f4f7" }}>
      <OpsMobileHeader />
      <OpsSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
