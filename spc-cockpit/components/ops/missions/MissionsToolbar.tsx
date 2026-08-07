"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { MISSION_STATUTS } from "@/lib/operations/mission-status";
import {
  FILTRES_VIDES, filtresActifs, nbFiltresAvances, type FiltresMissions,
} from "@/lib/operations/missions-filtres";
import { TYPES_EXAMEN } from "./MissionForm";

// Barre de recherche, statut, période, filtres avancés et création (§13).
// La recherche est debouncée (220 ms) pour rester fluide sur un gros volume.

const champ =
  "min-h-[40px] px-3 rounded-xl bg-white border border-[#E3E8F1] text-[12.5px] text-[#11182D] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300";

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#64708A] mb-1">{label}</label>
      {children}
    </div>
  );
}

export function MissionsToolbar({
  filtres,
  onChange,
  clients,
  onNouvelle,
  nbResultats,
  nbTotal,
}: {
  filtres: FiltresMissions;
  onChange: (f: FiltresMissions) => void;
  clients: string[];
  onNouvelle: () => void;
  nbResultats: number;
  nbTotal: number;
}) {
  const [recherche, setRecherche] = useState(filtres.recherche);
  const [panneau, setPanneau] = useState(false);
  const popover = useRef<HTMLDivElement>(null);

  // Debounce de la saisie — la valeur remonte au parent après 220 ms.
  useEffect(() => {
    const t = setTimeout(() => {
      if (recherche !== filtres.recherche) onChange({ ...filtres, recherche });
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  useEffect(() => {
    if (!panneau) return;
    function dehors(e: MouseEvent) {
      if (!popover.current?.contains(e.target as Node)) setPanneau(false);
    }
    function echap(e: KeyboardEvent) {
      if (e.key === "Escape") setPanneau(false);
    }
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [panneau]);

  const set = (patch: Partial<FiltresMissions>) => onChange({ ...filtres, ...patch });
  const nbAvances = nbFiltresAvances(filtres);
  const actifs = filtresActifs(filtres);

  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8D97AA]" aria-hidden />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une mission, un client…"
            aria-label="Rechercher une mission par référence, client, session ou type"
            className={`${champ} w-full pl-9`}
          />
        </div>

        <select
          value={filtres.statut}
          onChange={(e) => set({ statut: e.target.value })}
          aria-label="Filtrer par statut"
          className={champ}
        >
          <option value="">Tous statuts</option>
          {MISSION_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-1.5 bg-white border border-[#E3E8F1] rounded-xl px-3 min-h-[40px]">
          <CalendarRange className="w-4 h-4 text-[#8D97AA] flex-shrink-0" aria-hidden />
          <input
            type="date"
            value={filtres.du}
            onChange={(e) => set({ du: e.target.value })}
            aria-label="Période — date de début"
            className="text-[12.5px] text-[#11182D] bg-transparent focus:outline-none w-[120px]"
          />
          <span className="text-[#8D97AA]" aria-hidden>–</span>
          <input
            type="date"
            value={filtres.au}
            onChange={(e) => set({ au: e.target.value })}
            aria-label="Période — date de fin"
            className="text-[12.5px] text-[#11182D] bg-transparent focus:outline-none w-[120px]"
          />
        </div>

        <div className="relative" ref={popover}>
          <button
            type="button"
            onClick={() => setPanneau((v) => !v)}
            aria-expanded={panneau}
            aria-haspopup="dialog"
            className={`${champ} inline-flex items-center gap-1.5 font-semibold ${nbAvances ? "!border-indigo-300 !text-[#4F46F5] bg-[#ECEBFF]" : ""}`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
            Filtres
            {nbAvances > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#4F46F5] text-white text-[10px] font-bold flex items-center justify-center">
                {nbAvances}
              </span>
            )}
          </button>

          {panneau && (
            <div
              role="dialog"
              aria-label="Filtres avancés"
              className="absolute right-0 top-[calc(100%+6px)] z-30 w-[292px] bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_8px_24px_rgba(15,34,68,0.10)] p-4 space-y-3"
            >
              <Champ label="Client">
                <select value={filtres.client} onChange={(e) => set({ client: e.target.value })} className={`${champ} w-full`}>
                  <option value="">Tous les clients</option>
                  {clients.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Champ>
              <Champ label="Type d'épreuve">
                <select value={filtres.type} onChange={(e) => set({ type: e.target.value })} className={`${champ} w-full`}>
                  <option value="">Tous les types</option>
                  {TYPES_EXAMEN.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Champ>
              <div className="grid grid-cols-2 gap-2.5">
                <Champ label="Montant HT min">
                  <input type="number" min="0" value={filtres.montantMin} onChange={(e) => set({ montantMin: e.target.value })} className={`${champ} w-full`} />
                </Champ>
                <Champ label="Montant HT max">
                  <input type="number" min="0" value={filtres.montantMax} onChange={(e) => set({ montantMax: e.target.value })} className={`${champ} w-full`} />
                </Champ>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Champ label="Couverture ≤ (%)">
                  <input type="number" min="0" max="100" value={filtres.couvertureMax} onChange={(e) => set({ couvertureMax: e.target.value })} className={`${champ} w-full`} />
                </Champ>
                <Champ label="Salles ≥">
                  <input type="number" min="0" value={filtres.sallesMin} onChange={(e) => set({ sallesMin: e.target.value })} className={`${champ} w-full`} />
                </Champ>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-[#11182D] min-h-[40px]">
                <input
                  type="checkbox"
                  checked={filtres.avecAlertes}
                  onChange={(e) => set({ avecAlertes: e.target.checked })}
                  className="w-4 h-4 rounded border-[#E3E8F1] accent-[#4F46F5]"
                />
                Uniquement les missions en sous-effectif
              </label>
              <button
                type="button"
                onClick={() => onChange({ ...FILTRES_VIDES, recherche: filtres.recherche, statut: filtres.statut, du: filtres.du, au: filtres.au })}
                className="w-full min-h-[40px] rounded-xl border border-[#E3E8F1] text-[12.5px] font-semibold text-[#64708A] hover:bg-slate-50 transition-colors"
              >
                Effacer les filtres avancés
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onNouvelle}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-4 rounded-xl text-white text-[12.5px] font-semibold shadow-sm bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Nouvelle mission
        </button>
      </div>

      {actifs && (
        <div className="flex items-center gap-2 mt-2">
          <p className="text-[11.5px] text-[#64708A]" aria-live="polite">
            {nbResultats} mission{nbResultats > 1 ? "s" : ""} sur {nbTotal} affichée{nbResultats > 1 ? "s" : ""}.
          </p>
          <button
            type="button"
            onClick={() => { setRecherche(""); onChange(FILTRES_VIDES); }}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#4F46F5] hover:text-[#3730c9] transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
