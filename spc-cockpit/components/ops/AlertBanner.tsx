"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Taxonomie d'alertes unifiée (C1) — 4 niveaux de criticité visuellement
 * distincts, triés par priorité. Présentationnel : le CTA est un lien (href),
 * pas un callback, pour rester utilisable depuis un Server Component.
 */
export type AlertLevel = "BLOCANT" | "WARNING" | "INFO" | "SUCCESS";

export interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const STYLE: Record<AlertLevel, { bg: string; text: string; badge: string; ring: string; rank: number }> = {
  BLOCANT: { bg: "#fee2e2", text: "#b91c1c", badge: "🚨", ring: "rgba(185,28,28,.18)", rank: 0 },
  WARNING: { bg: "#fef3c7", text: "#b45309", badge: "⚡", ring: "rgba(180,83,9,.18)", rank: 1 },
  INFO: { bg: "#dbeafe", text: "#1d4ed8", badge: "ℹ️", ring: "rgba(29,78,216,.18)", rank: 2 },
  SUCCESS: { bg: "#d1fae5", text: "#047857", badge: "✓", ring: "rgba(4,120,87,.18)", rank: 3 },
};

export function AlertBanner({
  alerts,
  maxVisible = 3,
  onDismiss,
}: {
  alerts: AlertItem[];
  maxVisible?: number;
  onDismiss?: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // SUCCESS : auto-dismiss après 3 s.
  useEffect(() => {
    const timers = alerts
      .filter((a) => a.level === "SUCCESS" && !dismissed.has(a.id))
      .map((a) => setTimeout(() => setDismissed((prev) => new Set(prev).add(a.id)), 3000));
    return () => timers.forEach(clearTimeout);
  }, [alerts, dismissed]);

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
    onDismiss?.(id);
  }

  const visible = alerts
    .filter((a) => !dismissed.has(a.id))
    .sort((a, b) => STYLE[a.level].rank - STYLE[b.level].rank);
  if (visible.length === 0) return null;

  const shown = visible.slice(0, maxVisible);
  const overflow = visible.length - shown.length;

  return (
    <div className="mb-5 space-y-2">
      {shown.map((a) => {
        const s = STYLE[a.level];
        return (
          <div
            key={a.id}
            role={a.level === "BLOCANT" ? "alert" : "status"}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset"
            style={{ background: s.bg, color: s.text, boxShadow: `inset 0 0 0 1px ${s.ring}` }}
          >
            <span aria-hidden className="text-[15px] leading-none shrink-0">{s.badge}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold truncate">{a.title}</div>
              {a.description && <div className="text-[12px] opacity-80 truncate">{a.description}</div>}
            </div>
            {a.ctaLabel && a.ctaHref && (
              <a
                href={a.ctaHref}
                className="shrink-0 text-[12.5px] font-bold underline-offset-2 hover:underline"
                style={{ color: s.text }}
              >
                {a.ctaLabel} →
              </a>
            )}
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              aria-label="Masquer cette alerte"
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="text-[11.5px] text-gray-400 pl-1">+ {overflow} autre{overflow > 1 ? "s" : ""} alerte{overflow > 1 ? "s" : ""}</div>
      )}
    </div>
  );
}
