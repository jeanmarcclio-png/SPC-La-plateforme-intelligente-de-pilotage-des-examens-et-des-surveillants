"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, LayoutGrid, Clock, FileText, CalendarDays, ClipboardCheck, TrendingUp } from "lucide-react";

const CACHED_ROUTES = [
  { href: "/dashboard",     label: "Tableau de bord",    icon: LayoutGrid },
  { href: "/cockpit",       label: "Cockpit Dirigeant",  icon: Clock },
  { href: "/campagnes",     label: "Campagnes",          icon: FileText },
  { href: "/qualification", label: "Qualification BANT", icon: TrendingUp },
  { href: "/planning",      label: "Planning",           icon: CalendarDays },
  { href: "/livrables",     label: "Livrables",          icon: ClipboardCheck },
];

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1)  return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24)   return `il y a ${diffH}h`;
  return `il y a ${Math.round(diffH / 24)}j`;
}

export default function OfflinePage() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [available, setAvailable] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("spc_last_sync");
    if (stored) setLastSync(formatRelative(new Date(stored)));

    if ("caches" in window) {
      caches.keys().then(async (keys) => {
        const cached: string[] = [];
        for (const key of keys) {
          const cache = await caches.open(key);
          const requests = await cache.keys();
          const urls = requests.map((r) => new URL(r.url).pathname);
          for (const route of CACHED_ROUTES) {
            if (urls.some((u) => u === route.href || u.startsWith(route.href + "?")) && !cached.includes(route.href)) {
              cached.push(route.href);
            }
          }
        }
        setAvailable(cached);
      }).catch(() => {});
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "#0d1e2e" }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1a3a4e" }}>
        <WifiOff className="w-8 h-8 text-white" />
      </div>

      <div>
        <div className="text-[22px] font-extrabold text-white mb-2">Hors connexion</div>
        <div className="text-[14px] text-[#7a8fa0] leading-relaxed max-w-[280px]">
          Vérifiez votre connexion réseau. Les pages visitées récemment sont accessibles ci-dessous.
        </div>
        {lastSync && (
          <div className="mt-2 text-[12px] text-[#4a90d9]">
            Dernière synchronisation {lastSync}
          </div>
        )}
      </div>

      {available.length > 0 && (
        <div className="w-full max-w-[300px]">
          <div className="text-[11px] text-[#5a6e82] uppercase tracking-[1px] mb-2 text-left">
            Pages disponibles hors ligne
          </div>
          <div className="flex flex-col gap-1">
            {CACHED_ROUTES.filter((r) => available.includes(r.href)).map((route) => {
              const Icon = route.icon;
              return (
                <a
                  key={route.href}
                  href={route.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium text-[#c8d8e8] transition-colors"
                  style={{ background: "#1a3a4e" }}
                >
                  <Icon className="w-4 h-4 text-[#4a90d9] flex-shrink-0" />
                  {route.label}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold text-white transition-opacity active:opacity-80"
        style={{ background: "#1a6b7e" }}
      >
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  );
}
