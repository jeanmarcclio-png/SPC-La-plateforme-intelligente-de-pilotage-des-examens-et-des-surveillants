"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, CalendarClock, ChevronDown, Check } from "lucide-react";
import { NAV } from "./OpsSidebar";
import { OrgSwitcher, type OrgOption } from "./OrgSwitcher";

export interface MissionOption {
  id: number;
  label: string;
  sub: string;
  href: string;
  active?: boolean;
}

// Topbar Opérations — recherche globale (⌘K), sélecteur de mission active,
// notifications, aide, profil. Hauteur fixe, sticky.
export function OpsTopbar({
  orgs = [],
  activeOrgId = null,
  missions = [],
  activeMissionLabel = null,
  userName = "Utilisateur SPC",
  roleLabel = "Administrateur",
  notifCount = 0,
}: {
  orgs?: OrgOption[];
  activeOrgId?: string | null;
  missions?: MissionOption[];
  activeMissionLabel?: string | null;
  userName?: string;
  roleLabel?: string;
  notifCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  // Le cockpit des demandes clients est rendu en thème Dark Graphite : la
  // topbar s'aligne sur cette route pour éviter un bandeau blanc au-dessus
  // d'une page sombre. Toutes les autres pages Opérations restent claires.
  const sombre = pathname?.startsWith("/operations/demandes-client") ?? false;
  const cx = (clair: string, fonce: string) => (sombre ? fonce : clair);
  const [missionOpen, setMissionOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const nav = NAV.filter((n) => n.label.toLowerCase().includes(s)).map((n) => ({ label: n.label, href: n.href, kind: "Page" as const }));
    const miss = missions.filter((m) => m.label.toLowerCase().includes(s)).map((m) => ({ label: m.label, href: m.href, kind: "Mission" as const }));
    return [...miss, ...nav].slice(0, 6);
  }, [q, missions]);

  // Raccourci clavier ⌘K / Ctrl K → focus recherche. Échap → fermer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQ("");
        setMissionOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fermeture du menu mission au clic extérieur.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (missionRef.current && !missionRef.current.contains(e.target as Node)) setMissionOpen(false);
    }
    if (missionOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [missionOpen]);

  function go() {
    if (matches.length > 0) {
      router.push(matches[0].href);
      setQ("");
    }
  }

  const initials = userName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "SP";

  return (
    <header className={`hidden md:flex print:!hidden sticky top-0 z-30 h-[68px] flex-shrink-0 items-center gap-3 px-5 backdrop-blur-md border-b ${cx("bg-white/90 border-slate-200/70", "bg-[#071522]/95 border-[rgba(148,163,184,0.14)]")}`}>
      {/* Recherche globale */}
      <div className="relative flex-1 max-w-[440px]">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${cx("text-slate-400", "text-[#647386]")}`} aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder="Rechercher une mission, une salle, un surveillant…"
          aria-label="Rechercher une mission, une salle, un surveillant"
          className={`w-full pl-10 pr-14 py-2.5 rounded-xl border text-[13px] focus:outline-none focus:ring-2 transition-all ${cx("bg-slate-100/70 border-transparent text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/25 focus:border-blue-200 focus:bg-white", "bg-[#0B1926] border-[rgba(148,163,184,0.14)] text-[#F6F8FC] placeholder:text-[#647386] focus:ring-[#735DFF]/40 focus:border-[#735DFF]")}`}
        />
        <kbd className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold border rounded px-1.5 py-0.5 pointer-events-none ${cx("text-slate-400 bg-white border-slate-200", "text-[#7E8C9F] bg-[#102231] border-[rgba(148,163,184,0.22)]")}`}>
          ⌘ K
        </kbd>
        {matches.length > 0 && (
          <div className={`absolute top-[calc(100%+6px)] left-0 right-0 rounded-xl border shadow-lg overflow-hidden z-40 ${cx("bg-white border-slate-200", "bg-[#102231] border-[rgba(148,163,184,0.22)]")}`}>
            {matches.map((m, i) => (
              <button
                key={m.href + i}
                onClick={() => { router.push(m.href); setQ(""); }}
                className={`w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] text-left transition-colors ${cx("text-slate-700 hover:bg-slate-50", "text-[#B4BECC] hover:bg-[rgba(255,255,255,.05)]")}`}
              >
                <span>{m.label}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${cx("text-slate-400", "text-[#647386]")}`}>{m.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Sélecteur de mission active */}
        {activeMissionLabel && (
          <div className="relative" ref={missionRef}>
            <button
              type="button"
              onClick={() => setMissionOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={missionOpen}
              className={`flex items-center gap-2.5 h-11 pl-3 pr-2.5 rounded-xl border transition-colors max-w-[280px] ${cx("border-slate-200 bg-white hover:bg-slate-50", "border-[rgba(148,163,184,0.18)] bg-[#0B1926] hover:bg-[#12283A]")}`}
            >
              <CalendarClock className={`w-4 h-4 flex-shrink-0 ${cx("text-blue-600", "text-[#2496FF]")}`} aria-hidden />
              <span className="min-w-0 text-left">
                <span className={`block text-[9.5px] font-bold uppercase tracking-[0.8px] leading-none ${cx("text-slate-400", "text-[#7E8C9F]")}`}>Mission active</span>
                <span className={`block text-[12.5px] font-semibold truncate leading-tight mt-0.5 ${cx("text-slate-800", "text-[#F6F8FC]")}`}>{activeMissionLabel}</span>
              </span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 ${cx("text-slate-400", "text-[#7E8C9F]")}`} aria-hidden />
            </button>
            {missionOpen && missions.length > 0 && (
              <div role="menu" className={`absolute right-0 top-[calc(100%+6px)] min-w-[300px] rounded-xl border shadow-lg overflow-hidden z-40 py-1 ${cx("bg-white border-slate-200", "bg-[#102231] border-[rgba(148,163,184,0.22)]")}`}>
                <div className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide ${cx("text-slate-400", "text-[#647386]")}`}>Missions récentes</div>
                {missions.map((m) => (
                  <Link
                    key={m.id}
                    href={m.href}
                    role="menuitem"
                    onClick={() => setMissionOpen(false)}
                    className={`flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${cx("text-slate-700 hover:bg-slate-50", "text-[#B4BECC] hover:bg-[rgba(255,255,255,.05)]")}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{m.label}</span>
                      <span className={`block text-[11px] truncate ${cx("text-slate-400", "text-[#647386]")}`}>{m.sub}</span>
                    </span>
                    {m.active && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden />}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {orgs.length > 1 && <OrgSwitcher orgs={orgs} activeId={activeOrgId} />}

        {/* Notifications */}
        <Link
          href="/operations/cockpit"
          title="Centre d'alertes — Cockpit opérationnel"
          aria-label={`Centre d'alertes${notifCount ? ` — ${notifCount} en attente` : ""}`}
          className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${cx("text-slate-500 hover:text-slate-800 hover:bg-slate-100", "text-[#7E8C9F] hover:text-[#F6F8FC] hover:bg-[rgba(255,255,255,.06)]")}`}
        >
          <Bell className="w-[18px] h-[18px]" aria-hidden />
          {notifCount > 0 && (
            <span className={`absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center border-2 ${cx("bg-rose-500 border-white", "bg-[#FF3F55] border-[#071522]")}`}>
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </Link>

        {/* Aide (focus recherche) */}
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          title="Aide — rechercher (⌘K)"
          aria-label="Aide"
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${cx("text-slate-500 hover:text-slate-800 hover:bg-slate-100", "text-[#7E8C9F] hover:text-[#F6F8FC] hover:bg-[rgba(255,255,255,.06)]")}`}
        >
          <HelpCircle className="w-[18px] h-[18px]" aria-hidden />
        </button>

        {/* Profil */}
        <Link
          href="/moi"
          className={`flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl transition-colors ${cx("hover:bg-slate-100", "hover:bg-[rgba(255,255,255,.06)]")}`}
          aria-label={`Profil : ${userName}, ${roleLabel}`}
        >
          <span aria-hidden className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a6b7e] to-[#7c5cff] text-white text-[12px] font-bold flex items-center justify-center">
            {initials}
          </span>
          <span className="hidden lg:block text-left leading-tight">
            <span className={`block text-[12.5px] font-bold max-w-[130px] truncate ${cx("text-slate-800", "text-[#F6F8FC]")}`}>{userName}</span>
            <span className={`block text-[11px] ${cx("text-slate-400", "text-[#7E8C9F]")}`}>{roleLabel}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
