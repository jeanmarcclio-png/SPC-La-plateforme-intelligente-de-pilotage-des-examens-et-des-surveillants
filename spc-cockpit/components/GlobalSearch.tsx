"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { searchAll, type SearchResults } from "@/app/actions/search";

const BANT_COLOR = (s: number) => s >= 8 ? "#38a169" : s >= 5 ? "#f6ad55" : "#fc8181";

export function GlobalSearch() {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<SearchResults | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router    = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    function onSearchOpen() { setOpen(true); }
    window.addEventListener("search:open", onSearchOpen);
    return () => window.removeEventListener("search:open", onSearchOpen);
  }, []);

  const handleQuery = useCallback((q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setResults(null); return; }
    timerRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchAll(q);
        setResults(r);
      });
    }, 280);
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setResults(null);
  }

  function navigate(href: string) {
    close();
    router.push(href);
  }

  const total = results
    ? results.prospects.length + results.campagnes.length + results.livrables.length
    : 0;

  return (
    <>
      {/* Modal */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[70] flex flex-col" style={{ background: "rgba(13,30,46,0.7)" }}>
          {/* Backdrop tap → close */}
          <div className="flex-1" onClick={close} />

          {/* Sheet */}
          <div className="bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-gray-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a6b7e" strokeWidth={2.5} className="w-5 h-5 flex-shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => handleQuery(e.target.value)}
                placeholder="Prospects, campagnes, livrables…"
                className="flex-1 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
              />
              <button onClick={close} className="text-gray-400 text-[22px] leading-none">×</button>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1 pb-6">
              {isPending && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#1a6b7e] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isPending && query.trim().length >= 2 && results && total === 0 && (
                <div className="text-center text-[13px] text-gray-400 py-10">Aucun résultat pour «&nbsp;{query}&nbsp;»</div>
              )}

              {!isPending && query.trim().length < 2 && (
                <div className="text-center text-[13px] text-gray-400 py-10">
                  Saisissez au moins 2 caractères
                </div>
              )}

              {!isPending && results && total > 0 && (
                <div className="space-y-1 pt-2">

                  {/* Prospects */}
                  {results.prospects.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Prospects
                      </div>
                      {results.prospects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => navigate("/qualification")}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#1a6b7e]/10 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#1a6b7e" strokeWidth={2} className="w-4 h-4">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{p.nom}</div>
                            <div className="text-[11px] text-gray-400">{p.segment} · {p.cluster}</div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${p.scoreBANT * 10}%`, background: BANT_COLOR(p.scoreBANT) }} />
                            </div>
                            <span className="text-[12px] font-bold text-gray-700">{p.scoreBANT}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Campagnes */}
                  {results.campagnes.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Campagnes
                      </div>
                      {results.campagnes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate("/campagnes")}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth={2} className="w-4 h-4">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinejoin="round" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{c.nom}</div>
                            <div className="text-[11px] text-gray-400">{c.statut} · score {c.score}</div>
                          </div>
                          <span className="text-[11px] text-gray-300">→</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Livrables */}
                  {results.livrables.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Livrables
                      </div>
                      {results.livrables.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => navigate("/livrables")}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth={2} className="w-4 h-4">
                              <polyline points="9 11 12 14 22 4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 truncate">{l.nom}</div>
                            <div className="text-[11px] text-gray-400">{l.statut}{l.campagneNom ? ` · ${l.campagneNom}` : ""}</div>
                          </div>
                          <span className="text-[11px] text-gray-300">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
