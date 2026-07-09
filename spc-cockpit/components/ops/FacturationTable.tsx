"use client";

import { useState, useTransition } from "react";
import type { Facture, StatutFacture } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createFacture, updateFactureStatut, deleteFacture } from "@/app/actions/factures";
import { showToast } from "@/components/Toast";
import { euro, dateFR } from "@/lib/operations/format";
import { Button } from "@/components/ops/Button";
import { Plus, Trash2 } from "lucide-react";
import { ttcFromHT } from "@/lib/operations/engine";

const ACCENT = "#2563eb";
const STATUTS: StatutFacture[] = ["À facturer", "Facturée", "Payée", "En retard"];

const STATUT_CLS: Record<StatutFacture, string> = {
  "À facturer": "bg-gray-100 text-gray-600",
  "Facturée":   "bg-sky-50 text-sky-700",
  "Payée":      "bg-emerald-50 text-emerald-700",
  "En retard":  "bg-red-50 text-red-600",
};

function suggestReference(factures: Facture[]): string {
  const year = new Date().getFullYear();
  const max = factures.reduce((acc, f) => {
    const n = Number(f.reference.match(/^FA-\d{4}-(\d+)$/)?.[1] ?? 0);
    return Math.max(acc, n);
  }, 0);
  return `FA-${year}-${String(max + 1).padStart(3, "0")}`;
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

function FactureForm({
  suggestedRef,
  pending,
  onSubmit,
  onCancel,
}: {
  suggestedRef: string;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [ht, setHt] = useState(0);
  const [ttc, setTtc] = useState(0);
  const [ttcTouched, setTtcTouched] = useState(false);

  function onHtChange(v: number) {
    setHt(v);
    if (!ttcTouched) setTtc(ttcFromHT(v));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Référence *">
          <input name="reference" required defaultValue={suggestedRef} className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Statut">
          <select name="statut" defaultValue="À facturer" className={inputCls}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Client *">
        <input name="client" required placeholder="ex: Sciences Po" className={inputCls} />
      </Field>
      <Field label="Session">
        <input name="session" placeholder="ex: Concours écrit 2026" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant HT (€)">
          <input name="montant_ht" type="number" min="0" step="0.01" value={ht} onChange={(e) => onHtChange(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Montant TTC (€)">
          <input name="montant_ttc" type="number" min="0" step="0.01" value={ttc} onChange={(e) => { setTtcTouched(true); setTtc(Number(e.target.value)); }} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Émission">
          <input name="emission" type="date" className={inputCls} />
        </Field>
        <Field label="Échéance">
          <input name="echeance" type="date" className={inputCls} />
        </Field>
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
          {pending ? "Enregistrement…" : "Créer la facture"}
        </button>
      </div>
    </form>
  );
}

export function FacturationTable({ factures }: { factures: Facture[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    startTransition(async () => {
      const result = await createFacture(fd);
      if (result.error) showToast(result.error, "error");
      else { showToast(`Facture ${fd.get("reference")} créée`); setOpen(false); }
    });
  }

  function changeStatut(f: Facture, statut: string) {
    startTransition(async () => {
      const result = await updateFactureStatut(f.id, statut);
      if (result.error) showToast(result.error, "error");
      else showToast(`${f.reference} → ${statut}`);
    });
  }

  function handleDelete(f: Facture) {
    if (!confirm(`Supprimer définitivement la facture ${f.reference} (${f.client}) ?`)) return;
    startTransition(async () => {
      const result = await deleteFacture(f.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`${f.reference} supprimée`);
    });
  }

  const totalHT = factures.reduce((s, f) => s + f.montantHT, 0);
  const totalTTC = factures.reduce((s, f) => s + f.montantTTC, 0);

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#0d2137" }}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Nouvelle facture
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
          <h2 className="text-[14px] font-bold text-gray-900">Factures <span className="text-gray-400 font-normal">({factures.length})</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Référence", "Client", "Session", "Statut", "Montant HT", "Montant TTC", "Émission", "Échéance", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factures.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[13px] text-gray-400">Aucune facture émise.</td></tr>
              )}
              {factures.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">{f.reference}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-800">{f.client}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 max-w-[180px] truncate">{f.session ?? "—"}</td>
                  <td className="px-5 py-3">
                    <select
                      value={f.statut}
                      onChange={(e) => changeStatut(f, e.target.value)}
                      disabled={pending}
                      aria-label={`Statut de la facture ${f.reference}`}
                      className={`text-[11.5px] font-bold rounded-lg px-2 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${STATUT_CLS[f.statut]}`}
                    >
                      {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 whitespace-nowrap">{euro(f.montantHT)}</td>
                  <td className="px-5 py-3 text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{euro(f.montantTTC)}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(f.emission)}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(f.echeance)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(f)} disabled={pending} aria-label={`Supprimer ${f.reference}`}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {factures.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50/70 border-t border-gray-100">
                  <td colSpan={4} className="px-5 py-3 text-right text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Sous-total affiché</td>
                  <td className="px-5 py-3 text-[14px] font-extrabold text-gray-900 whitespace-nowrap">{euro(totalHT)}</td>
                  <td className="px-5 py-3 text-[14px] font-extrabold text-gray-900 whitespace-nowrap">{euro(totalTTC)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
          </DialogHeader>
          {open && (
            <FactureForm
              suggestedRef={suggestReference(factures)}
              pending={pending}
              onSubmit={submit}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
