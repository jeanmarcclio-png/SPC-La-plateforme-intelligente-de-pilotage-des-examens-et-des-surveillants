"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/campagnes",
    label: "Campagnes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/qualification",
    label: "Qualification BANT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <circle cx="12" cy="12" r="10" /><polyline points="16 12 12 8 8 12" /><line x1="12" y1="16" x2="12" y2="8" />
      </svg>
    ),
  },
];

const navItems2 = [
  {
    href: "/livrables",
    label: "Livrables",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/planning",
    label: "Planning",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/reporting",
    label: "Reporting",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: "/parametres",
    label: "Paramètres",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: "#0d1e2e" }}>
      {/* Logo */}
      <div className="px-[18px] py-[18px] pb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 text-white font-extrabold text-base tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#4a90d9] flex-shrink-0" />
          SPC COCKPIT
        </div>
        <div className="text-[10px] text-[#4a90d9] uppercase tracking-[1.5px] mt-0.5 pl-4">
          Prospection B2B
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] transition-all border-l-[3px] ${
                active
                  ? "bg-[#4a90d9]/[0.13] text-white border-[#4a90d9]"
                  : "text-[#7a8fa0] border-transparent hover:bg-white/[0.05] hover:text-[#c8d8e8]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 mx-0 h-px bg-white/[0.06]" />

        {navItems2.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] transition-all border-l-[3px] ${
                active
                  ? "bg-[#4a90d9]/[0.13] text-white border-[#4a90d9]"
                  : "text-[#7a8fa0] border-transparent hover:bg-white/[0.05] hover:text-[#c8d8e8]"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Campaign info */}
      <div className="p-3.5 border-t border-white/[0.08]">
        <div className="text-[10px] text-[#4a90d9] uppercase tracking-[1px] mb-1.5">
          Campagne active
        </div>
        <div className="text-[13px] font-semibold text-[#e2e8f0] leading-snug">
          IDF Complète 2026
        </div>
        <div className="text-[11px] text-[#8899aa] mt-0.5">
          43 établissements · 14 Très chaud
        </div>
        <div className="mt-2.5 bg-[#4a90d9]/[0.12] rounded-lg p-2 text-center">
          <div className="text-2xl font-extrabold text-[#4a90d9] leading-none">J - 8</div>
          <div className="text-[11px] text-[#8899aa] mt-0.5">Fin Vague 1</div>
        </div>
      </div>
    </aside>
  );
}
