import { Sidebar, MobileNav } from "@/components/Sidebar";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f0f2f5" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col pb-[68px] md:pb-0">
          {children}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
