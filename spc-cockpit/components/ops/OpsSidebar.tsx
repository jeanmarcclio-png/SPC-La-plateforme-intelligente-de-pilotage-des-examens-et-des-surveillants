"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gauge, Users, Briefcase, CalendarClock, DoorOpen, Accessibility, FileText, Euro, ClipboardCheck, AlertTriangle, BarChart3, ArrowLeft, ChevronRight, ShieldAlert } from "lucide-react";
import { isNavActive } from "@/lib/operations/nav";

export const NAV = [
  { href: "/operations",                label: "Dashboard",        icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/operations/cockpit",        label: "Cockpit",          icon: <Gauge className="w-4 h-4" /> },
  { href: "/operations/missions",       label: "Missions",         icon: <Briefcase className="w-4 h-4" /> },
  { href: "/operations/surveillants",   label: "Surveillants",     icon: <Users className="w-4 h-4" /> },
  { href: "/operations/planification",  label: "Planification",    icon: <CalendarClock className="w-4 h-4" /> },
  { href: "/operations/salles",         label: "Salles",           icon: <DoorOpen className="w-4 h-4" /> },
  { href: "/operations/pmr",            label: "PMR & Tiers-temps", icon: <Accessibility className="w-4 h-4" /> },
  { href: "/operations/devis",          label: "Devis",            icon: <FileText className="w-4 h-4" /> },
  { href: "/operations/facturation",    label: "Facturation",      icon: <Euro className="w-4 h-4" /> },
  { href: "/operations/presence",       label: "Présence",         icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/operations/incidents",      label: "Incidents",        icon: <AlertTriangle className="w-4 h-4" /> },
  { href: "/operations/rapports",       label: "Rapports",         icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/operations/risques",        label: "Risques IA",       icon: <ShieldAlert className="w-4 h-4" /> },
];

export interface ActiveMissionInfo {
  client: string;
  dateLabel: string;
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white text-[12px] font-extrabold tracking-tight flex-shrink-0">
        SPC
      </span>
      <div>
        <div className="text-white font-extrabold text-[14.5px] tracking-tight leading-none">SPC Platform</div>
        <div className="text-[11px] text-[#8fa3b8] mt-1">Gestion examens</div>
      </div>
    </div>
  );
}

export function OpsSidebar({ activeMission }: { activeMission?: ActiveMissionInfo | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex print:!hidden w-[236px] flex-shrink-0 flex-col" style={{ background: "linear-gradient(180deg, #0F2942 0%, #0A1F33 100%)" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <LogoBlock />
      </div>

      {/* Mission active */}
      {activeMission && (
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

      {/* Nav */}
      <div className="px-4 text-[10px] font-bold uppercase tracking-[1.5px] text-[#5f7a94] mb-1.5">Navigation</div>
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between gap-2.5 rounded-xl px-3 py-[9px] text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                active
                  ? "bg-white text-[#0d2137] font-semibold shadow-sm"
                  : "text-[#8fa3b8] hover:bg-white/[0.06] hover:text-[#d6e2ee]"
              }`}
            >
              <span className="flex items-center gap-2.5">{item.icon}{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-[#0d2137]/40" />}
            </Link>
          );
        })}
      </nav>

      {/* Retour cockpit commercial */}
      <div className="p-3 border-t border-white/[0.07]">
        <Link
          href="/cockpit"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-[#8fa3b8] hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          Cockpit commercial
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
