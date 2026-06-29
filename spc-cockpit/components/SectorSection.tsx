"use client";

import { useTenant } from "@/lib/tenant/TenantContext";
import { SECTEURS_LISTE } from "@/lib/tenant/configs";

export function SectorSection({ cols = 2 }: { cols?: 2 | 5 }) {
  const { config, setSecteur } = useTenant();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="text-[13px] font-bold text-gray-800 mb-1">Secteur d'activité</div>
      <div className="text-[11px] text-gray-400 mb-3">
        JMC Cockpit adapte le vocabulaire, les KPIs et les emails à votre métier.
      </div>

      <div className={`grid gap-2 ${cols === 5 ? "grid-cols-5" : "grid-cols-2"}`}>
        {SECTEURS_LISTE.map((cfg) => (
          <button
            key={cfg.secteur}
            onClick={() => setSecteur(cfg.secteur)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-[12px] font-semibold"
            style={{
              borderColor: config.secteur === cfg.secteur ? cfg.couleur : "#e2e8f0",
              background:  config.secteur === cfg.secteur ? `${cfg.couleur}12` : "white",
              color:       config.secteur === cfg.secteur ? cfg.couleur : "#374151",
            }}
          >
            <span className="text-base">{cfg.emoji}</span>
            <span className="leading-tight">{cfg.nom}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-gray-300 text-center">
        Secteur actif : <strong style={{ color: config.couleur }}>{config.emoji} {config.nom}</strong>
      </div>
    </div>
  );
}
