import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Toaster } from "@/components/Toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { GlobalSearch } from "@/components/GlobalSearch";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { CopiloteDrawer } from "@/components/CopiloteDrawer";
import { MobileFabBar } from "@/components/MobileFabBar";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
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
    </div>
  );
}
