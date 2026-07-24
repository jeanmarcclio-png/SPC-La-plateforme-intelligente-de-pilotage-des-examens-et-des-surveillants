"use client";

import { useSectorConfig } from "@/lib/hooks/useSectorConfig";
import { Card } from "@/components/ui/card";

function SectorKPIPanelSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="rounded-2xl p-4 bg-gray-100 h-[60px]" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-[60px]" />
        ))}
      </div>
    </div>
  );
}

export function SectorKPIPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) return <SectorKPIPanelSkeleton />;

  const { dashboard } = sectorPack;

  return (
    <div className="space-y-3">
      {/* Headline banner */}
      <div
        className="rounded-2xl p-4"
        style={{ background: `linear-gradient(135deg, ${tenantConfig.couleur}18 0%, ${tenantConfig.couleur}08 100%)`, border: `1px solid ${tenantConfig.couleur}22` }}
      >
        <div className="text-[14px] font-bold" style={{ color: tenantConfig.couleur }}>{tenantConfig.emoji} {dashboard.headline}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{dashboard.subline}</div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {dashboard.kpis.map((kpi, i) => (
          <Card key={i} className="rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center text-base flex-shrink-0 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[17px] font-extrabold text-gray-900 leading-none">{kpi.value}</div>
              <div className="text-[11px] font-semibold text-gray-600 mt-0.5 truncate">{kpi.label}</div>
              {kpi.subtext && <div className="text-[10px] text-gray-400 truncate">{kpi.subtext}</div>}
            </div>
          </Card>
        ))}
      </div>

      {/* AI alerts */}
      {dashboard.aiAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.8px] mb-1">🧠 Alertes IA</div>
          {dashboard.aiAlerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 text-[12px] p-2 rounded-lg ${
              alert.level === "urgent" ? "bg-red-50 border border-red-100" :
              alert.level === "warning" ? "bg-orange-50 border border-orange-100" :
              "bg-yellow-50 border border-yellow-100"
            }`}>
              <span className="flex-shrink-0 mt-0.5">{alert.icon}</span>
              <span className={alert.level === "urgent" ? "text-red-700" : alert.level === "warning" ? "text-orange-700" : "text-yellow-700"}>
                {alert.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SectorKPIPanelMobile() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 bg-white/15 rounded-xl min-w-[90px] h-[72px]" />
        ))}
      </div>
    );
  }

  const { dashboard } = sectorPack;

  return (
    <div className="space-y-3">
      {/* Headline */}
      <div className="text-[13px] font-bold" style={{ color: tenantConfig.couleur }}>
        {tenantConfig.emoji} {dashboard.headline}
      </div>
      <div className="text-[11px] text-white/70 -mt-1">{dashboard.subline}</div>

      {/* KPIs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {dashboard.kpis.map((kpi, i) => (
          <div key={i} className="flex-shrink-0 bg-white/15 backdrop-blur-sm rounded-xl p-2.5 min-w-[90px] text-center">
            <div className="text-base">{kpi.icon}</div>
            <div className="text-[16px] font-extrabold text-white mt-0.5">{kpi.value}</div>
            <div className="text-[10px] text-white/70 leading-tight">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent alerts only on mobile */}
      {dashboard.aiAlerts.filter(a => a.level === "urgent").map((alert, i) => (
        <div key={i} className="flex items-start gap-2 bg-red-500/20 rounded-xl p-2.5 text-[11px]">
          <span>{alert.icon}</span>
          <span className="text-white/90">{alert.text}</span>
        </div>
      ))}
    </div>
  );
}
