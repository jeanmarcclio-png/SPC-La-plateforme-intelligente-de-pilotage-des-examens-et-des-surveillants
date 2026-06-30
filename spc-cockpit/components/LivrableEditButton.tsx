"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateLivrable } from "@/app/actions/livrables";
import { showToast } from "@/components/Toast";
import type { Livrable } from "@/lib/types";

const STATUTS = ["À rédiger", "En cours", "À renforcer", "Validé"] as const;

export function LivrableEditButton({ livrable }: { livrable: Livrable }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLivrable(livrable.id, fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(`"${fd.get("nom")}" mis à jour`);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Modifier ce livrable"
        className="inline-flex items-center gap-1 text-[11.5px] text-gray-400 hover:text-[#4a90d9] px-2 py-1 rounded-lg hover:bg-[#4a90d9]/8 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Modifier
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le livrable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
            <div>
              <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Nom *</label>
              <input
                name="nom"
                required
                defaultValue={livrable.nom}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Description</label>
              <input
                name="description"
                defaultValue={livrable.description}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Statut</label>
              <select
                name="statut"
                defaultValue={livrable.statut}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none"
              >
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Lien du document (URL)</label>
              <input
                name="fichier"
                type="url"
                defaultValue={livrable.fichier ?? ""}
                placeholder="https://docs.google.com/..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[#155a6a] text-white text-[13px] font-semibold disabled:opacity-50 transition-colors"
              >
                {pending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
