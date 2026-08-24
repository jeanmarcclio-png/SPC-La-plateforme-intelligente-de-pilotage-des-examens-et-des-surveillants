import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Toaster } from "@/components/Toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { GlobalSearch } from "@/components/GlobalSearch";
import { CommandPalette } from "@/components/CommandPalette";
import { PushNotificationBanner } from "@/components/PushNotificationBanner";
import { CopiloteDrawer } from "@/components/CopiloteDrawer";
import { MobileFabBar } from "@/components/MobileFabBar";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { SyncStamp } from "@/components/SyncStamp";
import { TenantProvider } from "@/lib/tenant/TenantContext";
import { BandeauDemo } from "@/components/ops/EtatSource";
import { demoActif } from "@/lib/operations/source";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <div className="flex h-dvh overflow-hidden" style={{ background: "#f0f2f5" }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-hidden flex flex-col pb-[136px] md:pb-0">
            <PushNotificationBanner />
            {/* Le mode démonstration doit se signaler ICI AUSSI : ces écrans
                commerciaux n'avaient aucun bandeau, alors qu'ils affichent
                des chiffres. Un jeu fictif que rien ne trahit est exactement
                le défaut corrigé sous BUG-001 / BUG-002. */}
            {demoActif() && (
              <div className="px-4 pt-4 md:px-6 md:pt-6">
                <BandeauDemo />
              </div>
            )}
            {children}
          </div>
        </div>
        <MobileNav />
        <MobileFabBar />
        <Toaster />
        <PullToRefresh />
        <GlobalSearch />
        <CommandPalette />
        <CopiloteDrawer />
        <OnboardingOverlay />
        <SyncStamp />
      </div>
    </TenantProvider>
  );
}
