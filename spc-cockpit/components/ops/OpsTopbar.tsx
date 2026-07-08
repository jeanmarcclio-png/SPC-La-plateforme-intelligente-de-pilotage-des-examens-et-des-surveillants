"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ops/Button";
import { NAV } from "./OpsSidebar";

// Topbar Opérations — hauteur fixe 64px, recherche de navigation,
// accès au centre d'alertes (Cockpit) et création de devis.
export function OpsTopbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return NAV.filter((n) => n.label.toLowerCase().includes(s)).slice(0, 5);
  }, [q]);

  function go() {
    if (matches.length > 0) {
      router.push(matches[0].href);
      setQ("");
    }
  }

  return (
    <header className="hidden md:flex print:!hidden sticky top-0 z-30 h-16 flex-shrink-0 items-center gap-4 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      <div className="relative flex-1 max-w-[560px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
            if (e.key === "Escape") setQ("");
          }}
          placeholder="Rechercher une page — missions, devis, salles…"
          aria-label="Rechercher une page du module Opérations"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100/70 border border-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-200 focus:bg-white transition-all"
        />
        {matches.length > 0 && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {matches.map((m) => (
              <button
                key={m.href}
                onClick={() => { router.push(m.href); setQ(""); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                <span className="text-gray-400">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/operations/cockpit"
          title="Centre d'alertes — Cockpit opérationnel"
          aria-label="Ouvrir le centre d'alertes"
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" aria-hidden />
        </Link>
        <ButtonLink href="/operations/devis" variant="primary">
          <Plus className="w-4 h-4" aria-hidden />
          Nouveau devis
        </ButtonLink>
      </div>
    </header>
  );
}
