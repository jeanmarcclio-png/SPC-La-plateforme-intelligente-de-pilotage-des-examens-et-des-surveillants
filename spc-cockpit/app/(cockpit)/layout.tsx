import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Toaster } from "@/components/Toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { GlobalSearch } from "@/components/GlobalSearch";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f0f2f5" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col pb-[76px] md:pb-0">
          <PushNotificationBanner />
          {children}
        </div>
      </div>
      <MobileNav />
      <Toaster />
      <PullToRefresh />
      <GlobalSearch />
    </div>
  );
}
