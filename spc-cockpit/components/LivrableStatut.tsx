"use client";

import { useState, useTransition } from "react";
import { updateLivrableStatut } from "@/app/actions/livrables";

const STATUTS = ["À rédiger", "En cours", "Validé", "À renforcer"] as const;

const statutColors: Record<string, string> = {
  "Validé":      "bg-green-50 text-green-700",
  "En cours":    "bg-blue-50 text-blue-700",
  "À rédiger":   "bg-gray-100 text-gray-500",
  "À renforcer": "bg-orange-50 text-orange-600",
};

export function LivrableStatutSelect({ id, statut }: { id: number; statut: string }) {
  const [current, setCurrent] = useState(statut);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(() => updateLivrableStatut(id, next));
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={pending}
      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 ${statutColors[current] ?? "bg-gray-100 text-gray-500"} ${pending ? "opacity-50" : ""}`}
    >
      {STATUTS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
