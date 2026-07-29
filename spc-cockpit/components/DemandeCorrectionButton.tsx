"use client";

import { useState, useTransition } from "react";
import { MessageSquareWarning } from "lucide-react";
import { demanderCorrection } from "@/app/actions/demandes";
import type { StatutDemande } from "@/lib/operations/types";

const TERMINAUX: StatutDemande[] = ["Convertie en mission", "Annulée", "Archivée", "À corriger", "Expirée"];

export function DemandeCorrectionButton({ id, statut }: { id: number; statut: StatutDemande }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (TERMINAUX.includes(statut)) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await demanderCorrection(id, msg);
      if (res.error) { setError(res.error); return; }
      setOpen(false); setMsg("");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors"
      >
        <MessageSquareWarning className="w-4 h-4" /> Demander correction
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-10 w-[320px] rounded-xl border border-gray-200 bg-white shadow-lg p-3">
          <div className="text-[12px] font-semibold text-gray-700 mb-1.5">Correction à demander</div>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            placeholder="ex : préciser l'effectif de la salle B14 et confirmer l'horaire de surveillance."
            className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-[12.5px] resize-y focus:outline-none focus:ring-2 focus:ring-amber-400/30"
          />
          {error && <div className="text-[11px] text-red-500 mt-1">{error}</div>}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setOpen(false)} className="text-[12px] font-semibold text-gray-500 px-2.5 py-1.5">Annuler</button>
            <button type="button" onClick={submit} disabled={pending || !msg.trim()} className="text-[12px] font-bold text-white rounded-lg px-3 py-1.5 disabled:opacity-40" style={{ background: "#b45309" }}>
              {pending ? "Envoi…" : "Passer en « À corriger »"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
