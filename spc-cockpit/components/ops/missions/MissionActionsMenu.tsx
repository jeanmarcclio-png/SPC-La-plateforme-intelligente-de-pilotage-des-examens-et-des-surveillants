"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Copy, Download, MoreVertical, PackageCheck, Trash2 } from "lucide-react";
import type { Mission, StatutMission } from "@/lib/operations/types";
import { allowedTransitions } from "@/lib/operations/mission-status";

// Menu secondaire d'une ligne de mission (§14.4).
// La suppression y est reléguée : plus de gros bouton rouge sur chaque ligne.
// Les changements de statut proposés respectent les transitions autorisées du
// cycle de vie — on ne propose jamais une action que le métier refuse.

export function MissionActionsMenu({
  mission,
  onDupliquer,
  onStatut,
  onExporter,
  onSupprimer,
}: {
  mission: Mission;
  onDupliquer: () => void;
  onStatut: (statut: StatutMission) => void;
  onExporter: () => void;
  onSupprimer: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function dehors(e: MouseEvent) {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    }
    function echap(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const transitions = allowedTransitions(mission.statut);
  const item =
    "w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-[#11182D] hover:bg-slate-50 transition-colors text-left";

  return (
    <div className="relative" ref={conteneur}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={`Autres actions pour la mission ${mission.reference}`}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8D97AA] hover:text-[#11182D] hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <MoreVertical className="w-4 h-4" aria-hidden />
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-30 w-[196px] bg-white rounded-xl border border-[#E3E8F1] shadow-[0_8px_24px_rgba(15,34,68,0.10)] overflow-hidden py-1"
        >
          <button role="menuitem" className={item} onClick={() => { setOuvert(false); onDupliquer(); }}>
            <Copy className="w-3.5 h-3.5 text-[#8D97AA]" aria-hidden />
            Dupliquer
          </button>
          {transitions.includes("Terminée") && (
            <button role="menuitem" className={item} onClick={() => { setOuvert(false); onStatut("Terminée"); }}>
              <PackageCheck className="w-3.5 h-3.5 text-[#13B979]" aria-hidden />
              Clôturer la mission
            </button>
          )}
          {transitions.includes("Archivée") && (
            <button role="menuitem" className={item} onClick={() => { setOuvert(false); onStatut("Archivée"); }}>
              <Archive className="w-3.5 h-3.5 text-[#8D97AA]" aria-hidden />
              Archiver
            </button>
          )}
          <button role="menuitem" className={item} onClick={() => { setOuvert(false); onExporter(); }}>
            <Download className="w-3.5 h-3.5 text-[#8D97AA]" aria-hidden />
            Exporter (CSV)
          </button>
          <div className="my-1 border-t border-[#EDF0F5]" />
          <button role="menuitem" className={`${item} !text-[#FF3E4D] hover:bg-rose-50`} onClick={() => { setOuvert(false); onSupprimer(); }}>
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            Supprimer…
          </button>
        </div>
      )}
    </div>
  );
}
