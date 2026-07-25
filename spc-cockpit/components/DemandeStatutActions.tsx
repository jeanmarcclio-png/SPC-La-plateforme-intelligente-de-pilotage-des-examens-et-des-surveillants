"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { STATUTS_DEMANDE, STATUT_META } from "@/lib/operations/demandes-constants";
import { updateDemandeStatut, validerDemande } from "@/app/actions/demandes";
import type { StatutDemande } from "@/lib/operations/types";

export function DemandeStatutActions({ id, statut }: { id: number; statut: StatutDemande }) {
  const [pending, startTransition] = useTransition();
  const [blocages, setBlocages] = useState<string[] | null>(null);

  function changeStatut(next: string) {
    startTransition(() => { void updateDemandeStatut(id, next); });
  }
  function valider() {
    setBlocages(null);
    startTransition(async () => {
      const res = await validerDemande(id);
      if (res.blocages?.length) setBlocages(res.blocages);
    });
  }

  const canValidate = statut !== "Validée SPC" && statut !== "Convertie en mission" && statut !== "Annulée" && statut !== "Archivée";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={statut}
          onChange={(e) => changeStatut(e.target.value)}
          disabled={pending}
          aria-label="Statut de la demande"
          className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUT_META[statut].pill}`}
        >
          {STATUTS_DEMANDE.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {canValidate && (
          <button
            type="button"
            onClick={valider}
            disabled={pending}
            title="Valider la demande SPC"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg px-2 py-1 hover:bg-teal-50 disabled:opacity-50 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Valider
          </button>
        )}
      </div>
      {blocages && (
        <div className="max-w-[280px] text-right rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
          <div className="text-[10.5px] font-bold text-red-600 mb-0.5">{blocages.length} élément(s) à corriger</div>
          <ul className="text-[10.5px] text-red-500 space-y-0.5">
            {blocages.slice(0, 4).map((b, i) => <li key={i}>· {b}</li>)}
            {blocages.length > 4 && <li>· … +{blocages.length - 4}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
