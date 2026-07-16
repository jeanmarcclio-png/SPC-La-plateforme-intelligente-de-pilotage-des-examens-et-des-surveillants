"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerDisponibilite } from "@/app/actions/portail";
import type { Disponibilite } from "@/lib/supabase/portail";

interface JourState {
  matin: boolean;
  aprem: boolean;
}

export function MesDisponibilites({
  jours,
  initiales,
}: {
  jours: string[];
  initiales: Disponibilite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedDay, setSavedDay] = useState<string | null>(null);
  const [error, setError] = useState("");

  const init = new Map(initiales.map((d) => [d.date, d]));
  const [state, setState] = useState<Record<string, JourState>>(() => {
    const s: Record<string, JourState> = {};
    for (const j of jours) {
      const d = init.get(j);
      s[j] = { matin: d?.matin ?? false, aprem: d?.aprem ?? false };
    }
    return s;
  });

  function toggle(date: string, champ: keyof JourState) {
    setState((prev) => ({ ...prev, [date]: { ...prev[date], [champ]: !prev[date][champ] } }));
  }

  function save(date: string) {
    setError("");
    setSavedDay(null);
    startTransition(async () => {
      const res = await enregistrerDisponibilite({
        date,
        matin: state[date].matin,
        aprem: state[date].aprem,
      });
      if (res.error) setError(res.error);
      else {
        setSavedDay(date);
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-[12px] text-gray-500 mb-3">
        Cochez vos créneaux disponibles. Un créneau non coché = indisponible : vous ne serez
        jamais proposé dessus.
      </p>
      <div className="divide-y divide-gray-100">
        {jours.map((j) => {
          const label = new Date(j).toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const st = state[j];
          return (
            <div key={j} className="flex items-center gap-2 py-2.5">
              <div className="w-24 text-[13px] text-gray-700 capitalize shrink-0">{label}</div>
              <button
                type="button"
                onClick={() => toggle(j, "matin")}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                  st.matin
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                Matin
              </button>
              <button
                type="button"
                onClick={() => toggle(j, "aprem")}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                  st.aprem
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                Après-midi
              </button>
              <button
                type="button"
                onClick={() => save(j)}
                disabled={pending}
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 shrink-0"
                style={{ background: "#1a6b7e" }}
              >
                {savedDay === j ? "✓" : "OK"}
              </button>
            </div>
          );
        })}
      </div>
      {error && <div className="mt-3 text-[12px] text-red-600">{error}</div>}
    </div>
  );
}
