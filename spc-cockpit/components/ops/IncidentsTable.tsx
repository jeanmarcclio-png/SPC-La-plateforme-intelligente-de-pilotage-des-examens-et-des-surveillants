"use client";

import { useState, useTransition } from "react";
import type { Incident } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createIncident, updateIncident, deleteIncident } from "@/app/actions/incidents";
import { showToast } from "@/components/Toast";
import { dateFR } from "@/lib/operations/format";
import { Plus, Pencil, Trash2 } from "lucide-react";

const ACCENT = "#6366f1";
const GRAVITES = [
  { value: "critique", label: "Critique" },
  { value: "majeur",   label: "Majeur" },
  { value: "mineur",   label: "Mineur" },
];
const STATUTS = ["Ouvert", "En cours", "Résolu"];

function GraviteBadge({ gravite }: { gravite: Incident["gravite"] }) {
  const cls: Record<Incident["gravite"], string> = {
    critique: "bg-red-50 text-red-600",
    majeur:   "bg-amber-50 text-amber-600",
    mineur:   "bg-gray-100 text-gray-500",
  };
  const label: Record<Incident["gravite"], string> = { critique: "Critique", majeur: "Majeur", mineur: "Mineur" };
  return <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${cls[gravite]}`}>{label[gravite]}</span>;
}

function StatutIncidentBadge({ statut }: { statut: Incident["statut"] }) {
  const cls: Record<Incident["statut"], string> = {
    "Ouvert":   "bg-red-50 text-red-600",
    "En cours": "bg-sky-50 text-sky-600",
    "Résolu":   "bg-emerald-50 text-emerald-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{statut}
    </span>
  );
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
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400";

function IncidentForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Incident;
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
      <Field label="Type d'incident *">
        <input name="titre" required defaultValue={initial?.titre} placeholder="ex: Fraude suspectée" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Salle">
          <input name="salle" defaultValue={initial?.salle ?? ""} placeholder="ex: A21" className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Date">
          <input name="date_incident" type="date" defaultValue={initial?.dateIncident ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gravité">
          <select name="gravite" defaultValue={initial?.gravite ?? "mineur"} className={inputCls}>
            {GRAVITES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select name="statut" defaultValue={initial?.statut ?? "Ouvert"} className={inputCls}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
          placeholder="Circonstances, personnes impliquées, mesures prises…"
          className={`${inputCls} resize-none`}
        />
      </Field>
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
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Déclarer l'incident"}
        </button>
      </div>
    </form>
  );
}

export function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; incident: Incident } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateIncident(dialog.incident.id, fd)
        : await createIncident(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? "Incident mis à jour" : "Incident déclaré");
        setDialog(null);
      }
    });
  }

  function handleDelete(i: Incident) {
    if (!confirm(`Supprimer définitivement l'incident "${i.titre}" ?`)) return;
    startTransition(async () => {
      const result = await deleteIncident(i.id);
      if (result.error) showToast(result.error, "error");
      else showToast("Incident supprimé");
    });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setDialog({ mode: "create" })}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <Plus className="w-3.5 h-3.5" />
          Déclarer un incident
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Référence", "Date", "Salle", "Type", "Gravité", "Statut", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[13px] text-gray-400">Aucun incident déclaré. C&apos;est une bonne nouvelle.</td></tr>
              )}
              {incidents.map((i) => (
                <tr key={i.id} className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">INC-{String(i.id).padStart(3, "0")}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(i.dateIncident)}</td>
                  <td className="px-5 py-3">
                    {i.salle
                      ? <span className="text-[12px] font-mono font-bold bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{i.salle}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[13px] font-semibold text-gray-800">{i.titre}</div>
                    {i.description && <div className="text-[11.5px] text-gray-400 max-w-[280px] truncate">{i.description}</div>}
                  </td>
                  <td className="px-5 py-3"><GraviteBadge gravite={i.gravite} /></td>
                  <td className="px-5 py-3"><StatutIncidentBadge statut={i.statut} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDialog({ mode: "edit", incident: i })}
                        title="Modifier l'incident"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(i)}
                        disabled={pending}
                        title="Supprimer l'incident"
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
            <DialogTitle>
              {dialog?.mode === "edit" ? `Modifier — ${dialog.incident.titre}` : "Déclarer un incident"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <IncidentForm
              initial={dialog.mode === "edit" ? dialog.incident : undefined}
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
