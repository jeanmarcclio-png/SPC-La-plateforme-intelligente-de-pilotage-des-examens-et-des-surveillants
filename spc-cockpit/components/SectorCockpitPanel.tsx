"use client";

import { useSectorConfig } from "@/lib/hooks/useSectorConfig";

export function SectorCockpitPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) return null;

  const { cockpit } = sectorPack;

  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: `linear-gradient(135deg, #0d1e2e 0%, #1a3a52 60%, ${tenantConfig.couleur} 100%)`,
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl flex-shrink-0">{tenantConfig.emoji}</span>
        <div>
          <div className="text-[18px] font-extrabold text-white leading-tight">{cockpit.headline}</div>
          <div className="text-[12.5px] text-white/70 mt-1">{cockpit.subline}</div>
        </div>
      </div>

      <div className="bg-white/[0.08] rounded-xl p-3.5 mb-4 border border-white/[0.12]">
        <div className="text-[11px] uppercase tracking-[1.2px] mb-1.5 font-semibold" style={{ color: tenantConfig.couleur }}>
          📈 Prévision IA
        </div>
        <div className="text-[12.5px] text-white/80 leading-relaxed">{cockpit.forecast}</div>
      </div>

      {cockpit.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cockpit.actions.map((action, i) => (
            <span
              key={i}
              className="text-[12px] font-semibold bg-white/[0.12] text-white/90 px-3 py-1.5 rounded-full border border-white/[0.15]"
            >
              {i + 1}. {action}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
