"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const mobileNavItems = [
  {
    href: "/dashboard",
    label: "Accueil",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-[28px] h-[28px]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" opacity={active ? 1 : 0.9} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 0.9} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" opacity={active ? 0.6 : 0.9} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" opacity={active ? 1 : 0.9} />
      </svg>
    ),
  },
  {
    href: "/qualification",
    label: "Prospects",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-[28px] h-[28px]">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/campagnes",
    label: "Campagnes",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-[28px] h-[28px]">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinejoin="round" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/planning",
    label: "Planning",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-[28px] h-[28px]">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" />
        {active && <rect x="7" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />}
        {active && <rect x="11" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />}
      </svg>
    ),
  },
  {
    href: "/livrables",
    label: "Livrables",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-[28px] h-[28px]">
        <polyline points="9 11 12 14 22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/parametres",
    label: "Réglages",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-[28px] h-[28px]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
      style={{ background: "#0d1e2e", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[76px]">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-[5px] text-[11.5px] font-semibold tracking-tight transition-colors relative ${
                active ? "text-[#4a90d9]" : "text-[#5a6e82]"
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] rounded-full bg-[#4a90d9]" />
              )}
              {item.icon(active)}
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col" style={{ background: "#0d1e2e" }}>
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

      {/* Sign out */}
      <div className="px-3.5 pb-2">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-[#7a8fa0] hover:text-red-400 hover:bg-white/[0.05] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
          </svg>
          Déconnexion
        </button>
      </div>

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
