"use client";

import { useState, useTransition } from "react";
import { updateCampagneStatut, createCampagne } from "@/app/actions/campagnes";

import { STATUT_CAMPAGNE as STATUTS } from "@/lib/constants";

const statutColors: Record<string, string> = {
  "Actif":    "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  "En cours": "bg-blue-50 text-blue-700",
  "Terminé":  "bg-gray-100 text-gray-500",
  "Archivé":  "bg-gray-50 text-gray-400",
};

export function CampagneStatutSelect({ id, statut }: { id: string; statut: string }) {
  const [current, setCurrent] = useState(statut);
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setCurrent(next);
    startTransition(() => updateCampagneStatut(id, next));
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 ${statutColors[current] ?? "bg-gray-100 text-gray-500"} ${pending ? "opacity-50" : ""}`}
    >
      {STATUTS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-[460px] max-w-[95vw] p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[15px] font-bold text-gray-900">Nouvelle campagne</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AddCampagneButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      await createCampagne(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] font-semibold text-white bg-[var(--color-primary)] hover:bg-[#155a6a] px-3 py-1.5 rounded-lg transition-colors"
      >
        + Nouvelle campagne
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form action={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Nom de la campagne</label>
                <input name="nom" required placeholder="ex: Lyon Écoles 2026" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Périmètre</label>
                <input name="perimetre" placeholder="ex: Lyon · Grenoble · Nancy" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Deadline</label>
                <input name="deadline" placeholder="ex: 30/09/2026" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Jours restants</label>
                <input name="jours_restants" type="number" min={0} defaultValue={30} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Nbre prospects</label>
                <input name="nombre_prospects" type="number" min={0} defaultValue={0} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Score BANT /10</label>
                <input name="score" type="number" min={0} max={10} step={0.1} defaultValue={0} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Statut</label>
                <select name="statut" defaultValue="En cours" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]">
                  {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full mt-2 bg-[var(--color-primary)] hover:bg-[#155a6a] text-white text-[13px] font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {pending ? "Création…" : "Créer la campagne"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
