"use client";

import { useState, useRef, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { searchAll, type SearchResults } from "@/app/actions/search";
import { Search, User, Megaphone, ClipboardCheck } from "lucide-react";

const BANT_COLOR = (s: number) => s >= 8 ? "#38a169" : s >= 5 ? "#f6ad55" : "#fc8181";

export function CommandPalette() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router   = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onPaletteOpen() { setOpen(true); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("command-palette:open", onPaletteOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("command-palette:open", onPaletteOpen);
    };
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

  if (!open) return null;

  return (
    <div className="hidden md:flex fixed inset-0 z-[70] items-start justify-center pt-[12vh]" style={{ background: "rgba(13,30,46,0.5)" }}>
      <div className="absolute inset-0" onClick={close} />
      <Command
        shouldFilter={false}
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 flex-shrink-0 text-[var(--color-primary)]" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={handleQuery}
            placeholder="Rechercher prospects, campagnes, livrables…"
            className="flex-1 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
          />
          <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto py-2">
          {isPending && (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isPending && query.trim().length >= 2 && results && total === 0 && (
            <Command.Empty className="text-center text-[13px] text-gray-400 py-10">
              Aucun résultat pour «&nbsp;{query}&nbsp;»
            </Command.Empty>
          )}

          {!isPending && query.trim().length < 2 && (
            <div className="text-center text-[13px] text-gray-400 py-10">
              Saisissez au moins 2 caractères
            </div>
          )}

          {!isPending && results && total > 0 && (
            <>
              {results.prospects.length > 0 && (
                <Command.Group heading="Prospects" className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                  {results.prospects.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`prospect-${p.id}`}
                      onSelect={() => navigate("/qualification")}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer aria-selected:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[var(--color-primary)]" />
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
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.campagnes.length > 0 && (
                <Command.Group heading="Campagnes" className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                  {results.campagnes.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`campagne-${c.id}`}
                      onSelect={() => navigate("/campagnes")}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer aria-selected:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-4 h-4 text-[#4a90d9]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{c.nom}</div>
                        <div className="text-[11px] text-gray-400">{c.statut} · score {c.score}</div>
                      </div>
                      <span className="text-[11px] text-gray-300">→</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.livrables.length > 0 && (
                <Command.Group heading="Livrables" className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
                  {results.livrables.map((l) => (
                    <Command.Item
                      key={l.id}
                      value={`livrable-${l.id}`}
                      onSelect={() => navigate("/livrables")}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer aria-selected:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck className="w-4 h-4 text-[#38a169]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{l.nom}</div>
                        <div className="text-[11px] text-gray-400">{l.statut}{l.campagneNom ? ` · ${l.campagneNom}` : ""}</div>
                      </div>
                      <span className="text-[11px] text-gray-300">→</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
