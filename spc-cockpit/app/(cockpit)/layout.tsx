import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Toaster } from "@/components/Toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { GlobalSearch } from "@/components/GlobalSearch";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { CopiloteDrawer } from "@/components/CopiloteDrawer";
import { MobileFabBar } from "@/components/MobileFabBar";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { SyncStamp } from "@/components/SyncStamp";
import { SectorPicker } from "@/components/SectorPicker";
import { TenantProvider } from "@/lib/tenant/TenantContext";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <div className="flex h-dvh overflow-hidden" style={{ background: "#f0f2f5" }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col pb-[136px] md:pb-0">
            <PushNotificationBanner />
            {children}
          </div>
        </div>
        <MobileNav />
        <MobileFabBar />
        <Toaster />
        <PullToRefresh />
        <GlobalSearch />
        <CopiloteDrawer />
        <OnboardingOverlay />
        <SectorPicker />
        <SyncStamp />
      </div>
    </TenantProvider>
  );
}
