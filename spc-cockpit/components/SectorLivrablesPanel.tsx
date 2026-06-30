"use client";

import { useSectorConfig } from "@/lib/hooks/useSectorConfig";

export function SectorLivrablesPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) return <div className="rounded-xl mb-4 h-[100px] bg-gray-100 animate-pulse" />;

  const { livrables } = sectorPack;

  return (
    <div
      className="rounded-xl border p-4 mb-4"
      style={{
        borderColor: `${tenantConfig.couleur}30`,
        background: `${tenantConfig.couleur}08`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{tenantConfig.emoji}</span>
        <span className="text-[13px] font-semibold" style={{ color: tenantConfig.couleur }}>
          Documents types — {tenantConfig.nom}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {livrables.map((livrable, i) => (
          <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg p-2.5 border border-gray-100">
            <span className="text-xl flex-shrink-0 mt-0.5">{livrable.icon}</span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-gray-800">{livrable.nom}</div>
              <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{livrable.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
