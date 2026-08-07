"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [q, setQ] = useState("");
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
    <header className="hidden md:flex print:!hidden sticky top-0 z-30 h-[68px] flex-shrink-0 items-center gap-3 px-5 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
      {/* Recherche globale */}
      <div className="relative flex-1 max-w-[440px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder="Rechercher une mission, une salle, un surveillant…"
          aria-label="Rechercher une mission, une salle, un surveillant"
          className="w-full pl-10 pr-14 py-2.5 rounded-xl bg-slate-100/70 border border-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-200 focus:bg-white transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5 pointer-events-none">
          ⌘ K
        </kbd>
        {matches.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-40">
            {matches.map((m, i) => (
              <button
                key={m.href + i}
                onClick={() => { router.push(m.href); setQ(""); }}
                className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 text-left transition-colors"
              >
                <span>{m.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{m.kind}</span>
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
              className="flex items-center gap-2.5 h-11 pl-3 pr-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors max-w-[280px]"
            >
              <CalendarClock className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden />
              <span className="min-w-0 text-left">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.8px] text-slate-400 leading-none">Mission active</span>
                <span className="block text-[12.5px] font-semibold text-slate-800 truncate leading-tight mt-0.5">{activeMissionLabel}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
            </button>
            {missionOpen && missions.length > 0 && (
              <div role="menu" className="absolute right-0 top-[calc(100%+6px)] min-w-[300px] bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-40 py-1">
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Missions récentes</div>
                {missions.map((m) => (
                  <Link
                    key={m.id}
                    href={m.href}
                    role="menuitem"
                    onClick={() => setMissionOpen(false)}
                    className="flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{m.label}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{m.sub}</span>
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
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" aria-hidden />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-white">
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
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" aria-hidden />
        </button>

        {/* Profil */}
        <Link
          href="/moi"
          className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label={`Profil : ${userName}, ${roleLabel}`}
        >
          <span aria-hidden className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a6b7e] to-[#7c5cff] text-white text-[12px] font-bold flex items-center justify-center">
            {initials}
          </span>
          <span className="hidden lg:block text-left leading-tight">
            <span className="block text-[12.5px] font-bold text-slate-800 max-w-[130px] truncate">{userName}</span>
            <span className="block text-[11px] text-slate-400">{roleLabel}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
