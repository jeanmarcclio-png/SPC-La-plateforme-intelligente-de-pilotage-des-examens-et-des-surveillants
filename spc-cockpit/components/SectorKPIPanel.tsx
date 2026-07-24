"use client";

import { useSectorConfig } from "@/lib/hooks/useSectorConfig";

/**
 * Panneau KPI sectoriel — rendu dans le langage « centre de pilotage »
 * (docs/pilot-design-system.md) : strip de stats dense en encre, filets fins,
 * la couleur ne sert qu'au sens. Aucune carte blanche / puce pastel.
 * S'affiche à l'intérieur du scope `.pilot`.
 */
function SectorKPIPanelSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-64 bg-gray-200 rounded mb-4" />
      <div className="grid gap-0" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[62px] border-t border-gray-100" />
        ))}
      </div>
    </div>
  );
}

const alertColor = (lvl: string) => (lvl === "urgent" ? "var(--crit)" : lvl === "warning" ? "var(--warn)" : "var(--amber)");

export function SectorKPIPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  if (!isReady) return <SectorKPIPanelSkeleton />;

  const { dashboard } = sectorPack;

  return (
    <div>
      <div className="sechd">
        <h2>{tenantConfig.emoji} {dashboard.headline}</h2>
        <span className="n">{dashboard.subline}</span>
      </div>

      {/* Stats denses — chiffres en encre, filets fins */}
      <div className="num" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 0, marginTop: 4 }}>
        {dashboard.kpis.map((kpi, i) => (
          <div key={i} style={{ padding: "14px 16px 14px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 25, fontWeight: 720, letterSpacing: "-.025em", lineHeight: 1, color: "var(--ink)" }}>{kpi.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink2)", marginTop: 6 }}>{kpi.label}</div>
            {kpi.subtext && <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 1 }}>{kpi.subtext}</div>}
          </div>
        ))}
      </div>

      {/* Alertes IA — signaux (dot = sens) */}
      {dashboard.aiAlerts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "9px 26px", marginTop: 16 }}>
          {dashboard.aiAlerts.map((alert, i) => (
            <span key={i} style={{ display: "flex", alignItems: "baseline", gap: 9, maxWidth: 430 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: alertColor(alert.level), transform: "translateY(-1px)", flex: "none" }} />
              <span style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.35 }}>{alert.text}</span>
            </span>
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
