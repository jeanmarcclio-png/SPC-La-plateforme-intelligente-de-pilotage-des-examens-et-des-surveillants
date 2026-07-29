"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setTauxHoraireFacturation } from "@/app/actions/parametres";

/** Réglage org : taux horaire de facturation par défaut (pré-chiffrage des devis). */
export function FacturationSection({ taux }: { taux: number }) {
  const [value, setValue] = useState(String(taux));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    setSaved(false);
    const n = Number(value);
    startTransition(async () => {
      const res = await setTauxHoraireFacturation(n);
      if (res.error) setError(res.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    });
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1" htmlFor="taux_fact">
        Taux horaire de facturation (€/h)
      </label>
      <div className="flex items-center gap-2">
        <input
          id="taux_fact"
          type="number"
          min={0}
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]/50"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          {saved ? <Check className="w-4 h-4" /> : null} {pending ? "…" : saved ? "Enregistré" : "Enregistrer"}
        </button>
      </div>
      <p className="text-[11.5px] text-gray-400 mt-2">Sert à pré-chiffrer les devis générés depuis une demande. Ajustable ligne par ligne dans chaque devis.</p>
      {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}
