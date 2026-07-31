"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Gauge, Activity, Users, Briefcase, CalendarClock, DoorOpen, Accessibility, FileText, Euro, ClipboardCheck, AlertTriangle, BarChart3, ArrowLeft, ChevronRight, ShieldAlert, Plus, FilePlus2 } from "lucide-react";
import { isNavActive } from "@/lib/operations/nav";

export const NAV = [
  { href: "/operations",                label: "Dashboard",           icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/operations/cockpit",        label: "Cockpit opérationnel", icon: <Gauge className="w-4 h-4" /> },
  { href: "/operations/supervision",    label: "Supervision live",    icon: <Activity className="w-4 h-4" /> },
  { href: "/operations/missions",       label: "Missions",            icon: <Briefcase className="w-4 h-4" /> },
  { href: "/operations/surveillants",   label: "Surveillants",        icon: <Users className="w-4 h-4" /> },
  { href: "/operations/planification",  label: "Planification",       icon: <CalendarClock className="w-4 h-4" /> },
  { href: "/operations/salles",         label: "Salles",              icon: <DoorOpen className="w-4 h-4" /> },
  { href: "/operations/pmr",            label: "PMR & Tiers-temps",   icon: <Accessibility className="w-4 h-4" /> },
  { href: "/operations/devis",          label: "Devis",               icon: <FileText className="w-4 h-4" /> },
  { href: "/operations/facturation",    label: "Facturation",         icon: <Euro className="w-4 h-4" /> },
  { href: "/operations/presence",       label: "Présence",            icon: <ClipboardCheck className="w-4 h-4" /> },
  { href: "/operations/incidents",      label: "Incidents",           icon: <AlertTriangle className="w-4 h-4" /> },
  { href: "/operations/rapports",       label: "Rapports",            icon: <BarChart3 className="w-4 h-4" /> },
  { href: "/operations/risques",        label: "Risques IA",          icon: <ShieldAlert className="w-4 h-4" /> },
];

const RACCOURCIS = [
  { href: "/operations/missions",       label: "Nouvelle mission",    icon: <Plus className="w-4 h-4" /> },
  { href: "/operations/planification",  label: "Planifier une équipe", icon: <Users className="w-4 h-4" /> },
  { href: "/operations/salles",         label: "Gérer les salles",    icon: <DoorOpen className="w-4 h-4" /> },
  { href: "/operations/devis",          label: "Créer un devis",      icon: <FilePlus2 className="w-4 h-4" /> },
];

function LogoBlock() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a6b7e, #7c5cff)" }} aria-hidden>
        ✦
      </span>
      <div>
        <div className="text-white font-extrabold text-[14.5px] tracking-tight leading-none flex items-center gap-1.5">
          Survéo
          <span className="text-[9px] font-extrabold text-white rounded px-1.5 py-0.5 tracking-[0.03em]" style={{ background: "#7c5cff" }}>IA</span>
        </div>
        <div className="text-[11px] text-[#8fa3b8] mt-1">Gestion des examens</div>
      </div>
    </div>
  );
}

export function OpsSidebar({ openIncidents = 0 }: { openIncidents?: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex print:!hidden w-[224px] flex-shrink-0 flex-col" style={{ background: "linear-gradient(180deg, #0F2942 0%, #0A1F33 100%)" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <LogoBlock />
      </div>

      {/* Nav */}
      <div className="px-4 text-[10px] font-bold uppercase tracking-[1.5px] text-[#5f7a94] mb-1.5">Navigation</div>
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {NAV.map((item) => {
          const active = isNavActive(pathname, item.href);
          const showBadge = item.href === "/operations/incidents" && openIncidents > 0;
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
              {showBadge ? (
                <span aria-label={`${openIncidents} incident(s) ouvert(s)`} className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {openIncidents > 9 ? "9+" : openIncidents}
                </span>
              ) : (
                active && <ChevronRight className="w-3.5 h-3.5 text-[#0d2137]/40" />
              )}
            </Link>
          );
        })}

        {/* Raccourcis */}
        <div className="px-1 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[1.5px] text-[#5f7a94]">Raccourcis</div>
        {RACCOURCIS.map((item) => (
          <Link
            key={`rac-${item.label}`}
            href={item.href}
            className="flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[12.5px] text-[#8fa3b8] hover:bg-white/[0.06] hover:text-[#d6e2ee] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span className="text-[#5f7a94]">{item.icon}</span>
            {item.label}
          </Link>
        ))}
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
