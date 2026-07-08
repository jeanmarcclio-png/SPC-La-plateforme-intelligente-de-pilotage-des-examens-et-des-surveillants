"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

// Bouton POC : demande à l'agent (lecture seule) d'expliquer et prioriser les
// risques déjà calculés. Le narratif est indicatif ; aucune action n'est
// appliquée automatiquement.
export function RisqueNarrative({ todayISO }: { todayISO: string }) {
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setNarrative(null);
    setNote(null);
    try {
      const res = await fetch("/api/agents/planning-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todayISO }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Erreur de l'agent");
      else {
        setNarrative(data.narrative ?? null);
        setNote(data.note ?? null);
      }
    } catch {
      setError("Impossible de contacter l'agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles className="w-4 h-4" aria-hidden /></span>
          <h2 className="text-[14px] font-bold text-gray-900">Explication & priorisation IA</h2>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "#0d2137" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Sparkles className="w-4 h-4" aria-hidden />}
          {loading ? "Analyse…" : "Analyser les risques"}
        </button>
      </div>
      <p className="text-[12px] text-gray-400 mb-3">
        Lecture seule · l&apos;agent explique et hiérarchise des risques déjà calculés — aucune action n&apos;est appliquée, aucune donnée personnelle n&apos;est transmise au modèle.
      </p>

      {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">{error}</div>}
      {note && !narrative && <div className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">{note}</div>}
      {narrative && (
        <div className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50/70 rounded-lg px-4 py-3.5 border border-gray-100">
          {narrative}
        </div>
      )}
    </div>
  );
}
