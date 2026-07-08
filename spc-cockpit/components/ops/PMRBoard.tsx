"use client";

import { useState, useTransition } from "react";
import type { Amenagement, Surveillant } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createAmenagement, updateAmenagement, deleteAmenagement } from "@/app/actions/amenagements";
import { showToast } from "@/components/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ACCENT = "#2563eb";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400";

function AmenagementForm({
  initial,
  surveillants,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Amenagement;
  surveillants: Surveillant[];
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
      <Field label="Aménagement *">
        <input name="amenagement" required defaultValue={initial?.amenagement} placeholder="ex: PMR — Fauteuil roulant" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salle">
          <input name="salle" defaultValue={initial?.salle ?? ""} placeholder="ex: E31" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Surveillant dédié">
          <select name="surveillant" defaultValue={initial?.surveillant ?? ""} className={inputCls}>
            <option value="">— Aucun —</option>
            {surveillants.map((s) => <option key={s.id} value={s.nom}>{s.nom}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer pt-1">
        <input type="checkbox" name="tiers_temps" value="true" defaultChecked={initial?.tiersTemps ?? false} className="w-4 h-4 accent-blue-500" />
        Tiers-temps (durée majorée d&apos;1/3)
      </label>
      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: ACCENT }}
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter l'aménagement"}
        </button>
      </div>
    </form>
  );
}

export function PMRBoard({ amenagements, surveillants }: { amenagements: Amenagement[]; surveillants: Surveillant[] }) {
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; amenagement: Amenagement } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateAmenagement(dialog.amenagement.id, fd)
        : await createAmenagement(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? "Aménagement mis à jour" : "Aménagement ajouté");
        setDialog(null);
      }
    });
  }

  function handleDelete(a: Amenagement) {
    if (!confirm(`Supprimer l'aménagement "${a.amenagement}" ?`)) return;
    startTransition(async () => {
      const result = await deleteAmenagement(a.id);
      if (result.error) showToast(result.error, "error");
      else showToast("Aménagement supprimé");
    });
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">Étudiants avec aménagements</h2>
          <button
            onClick={() => setDialog({ mode: "create" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: ACCENT }}
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Ajouter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Réf.", "Aménagement", "Salle", "Tiers-temps", "Surveillant dédié", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {amenagements.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[13px] text-gray-400">Aucun aménagement enregistré.</td></tr>
              )}
              {amenagements.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">ETU-{String(a.id).padStart(3, "0")}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-800">{a.amenagement}</td>
                  <td className="px-5 py-3">
                    {a.salle
                      ? <span className="text-[12px] font-mono font-bold bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{a.salle}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {a.tiersTemps
                      ? <span className="text-[11px] font-bold bg-emerald-50 text-emerald-600 rounded px-1.5 py-0.5">1/3</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600">{a.surveillant ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDialog({ mode: "edit", amenagement: a })}
                        title="Modifier l'aménagement"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        disabled={pending}
                        title="Supprimer l'aménagement"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Modifier l'aménagement" : "Nouvel aménagement"}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <AmenagementForm
              initial={dialog.mode === "edit" ? dialog.amenagement : undefined}
              surveillants={surveillants}
              pending={pending}
              onSubmit={submit}
              onCancel={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
