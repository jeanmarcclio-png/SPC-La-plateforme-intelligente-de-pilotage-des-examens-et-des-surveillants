"use client";

import { useState, useTransition } from "react";
import { updateProspectStatut, updateProspectNotes } from "@/app/actions/prospects";

const STATUTS = ["Non contacté", "En cours", "RDV fixé", "Converti"] as const;

const statutColors: Record<string, string> = {
  "Non contacté": "bg-gray-100 text-gray-600",
  "En cours":     "bg-blue-50 text-blue-700",
  "RDV fixé":     "bg-green-50 text-green-700",
  "Converti":     "bg-[#1a6b7e]/10 text-[#1a6b7e]",
};

export function ProspectStatutSelect({ id, statut }: { id: string; statut: string }) {
  const [current, setCurrent] = useState(statut);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(() => updateProspectStatut(id, next));
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={pending}
      className={`text-[11.5px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 ${statutColors[current] ?? "bg-gray-100 text-gray-600"} ${pending ? "opacity-50" : ""}`}
    >
      {STATUTS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

export function ProspectNotesInput({ id, notes }: { id: string; notes?: string }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleBlur() {
    startTransition(async () => {
      await updateProspectNotes(id, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Ajouter une note..."
        rows={2}
        className="w-full text-[12px] text-gray-600 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
      />
      {saved && (
        <span className="absolute bottom-2 right-2 text-[10px] text-green-500 font-medium">Sauvegardé ✓</span>
      )}
    </div>
  );
}
