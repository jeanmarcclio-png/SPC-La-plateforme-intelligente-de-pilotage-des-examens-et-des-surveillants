"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Euro, AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";

const ACCENT = "#6366f1";

const NAV = [
  { href: "/operations",              label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/operations/surveillants", label: "Surveillants",   icon: <Users className="w-4 h-4" />,        phase: 2 },
  { href: "/operations/missions",     label: "Missions",       icon: <Briefcase className="w-4 h-4" />,    phase: 3 },
  { href: "/operations/devis",        label: "Devis",          icon: <Euro className="w-4 h-4" />,         phase: 4 },
  { href: "/operations/incidents",    label: "Incidents",      icon: <AlertTriangle className="w-4 h-4" />, phase: 5 },
];

// Pages livrées progressivement — les entrées des phases à venir restent visibles
// mais inactives pour montrer la feuille de route sans créer de 404.
const LIVE_ROUTES = new Set(["/operations", "/operations/surveillants"]);

export function OpsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[224px] flex-shrink-0 flex-col" style={{ background: "#0b0d12" }}>
      {/* Logo */}
      <div className="px-[18px] py-[18px] pb-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight">
          <ShieldCheck className="w-4.5 h-4.5" style={{ color: ACCENT }} />
          SPC OPÉRATIONS
        </div>
        <div className="text-[10.5px] uppercase tracking-[1.8px] mt-1 text-[#7d81f2]">
          Pilotage examens
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 overflow-y-auto">
        {NAV.map((item) => {
          const live = LIVE_ROUTES.has(item.href);
          const active = pathname === item.href;
          if (!live) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] text-[#4d5261] cursor-default select-none"
                title={`Disponible en phase ${item.phase}`}
              >
                {item.icon}
                {item.label}
                <span className="ml-auto text-[9.5px] font-semibold uppercase tracking-wide border border-[#33374a] text-[#5d6275] rounded px-1.5 py-0.5">
                  P{item.phase}
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] transition-all border-l-[3px] ${
                active ? "text-white" : "text-[#8b90a3] border-transparent hover:bg-white/[0.05] hover:text-[#d4d7e5]"
              }`}
              style={active ? { borderColor: ACCENT, background: `${ACCENT}26` } : {}}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Retour cockpit commercial */}
      <div className="p-3.5 border-t border-white/[0.07]">
        <Link
          href="/cockpit"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-[#8b90a3] hover:text-white hover:bg-white/[0.05] transition-colors"
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
    <div className="md:hidden flex items-center justify-between px-4 py-3.5" style={{ background: "#0b0d12" }}>
      <div className="flex items-center gap-2 text-white font-extrabold text-[15px] tracking-tight">
        <ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} />
        SPC OPÉRATIONS
      </div>
      <Link href="/cockpit" className="flex items-center gap-1.5 text-[12px] text-[#8b90a3]">
        <ArrowLeft className="w-3.5 h-3.5" />
        Cockpit
      </Link>
    </div>
  );
}
