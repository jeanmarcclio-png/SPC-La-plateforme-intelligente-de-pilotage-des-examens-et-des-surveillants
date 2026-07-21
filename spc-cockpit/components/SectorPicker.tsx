"use client";

import { useState, useEffect } from "react";
import { SECTEURS_LISTE } from "@/lib/tenant/configs";
import { useTenant } from "@/lib/tenant/TenantContext";

const STORAGE_KEY = "jmc_secteur";

export function SectorPicker() {
  const { setSecteur } = useTenant();
  const [visible, setVisible]   = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (hydratation-safe)
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function confirm() {
    if (!selected) return;
    setSecteur(selected);
    setVisible(false);
  }

  // Produit vertical « examens » : un seul secteur → aucun choix à proposer.
  if (SECTEURS_LISTE.length <= 1) return null;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full md:max-w-lg mx-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-1.5 w-full" style={{ background: selected ? SECTEURS_LISTE.find(s => s.secteur === selected)?.couleur ?? "#1a6b7e" : "#1a6b7e" }} />

        <div className="px-5 pt-7 pb-6">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🚀</div>
            <h2 className="text-[20px] font-extrabold text-gray-900 mb-1">Choisissez votre secteur</h2>
            <p className="text-[13px] text-gray-400">
              Survéo s’adapte automatiquement à votre métier
            </p>
          </div>

          {/* Grid secteurs */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {SECTEURS_LISTE.map((cfg) => (
              <button
                key={cfg.secteur}
                onClick={() => setSelected(cfg.secteur)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all"
                style={{
                  borderColor: selected === cfg.secteur ? cfg.couleur : "#e2e8f0",
                  background:  selected === cfg.secteur ? `${cfg.couleur}12` : "white",
                }}
              >
                <span className="text-xl flex-shrink-0">{cfg.emoji}</span>
                <span className="text-[12px] font-semibold text-gray-700 leading-tight">{cfg.nom}</span>
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={confirm}
            disabled={!selected}
            className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold transition-opacity disabled:opacity-30"
            style={{ background: selected ? SECTEURS_LISTE.find(s => s.secteur === selected)?.couleur ?? "#1a6b7e" : "#1a6b7e" }}
          >
            {selected
              ? `Configurer pour ${SECTEURS_LISTE.find(s => s.secteur === selected)?.nom} →`
              : "Sélectionnez un secteur"}
          </button>

          <p className="text-center text-[11px] text-gray-300 mt-3">
            Modifiable à tout moment dans Paramètres
          </p>
        </div>
      </div>
    </div>
  );
}
