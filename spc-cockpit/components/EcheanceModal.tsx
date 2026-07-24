"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createEcheance, updateEcheance, deleteEcheance } from "@/app/actions/echeances";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Echeance = { id: number; date: string; nom: string; tag: string; urgent: boolean };

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[420px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function EcheanceForm({
  defaults,
  onSubmit,
  pending,
}: {
  defaults?: Partial<Echeance>;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Date</label>
        <input
          name="date"
          defaultValue={defaults?.date ?? ""}
          placeholder="ex: 30/06"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Nom de l&apos;échéance</label>
        <input
          name="nom"
          defaultValue={defaults?.nom ?? ""}
          placeholder="ex: Fin Vague 1 IDF"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Tag</label>
        <input
          name="tag"
          defaultValue={defaults?.tag ?? ""}
          placeholder="ex: Deadline, J+7, National"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30 focus:border-[#4a90d9]"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          name="urgent"
          value="true"
          id="urgent"
          defaultChecked={defaults?.urgent ?? false}
          className="w-4 h-4 accent-red-500"
        />
        <label htmlFor="urgent" className="text-[13px] text-gray-600 cursor-pointer">Marquer comme urgent</label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-[var(--color-primary)] hover:bg-[#155a6a] text-white text-[13px] font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function AddEcheanceButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      await createEcheance(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] font-semibold text-white bg-[var(--color-primary)] hover:bg-[#155a6a] px-3 py-1.5 rounded-lg transition-colors"
      >
        + Ajouter
      </button>
      <Modal title="Nouvelle échéance" open={open} onClose={() => setOpen(false)}>
        <EcheanceForm onSubmit={handleSubmit} pending={pending} />
      </Modal>
    </>
  );
}

export function EcheanceActions({ echeance }: { echeance: Echeance }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleEdit(fd: FormData) {
    startTransition(async () => {
      await updateEcheance(echeance.id, fd);
      setEditOpen(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer "${echeance.nom}" ?`)) return;
    startTransition(() => deleteEcheance(echeance.id));
  }

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditOpen(true)}
          className="text-[11px] text-gray-400 hover:text-[#4a90d9] px-2 py-0.5 rounded transition-colors"
        >
          Modifier
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <Modal title="Modifier l'échéance" open={editOpen} onClose={() => setEditOpen(false)}>
        <EcheanceForm defaults={echeance} onSubmit={handleEdit} pending={pending} />
      </Modal>
    </>
  );
}
