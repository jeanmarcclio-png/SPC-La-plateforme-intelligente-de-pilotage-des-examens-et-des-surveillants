"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gauge, Users, Briefcase, CalendarClock, DoorOpen, Accessibility, FileText, Euro, ClipboardCheck, AlertTriangle, BarChart3, ArrowLeft, ChevronRight, ShieldAlert, Menu, ChevronLeft } from "lucide-react";
import { isNavActive } from "@/lib/operations/nav";

type NavGroup = "pilotage" | "commercial" | "suivi";

export const NAV: { href: string; label: string; icon: React.ReactNode; group: NavGroup }[] = [
  { href: "/operations",                label: "Dashboard",         icon: <LayoutDashboard className="w-4 h-4" />, group: "pilotage" },
  { href: "/operations/cockpit",        label: "Cockpit",           icon: <Gauge className="w-4 h-4" />,          group: "pilotage" },
  { href: "/operations/missions",       label: "Missions",          icon: <Briefcase className="w-4 h-4" />,      group: "pilotage" },
  { href: "/operations/surveillants",   label: "Surveillants",      icon: <Users className="w-4 h-4" />,          group: "pilotage" },
  { href: "/operations/planification",  label: "Planification",     icon: <CalendarClock className="w-4 h-4" />,  group: "pilotage" },
  { href: "/operations/salles",         label: "Salles",            icon: <DoorOpen className="w-4 h-4" />,        group: "pilotage" },
  { href: "/operations/pmr",            label: "PMR & Tiers-temps", icon: <Accessibility className="w-4 h-4" />,   group: "pilotage" },
  { href: "/operations/devis",          label: "Devis",             icon: <FileText className="w-4 h-4" />,        group: "commercial" },
  { href: "/operations/facturation",    label: "Facturation",       icon: <Euro className="w-4 h-4" />,            group: "commercial" },
  { href: "/operations/presence",       label: "Présence",          icon: <ClipboardCheck className="w-4 h-4" />,  group: "suivi" },
  { href: "/operations/incidents",      label: "Incidents",         icon: <AlertTriangle className="w-4 h-4" />,   group: "suivi" },
  { href: "/operations/rapports",       label: "Rapports",          icon: <BarChart3 className="w-4 h-4" />,       group: "suivi" },
  { href: "/operations/risques",        label: "Risques IA",        icon: <ShieldAlert className="w-4 h-4" />,     group: "suivi" },
];

const GROUP_LABEL: Record<NavGroup, string> = { pilotage: "Pilotage", commercial: "Commercial", suivi: "Suivi & qualité" };
const GROUP_ORDER: NavGroup[] = ["pilotage", "commercial", "suivi"];
const STORAGE_KEY = "surveo-sidebar-collapsed";

export interface ActiveMissionInfo {
  client: string;
  dateLabel: string;
}

function LogoBlock({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a6b7e, #7c5cff)" }} aria-hidden>
        ✦
      </span>
      {!collapsed && (
        <div>
          <div className="text-white font-extrabold text-[14.5px] tracking-tight leading-none flex items-center gap-1.5">
            Survéo
            <span className="text-[9px] font-extrabold text-white rounded px-1.5 py-0.5 tracking-[0.03em]" style={{ background: "#7c5cff" }}>IA</span>
          </div>
          <div className="text-[11px] text-[#8fa3b8] mt-1">Gestion des examens</div>
        </div>
      )}
    </div>
  );
}

export function OpsSidebar({ activeMission, badges = {} }: { activeMission?: ActiveMissionInfo | null; badges?: Record<string, number> }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Persistance + repli auto sur petits écrans (lu après montage → pas de mismatch d'hydratation).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored != null ? stored === "true" : window.innerWidth < 1280;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation ponctuelle de l'état depuis le stockage persistant après montage (sûr côté hydratation)
    setCollapsed(initial);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* stockage indisponible */ }
      return next;
    });
  }

  return (
    <aside
      className={`hidden md:flex print:!hidden flex-shrink-0 flex-col transition-[width] duration-200 ease-out ${collapsed ? "w-[64px]" : "w-[236px]"}`}
      style={{ background: "linear-gradient(180deg, #0F2942 0%, #0A1F33 100%)" }}
    >
      {/* Logo + toggle */}
      <div className={`px-4 pt-5 pb-4 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
        {!collapsed && <LogoBlock />}
        <button
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
          title={collapsed ? "Déployer le menu" : "Réduire le menu"}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8fa3b8] hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 flex-shrink-0"
        >
          {collapsed ? <Menu className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
        </button>
      </div>

      {/* Mission active (masquée en mode réduit) */}
      {activeMission && !collapsed && (
        <Link
          href="/operations/planification"
          className="mx-3 mb-4 rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/10 px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-white/[0.09] hover:ring-white/20 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
              <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-[#93a7bd]">Mission active</span>
            </div>
            <div className="text-[12.5px] font-bold text-white mt-1 truncate">
              {activeMission.client} — {activeMission.dateLabel}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8fa3b8] flex-shrink-0" />
        </Link>
      )}

      {/* Nav groupée */}
      <nav aria-label="Navigation opérations" className="flex-1 overflow-y-auto px-3 pb-2">
        {GROUP_ORDER.map((group, gi) => (
          <div key={group} className={gi > 0 ? "mt-3 pt-3 border-t border-white/[0.07]" : ""}>
            {collapsed ? (
              gi > 0 ? null : <div className="h-1" />
            ) : (
              <div className="px-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#5f7a94] mb-1.5">{GROUP_LABEL[group]}</div>
            )}
            <div className="space-y-0.5">
              {NAV.filter((item) => item.group === group).map((item) => {
                const active = isNavActive(pathname, item.href);
                const badge = badges[item.href] ?? 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`relative flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2.5 rounded-xl px-3 py-[9px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                      active
                        ? "bg-white text-[#0d2137] font-semibold shadow-sm"
                        : "text-[#8fa3b8] hover:bg-white/[0.06] hover:text-[#d6e2ee]"
                    }`}
                  >
                    <span className={`flex items-center gap-2.5 ${collapsed ? "relative" : "min-w-0"}`}>
                      <span className="relative flex-shrink-0">
                        {item.icon}
                        {collapsed && badge > 0 && (
                          <span aria-hidden className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0c2033]" />
                        )}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </span>
                    {!collapsed && badge > 0 && (
                      <span className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full tabular-nums ${active ? "bg-rose-100 text-rose-700" : "bg-rose-500 text-white"}`}>{badge}</span>
                    )}
                    {!collapsed && active && badge === 0 && <ChevronRight className="w-3.5 h-3.5 text-[#0d2137]/40" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Retour cockpit commercial */}
      <div className="p-3 border-t border-white/[0.07]">
        <Link
          href="/cockpit"
          title={collapsed ? "Cockpit commercial" : undefined}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} px-3 py-2 rounded-xl text-[12px] text-[#8fa3b8] hover:text-white hover:bg-white/[0.05] transition-colors`}
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && "Cockpit commercial"}
        </Link>
      </div>
    </aside>
  );
}

export function OpsMobileHeader() {
  return (
    <div className="md:hidden print:!hidden flex items-center justify-between px-4 py-3.5" style={{ background: "#0F2942" }}>
      <LogoBlock />
      <Link href="/cockpit" className="flex items-center gap-1.5 text-[12px] text-[#8fa3b8]">
        <ArrowLeft className="w-3.5 h-3.5" />
        Cockpit
      </Link>
    </div>
  );
}
