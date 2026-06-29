"use client";

import { useState, useEffect } from "react";
import { calcJoursRestants } from "@/lib/utils/date";
import { Clock, LayoutGrid, FileText, TrendingUp, Activity, CalendarDays, BarChart2, Settings, Users, Megaphone, ClipboardCheck, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/cockpit",       label: "Cockpit Dirigeant",  icon: <Clock      className="w-4 h-4" /> },
  { href: "/dashboard",     label: "Tableau de bord",    icon: <LayoutGrid className="w-4 h-4" /> },
  { href: "/campagnes",     label: "Campagnes",          icon: <FileText   className="w-4 h-4" /> },
  { href: "/qualification", label: "Qualification BANT", icon: <TrendingUp className="w-4 h-4" /> },
];

const navItems2 = [
  { href: "/livrables",  label: "Livrables",  icon: <Activity      className="w-4 h-4" /> },
  { href: "/planning",   label: "Planning",   icon: <CalendarDays  className="w-4 h-4" /> },
  { href: "/reporting",  label: "Reporting",  icon: <BarChart2     className="w-4 h-4" /> },
  { href: "/parametres", label: "Paramètres", icon: <Settings      className="w-4 h-4" /> },
];

const mobileNavItems = [
  { href: "/dashboard",     label: "Accueil",    icon: (active: boolean) => <LayoutGrid     className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/cockpit",       label: "Cockpit",    icon: (active: boolean) => <Clock          className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/qualification", label: "Prospects",  icon: (active: boolean) => <Users          className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/campagnes",     label: "Campagnes",  icon: (active: boolean) => <Megaphone      className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/planning",      label: "Planning",   icon: (active: boolean) => <CalendarDays   className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/livrables",     label: "Livrables",  icon: (active: boolean) => <ClipboardCheck className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
  { href: "/parametres",    label: "Réglages",   icon: (active: boolean) => <Settings       className="w-[28px] h-[28px]" strokeWidth={active ? 2.2 : 1.8} /> },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]"
      style={{ background: "#0d1e2e", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-[76px] px-1">
        {mobileNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-[5px] text-[11px] font-semibold tracking-tight transition-colors relative min-w-0 ${
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

interface CampagneInfo {
  nom: string;
  nombreProspects: number;
  tresChaudes: number;
  joursRestants: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [campagne, setCampagne] = useState<CampagneInfo | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data } = await supabase.from("campagnes")
          .select("nom, nombre_prospects, tres_chaudes, jours_restants, statut, deadline")
          .in("statut", ["Actif", "En cours"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (!data) return;
        const joursRestants = data.deadline
          ? calcJoursRestants(data.deadline)
          : (data.jours_restants ?? 0);
        setCampagne({
          nom: data.nom,
          nombreProspects: data.nombre_prospects ?? 0,
          tresChaudes: data.tres_chaudes ?? 0,
          joursRestants,
        });
      } catch { /* sidebar reste en état null — pas bloquant */ }
    })();
  }, []);

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
          JMC COCKPIT
        </div>
        <div className="text-[11px] text-[#4a90d9] uppercase tracking-[1.5px] mt-0.5 pl-4">
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
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          Déconnexion
        </button>
      </div>

      {/* Campaign info */}
      <div className="p-3.5 border-t border-white/[0.08]">
        <div className="text-[11px] text-[#4a90d9] uppercase tracking-[1px] mb-1.5">
          Campagne active
        </div>
        <div className="text-[13px] font-semibold text-[#e2e8f0] leading-snug">
          {campagne?.nom ?? "—"}
        </div>
        <div className="text-[11px] text-[#8899aa] mt-0.5">
          {campagne ? `${campagne.nombreProspects} établissements · ${campagne.tresChaudes} Très chaud` : "Chargement…"}
        </div>
        {campagne && (
          <div className="mt-2.5 bg-[#4a90d9]/[0.12] rounded-lg p-2 text-center">
            <div className="text-2xl font-extrabold text-[#4a90d9] leading-none">J - {campagne.joursRestants}</div>
            <div className="text-[11px] text-[#8899aa] mt-0.5">Fin Vague 1</div>
          </div>
        )}
      </div>
    </aside>
  );
}
