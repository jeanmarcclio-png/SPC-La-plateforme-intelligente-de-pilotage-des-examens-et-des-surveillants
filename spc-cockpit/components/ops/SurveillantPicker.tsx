"use client";

// Sélecteur de surveillant recherchable (Master Prompt §14) :
// recherche par nom, téléphone, e-mail ou rôle, fiches enrichies
// (statut, coordonnées, heures), alerte si indisponible.

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Surveillant } from "@/lib/operations/types";
import { SurvBadge } from "@/components/ops/badges";
import { Search, Plus, UserPlus, Phone, Mail } from "lucide-react";

const ACCENT = "#2563eb";

export function SurveillantPicker({
  surveillants,
  onSelect,
  disabled,
}: {
  surveillants: Surveillant[];
  onSelect: (s: Surveillant) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s
      ? surveillants.filter((x) =>
          x.nom.toLowerCase().includes(s) ||
          (x.telephone ?? "").replace(/[ .-]/g, "").includes(s.replace(/[ .-]/g, "")) ||
          (x.email ?? "").toLowerCase().includes(s) ||
          x.role.toLowerCase().includes(s)
        )
      : surveillants;
    // Disponibles d'abord, indisponibles en fin de liste (jamais masqués).
    return [...base].sort((a, b) => Number(a.statut === "Indisponible") - Number(b.statut === "Indisponible")).slice(0, 8);
  }, [surveillants, q]);

  function pick(s: Surveillant) {
    if (s.statut === "Indisponible" && !confirm(`${s.nom} est marqué·e INDISPONIBLE.\nL'affecter quand même à cette session ?`)) return;
    onSelect(s);
    setQ("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
        style={{ background: ACCENT }}
      >
        <UserPlus className="w-3.5 h-3.5" aria-hidden />
        Ajouter un surveillant
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[340px] bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="relative border-b border-gray-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && results.length > 0) pick(results[0]); }}
              placeholder="Nom, téléphone, e-mail, rôle…"
              aria-label="Rechercher un surveillant"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] focus:outline-none"
            />
          </div>

          <ul role="listbox" className="max-h-[300px] overflow-y-auto">
            {results.length === 0 && (
              <li className="px-4 py-4 text-[12.5px] text-gray-400 text-center">Aucun surveillant ne correspond à « {q} ».</li>
            )}
            {results.map((s) => (
              <li key={s.id} role="option" aria-selected="false">
                <button
                  onClick={() => pick(s)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-blue-50/50 transition-colors ${s.statut === "Indisponible" ? "opacity-60" : ""}`}
                >
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: "#0d2137" }}>
                    {s.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-gray-800 truncate">{s.nom}</span>
                      <SurvBadge statut={s.statut} />
                    </span>
                    <span className="block text-[11.5px] text-gray-400">{s.role} · {s.heures}h planifiées</span>
                    {(s.telephone || s.email) && (
                      <span className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                        {s.telephone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden />{s.telephone}</span>}
                        {s.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="w-3 h-3" aria-hidden />{s.email}</span>}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Link
            href="/operations/surveillants"
            className="flex items-center gap-1.5 px-4 py-2.5 border-t border-gray-100 text-[12.5px] font-semibold text-blue-600 hover:bg-blue-50/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Ajouter un nouveau surveillant
          </Link>
        </div>
      )}
    </div>
  );
}
