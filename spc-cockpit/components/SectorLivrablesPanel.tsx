"use client";

import { useState, useTransition } from "react";
import { useSectorConfig } from "@/lib/hooks/useSectorConfig";
import type { SectorLivrable } from "@/lib/data/sectors/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createLivrable } from "@/app/actions/livrables";
import { showToast } from "@/components/Toast";

const STATUTS = ["À rédiger", "En cours", "À renforcer", "Validé"] as const;

function CreateLivrableDialog({
  template,
  couleur,
  onClose,
}: {
  template: SectorLivrable;
  couleur: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createLivrable(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(`"${fd.get("nom")}" ajouté aux livrables`);
        onClose();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
      <div>
        <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Nom du livrable *</label>
        <input
          name="nom"
          required
          defaultValue={template.nom}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ "--tw-ring-color": `${couleur}40` } as React.CSSProperties}
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Description</label>
        <input
          name="description"
          defaultValue={template.description}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ "--tw-ring-color": `${couleur}40` } as React.CSSProperties}
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">Statut initial</label>
        <select
          name="statut"
          defaultValue="À rédiger"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none"
        >
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: couleur }}
        >
          {pending ? "Création…" : "Créer le livrable"}
        </button>
      </div>
    </form>
  );
}

export function SectorLivrablesPanel() {
  const { sectorPack, tenantConfig, isReady } = useSectorConfig();
  const [selected, setSelected] = useState<SectorLivrable | null>(null);

  if (!isReady) return <div className="rounded-xl mb-4 h-[100px] bg-gray-100 animate-pulse" />;

  const { livrables } = sectorPack;
  const couleur = tenantConfig.couleur;

  return (
    <>
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: `${couleur}30`, background: `${couleur}08` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{tenantConfig.emoji}</span>
          <span className="text-[13px] font-semibold" style={{ color: couleur }}>
            Documents types — {tenantConfig.nom}
          </span>
          <span className="ml-auto text-[11px] text-gray-400">Cliquer pour créer</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {livrables.map((livrable, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(livrable)}
              className="flex items-start gap-2.5 bg-white rounded-lg p-2.5 border border-gray-100 text-left w-full group transition-all hover:border-[var(--sector-color)] hover:shadow-sm focus:outline-none focus:ring-2"
              style={{
                "--sector-color": couleur,
                "--tw-ring-color": `${couleur}40`,
              } as React.CSSProperties}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{livrable.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-gray-800">{livrable.nom}</div>
                <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{livrable.description}</div>
              </div>
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[14px] font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                style={{ background: `${couleur}18`, color: couleur }}
                aria-hidden
              >
                +
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected?.icon} Nouveau livrable — {selected?.nom}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <CreateLivrableDialog
              template={selected}
              couleur={couleur}
              onClose={() => setSelected(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
