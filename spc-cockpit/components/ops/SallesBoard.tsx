"use client";

import { useState, useTransition } from "react";
import type { Salle } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSalle, updateSalle, deleteSalle } from "@/app/actions/salles";
import { showToast } from "@/components/Toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ACCENT = "#2563eb";

function occupation(s: Salle): number {
  return s.capacite > 0 ? Math.round((s.etudiants / s.capacite) * 100) : 0;
}

function occColor(pct: number): string {
  if (pct >= 92) return "#ef4444";
  if (pct >= 60) return "#f59e0b";
  return "#10b981";
}

function TagPMR() {
  return <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">PMR</span>;
}
function TagTT() {
  return <span className="text-[10px] font-bold uppercase bg-sky-50 text-sky-600 rounded px-1.5 py-0.5">TT</span>;
}

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

function SalleForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Salle;
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
      <Field label="Nom de la salle *">
        <input name="nom" required defaultValue={initial?.nom} placeholder="ex: Salle A21" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bâtiment">
          <input name="batiment" defaultValue={initial?.batiment ?? ""} placeholder="ex: Bâtiment A" className={inputCls} />
        </Field>
        <Field label="Étage">
          <input name="etage" defaultValue={initial?.etage ?? ""} placeholder="ex: 2e étage" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Capacité">
          <input name="capacite" type="number" min="0" defaultValue={initial?.capacite ?? 0} className={inputCls} />
        </Field>
        <Field label="Étudiants">
          <input name="etudiants" type="number" min="0" defaultValue={initial?.etudiants ?? 0} className={inputCls} />
        </Field>
        <Field label="Surveillants">
          <input name="nb_surveillants" type="number" min="0" defaultValue={initial?.nbSurveillants ?? 0} className={inputCls} />
        </Field>
      </div>
      <div className="flex items-center gap-5 pt-1">
        <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
          <input type="checkbox" name="pmr" value="true" defaultChecked={initial?.pmr ?? false} className="w-4 h-4 accent-blue-500" />
          Accès PMR
        </label>
        <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
          <input type="checkbox" name="tiers_temps" value="true" defaultChecked={initial?.tiersTemps ?? false} className="w-4 h-4 accent-blue-500" />
          Tiers-temps
        </label>
      </div>
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
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter la salle"}
        </button>
      </div>
    </form>
  );
}

export function SallesBoard({ salles }: { salles: Salle[] }) {
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; salle: Salle } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateSalle(dialog.salle.id, fd)
        : await createSalle(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? `"${fd.get("nom")}" mise à jour` : `"${fd.get("nom")}" ajoutée`);
        setDialog(null);
      }
    });
  }

  function handleDelete(s: Salle) {
    if (!confirm(`Supprimer définitivement "${s.nom}" ?`)) return;
    startTransition(async () => {
      const result = await deleteSalle(s.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`"${s.nom}" supprimée`);
    });
  }

  return (
    <>
      {/* Vue d'ensemble — occupation */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm mb-5 overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">Vue d&apos;ensemble — Occupation</h2>
          <button
            onClick={() => setDialog({ mode: "create" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: ACCENT }}
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter une salle
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 divide-gray-100 lg:divide-x">
          {salles.map((s) => {
            const pct = occupation(s);
            return (
              <div key={s.id} className="px-4 py-4">
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <span className="text-[13px] font-bold text-gray-900 truncate">{s.nom.replace(/^Salle /, "")}</span>
                  <span className="flex gap-1">{s.pmr && <TagPMR />}{s.tiersTemps && <TagTT />}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: occColor(pct) }} />
                </div>
                <div className="flex items-center justify-between text-[11.5px] text-gray-500">
                  <span>{s.etudiants}/{s.capacite} étud.</span>
                  <span className="font-semibold">{s.nbSurveillants} surv.</span>
                </div>
                {s.batiment && <div className="text-[11px] text-gray-400 mt-1">{s.batiment}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail des salles */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">Détail des salles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Salle", "Bâtiment", "Capacité", "Étudiants", "Occupation", "Surv.", "PMR", "TT", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salles.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[13px] text-gray-400">Aucune salle enregistrée.</td></tr>
              )}
              {salles.map((s) => {
                const pct = occupation(s);
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-semibold text-gray-800">{s.nom}</div>
                      {s.etage && <div className="text-[11.5px] text-gray-400">{s.etage}</div>}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600">{s.batiment ?? "—"}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-700">{s.capacite}</td>
                    <td className="px-5 py-3 text-[13px] text-gray-700">{s.etudiants}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: occColor(pct) }} />
                        </div>
                        <span className="text-[12.5px] font-bold text-gray-700">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-gray-700">{s.nbSurveillants}</td>
                    <td className="px-5 py-3">{s.pmr ? <TagPMR /> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3">{s.tiersTemps ? <TagTT /> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialog({ mode: "edit", salle: s })}
                          title={`Modifier ${s.nom}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={pending}
                          title={`Supprimer ${s.nom}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Modifier — ${dialog.salle.nom}` : "Nouvelle salle"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <SalleForm
              initial={dialog.mode === "edit" ? dialog.salle : undefined}
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
