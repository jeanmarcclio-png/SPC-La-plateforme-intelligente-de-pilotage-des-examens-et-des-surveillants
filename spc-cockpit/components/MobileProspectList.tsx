"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import type { Prospect } from "@/lib/types";
import { ProspectStatutSelect } from "@/components/ProspectCRM";
import { ProspectDrawer } from "@/components/ProspectDrawer";
import { AddProspectButton } from "@/components/AddProspectModal";

const niveauBg: Record<string, string> = {
  "Très chaud": "bg-red-100 text-red-700",
  "Chaud":      "bg-orange-100 text-orange-700",
  "Tiède":      "bg-yellow-100 text-yellow-700",
};

const SWIPE_REVEAL  = 76;  // px to reveal action buttons
const SWIPE_TRIGGER = 90;  // px to auto-trigger open drawer (swipe right)

// ─── Swipeable card ──────────────────────────────────────────────────────────
function SwipeableProspectCard({
  p,
  bantColor,
  onOpen,
  onQuickContact,
}: {
  p: Prospect;
  bantColor: string;
  onOpen: () => void;
  onQuickContact: () => void;
}) {
  const startX   = useRef(0);
  const moved    = useRef(false);
  const [offset, setOffset]   = useState(0);
  const [active, setActive]   = useState(false); // finger down

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    moved.current  = false;
    setActive(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > 4) moved.current = true;
    const clamped = dx > 0
      ? Math.min(dx * 0.55, SWIPE_REVEAL + 20)   // swipe right → reveal left
      : Math.max(dx * 0.55, -(SWIPE_REVEAL + 20)); // swipe left  → reveal right
    setOffset(clamped);
  }, []);

  const onTouchEnd = useCallback(() => {
    setActive(false);
    if (offset > SWIPE_TRIGGER) {
      // auto-open drawer
      setOffset(0);
      onOpen();
    } else if (offset > SWIPE_REVEAL / 2) {
      setOffset(SWIPE_REVEAL);  // snap open left panel
    } else if (offset < -(SWIPE_REVEAL / 2)) {
      setOffset(-SWIPE_REVEAL); // snap open right panel
    } else {
      setOffset(0);
    }
  }, [offset, onOpen]);

  const handleCardClick = useCallback(() => {
    if (moved.current) {
      // close any open reveal on tap if swiped
      if (offset !== 0) { setOffset(0); return; }
    }
    onOpen();
  }, [moved, offset, onOpen]);

  const isLeftOpen  = offset >= SWIPE_REVEAL / 2;
  const isRightOpen = offset <= -(SWIPE_REVEAL / 2);

  return (
    <div className="relative rounded-2xl overflow-hidden select-none">
      {/* Left panel: Voir fiche (revealed by swipe right) */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-[#1a6b7e] rounded-l-2xl"
        style={{ width: SWIPE_REVEAL }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOffset(0); onOpen(); }}
          className="flex flex-col items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
            className="w-5 h-5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">Fiche</span>
        </button>
      </div>

      {/* Right panel: Contacté quick action (revealed by swipe left) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-orange-400 rounded-r-2xl"
        style={{ width: SWIPE_REVEAL }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOffset(0); onQuickContact(); }}
          className="flex flex-col items-center gap-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
            className="w-5 h-5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.04 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 8 8l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23 18v-.08z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">En cours</span>
        </button>
      </div>

      {/* Card */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: active ? "none" : "transform 0.22s cubic-bezier(.25,.46,.45,.94)",
          willChange: "transform",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
        className={`bg-white rounded-2xl border shadow-sm p-4 relative z-10 cursor-pointer
          ${isLeftOpen ? "border-[#1a6b7e]/40" : isRightOpen ? "border-orange-200" : "border-gray-100"}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-gray-900 truncate">{p.nom}</div>
            <div className="text-[11px] text-gray-400">{p.segment} · {p.cluster}</div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${niveauBg[p.niveau] ?? "bg-gray-100 text-gray-500"}`}>
            {p.niveau}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-1">
            <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(p.scoreBANT / 10) * 100}%`, background: bantColor }} />
            </div>
            <span className="text-[13px] font-extrabold text-gray-800 min-w-[20px]">{p.scoreBANT}</span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <ProspectStatutSelect id={p.id} statut={p.statut} />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{p.action}</span>
          <span className="text-[11px] text-gray-300 flex items-center gap-1">
            <span className="text-[#1a6b7e]/40">←</span>
            <span>swipe</span>
            <span className="text-orange-300/80">→</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────
export function MobileProspectList({ prospects }: { prospects: Prospect[] }) {
  const [search, setSearch]   = useState("");
  const [segment, setSegment] = useState("");
  const [cluster, setCluster] = useState("");
  const [statut, setStatut]   = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [localProspects, setLocalProspects] = useState<Prospect[]>(prospects);

  const allProspects = localProspects.length ? localProspects : prospects;

  const segments = useMemo(() => [...new Set(allProspects.map(p => p.segment))].sort(), [allProspects]);
  const clusters = useMemo(() => [...new Set(allProspects.map(p => p.cluster).filter(Boolean))].sort(), [allProspects]);
  const statuts  = useMemo(() => [...new Set(allProspects.map(p => p.statut))].sort(), [allProspects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allProspects.filter((p) => {
      if (q && !p.nom.toLowerCase().includes(q) && !p.segment.toLowerCase().includes(q) && !p.cluster.toLowerCase().includes(q) && !p.statut.toLowerCase().includes(q)) return false;
      if (segment && p.segment !== segment) return false;
      if (cluster && p.cluster !== cluster) return false;
      if (statut  && p.statut  !== statut)  return false;
      return true;
    });
  }, [allProspects, search, segment, cluster, statut]);

  const activeFilters  = [segment, cluster, statut].filter(Boolean).length;
  const selectedIndex  = selected ? filtered.findIndex(p => p.id === selected.id) : -1;

  function clearAll() { setSearch(""); setSegment(""); setCluster(""); setStatut(""); }

  function handleUpdated(id: string, fields: Partial<Prospect>) {
    setLocalProspects((prev) => prev.map((p) => p.id === id ? { ...p, ...fields } : p));
    setSelected((prev) => prev?.id === id ? { ...prev, ...fields } : prev);
  }

  function handleQuickContact(p: Prospect) {
    handleUpdated(p.id, { statut: "En cours" });
  }

  return (
    <div className="space-y-3">
      {/* Ligne 1 : recherche + filtres + ajout */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/30 focus:border-[#1a6b7e]"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] leading-none">×</button>
          )}
        </div>

        {/* Bouton filtres */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[12.5px] font-semibold transition-colors ${filtersOpen || activeFilters > 0 ? "bg-[#1a6b7e] border-[#1a6b7e] text-white" : "bg-white border-gray-200 text-gray-600"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        <AddProspectButton />
      </div>

      {/* Ligne 2 : filtres dépliables */}
      {filtersOpen && (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Segment</div>
              <select value={segment} onChange={(e) => setSegment(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/30">
                <option value="">Tous</option>
                {segments.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Cluster</div>
              <select value={cluster} onChange={(e) => setCluster(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/30">
                <option value="">Tous</option>
                {clusters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Statut</div>
              <select value={statut} onChange={(e) => setStatut(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a6b7e]/30">
                <option value="">Tous</option>
                {statuts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button onClick={clearAll}
              className="w-full py-1.5 rounded-lg text-[12px] text-red-500 font-semibold hover:bg-red-50 transition-colors">
              Effacer les filtres ({activeFilters})
            </button>
          )}
        </div>
      )}

      {/* Chips filtres actifs */}
      {activeFilters > 0 && !filtersOpen && (
        <div className="flex items-center gap-2 flex-wrap">
          {segment && (
            <span className="flex items-center gap-1 bg-[#1a6b7e]/10 text-[#1a6b7e] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {segment}
              <button onClick={() => setSegment("")} className="text-[#1a6b7e]/60 hover:text-[#1a6b7e] ml-0.5">×</button>
            </span>
          )}
          {cluster && (
            <span className="flex items-center gap-1 bg-[#1a6b7e]/10 text-[#1a6b7e] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {cluster}
              <button onClick={() => setCluster("")} className="text-[#1a6b7e]/60 hover:text-[#1a6b7e] ml-0.5">×</button>
            </span>
          )}
          {statut && (
            <span className="flex items-center gap-1 bg-[#1a6b7e]/10 text-[#1a6b7e] text-[11px] font-semibold px-2.5 py-1 rounded-full">
              {statut}
              <button onClick={() => setStatut("")} className="text-[#1a6b7e]/60 hover:text-[#1a6b7e] ml-0.5">×</button>
            </span>
          )}
        </div>
      )}

      {/* Légende swipe */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-bold text-gray-900">
          {(search || activeFilters > 0)
            ? `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""}`
            : `Tous les prospects (${allProspects.length})`}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="text-[#1a6b7e]">←</span> fiche</span>
          <span className="flex items-center gap-1">en cours <span className="text-orange-400">→</span></span>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-[13px] text-gray-400 border border-gray-100">
          Aucun prospect ne correspond aux filtres.
        </div>
      ) : (
        filtered.map((p) => {
          const bantColor = p.scoreBANT >= 8 ? "#38a169" : p.scoreBANT >= 5 ? "#f6ad55" : "#fc8181";
          return (
            <SwipeableProspectCard
              key={p.id}
              p={p}
              bantColor={bantColor}
              onOpen={() => setSelected(p)}
              onQuickContact={() => handleQuickContact(p)}
            />
          );
        })
      )}

      {/* Drawer plein écran */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" onClick={() => setSelected(null)} />
          <ProspectDrawer
            key={selected.id}
            prospect={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            allProspects={filtered}
            currentIndex={selectedIndex}
            onNavigate={(p) => setSelected(p)}
          />
        </>
      )}
    </div>
  );
}
