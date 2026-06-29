"use client";

import { useSectorConfig } from "@/lib/hooks/useSectorConfig";

export function SectorPlanningPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) return null;

  const { planning } = sectorPack;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{tenantConfig.emoji}</span>
        <span className="text-[13px] font-semibold text-gray-800">
          Agenda {tenantConfig.nom}
        </span>
      </div>
      {/* AI hint */}
      <div className="text-[12px] italic mb-3" style={{ color: tenantConfig.couleur }}>
        🧠 {planning.aiHint}
      </div>
      <div className="space-y-2">
        {planning.items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-2.5 rounded-xl border text-[12.5px] ${
              item.urgent ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="min-w-[44px] text-center flex-shrink-0">
              <div className={`text-[14px] font-extrabold ${item.urgent ? "text-red-600" : "text-gray-700"}`}>
                {item.date.split("/")[0]}/{item.date.split("/")[1]}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{item.nom}</div>
            </div>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: `${tenantConfig.couleur}15`,
                color: tenantConfig.couleur,
              }}
            >
              {item.tag}
            </span>
            {item.urgent && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                URGENT
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
