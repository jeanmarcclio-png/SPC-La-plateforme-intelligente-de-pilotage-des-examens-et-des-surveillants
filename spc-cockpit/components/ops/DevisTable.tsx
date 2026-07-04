"use client";

import { useState, useMemo, useTransition } from "react";
import type { Devis } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createDevis, updateDevis, deleteDevis } from "@/app/actions/devis";
import { showToast } from "@/components/Toast";
import { DevisBadge } from "@/components/ops/badges";
import { euro } from "@/lib/operations/format";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

const ACCENT = "#2563eb";
const STATUTS = ["Brouillon", "Envoyé", "Accepté", "Refusé", "Facturé"];

function suggestReference(devis: Devis[]): string {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const sameDay = devis.filter((d) => d.reference.includes(ymd)).length;
  return `SPC-${ymd}-${String(sameDay + 1).padStart(3, "0")}`;
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

function DevisForm({
  initial,
  suggestedRef,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Devis;
  suggestedRef: string;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [ht, setHt] = useState(initial?.montantHT ?? 0);
  const [ttc, setTtc] = useState(initial?.montantTTC ?? 0);
  const [ttcTouched, setTtcTouched] = useState(!!initial);

  function onHtChange(v: number) {
    setHt(v);
    if (!ttcTouched) setTtc(Math.round(v * 1.2 * 100) / 100);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Référence *">
          <input name="reference" required defaultValue={initial?.reference ?? suggestedRef} className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Statut">
          <select name="statut" defaultValue={initial?.statut ?? "Brouillon"} className={inputCls}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Client *">
        <input name="client" required defaultValue={initial?.client} placeholder="ex: Sciences Po" className={inputCls} />
      </Field>
      <Field label="Session">
        <input name="session" defaultValue={initial?.session ?? ""} placeholder="ex: Concours écrit 2026" className={inputCls} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Montant HT (€)">
          <input
            name="montant_ht" type="number" min="0" step="0.01" value={ht}
            onChange={(e) => onHtChange(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Montant TTC (€)">
          <input
            name="montant_ttc" type="number" min="0" step="0.01" value={ttc}
            onChange={(e) => { setTtcTouched(true); setTtc(Number(e.target.value)); }}
            className={inputCls}
          />
        </Field>
        <Field label="Surveillants">
          <input name="nb_surveillants" type="number" min="0" defaultValue={initial?.nbSurveillants ?? 0} className={inputCls} />
        </Field>
      </div>
      <p className="text-[11px] text-gray-400">Le TTC se calcule automatiquement (TVA 20 %) tant que tu ne le modifies pas à la main.</p>
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
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer le devis"}
        </button>
      </div>
    </form>
  );
}

export function DevisTable({ devis }: { devis: Devis[] }) {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; devis: Devis } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return devis.filter((d) => {
      if (q && !d.client.toLowerCase().includes(q) && !d.reference.toLowerCase().includes(q) && !(d.session ?? "").toLowerCase().includes(q)) return false;
      if (statut && d.statut !== statut) return false;
      return true;
    });
  }, [devis, search, statut]);

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateDevis(dialog.devis.id, fd)
        : await createDevis(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? `${fd.get("reference")} mis à jour` : `Devis ${fd.get("reference")} créé`);
        setDialog(null);
      }
    });
  }

  function handleDelete(d: Devis) {
    if (!confirm(`Supprimer définitivement le devis ${d.reference} (${d.client}) ?`)) return;
    startTransition(async () => {
      const result = await deleteDevis(d.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`${d.reference} supprimé`);
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[190px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un devis, un client…"
            className="w-full pl-8 pr-3 py-2 text-[12.5px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400"
          />
        </div>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="text-[12px] bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-600 focus:outline-none">
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => setDialog({ mode: "create" })}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau devis
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {["Référence", "Client", "Session", "Statut", "Montant HT", "Montant TTC", "Équipe", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-[13px] text-gray-400">Aucun devis ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">{d.reference}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-800">{d.client}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 max-w-[200px] truncate">{d.session ?? "—"}</td>
                  <td className="px-5 py-3"><DevisBadge statut={d.statut} /></td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 whitespace-nowrap">{euro(d.montantHT)}</td>
                  <td className="px-5 py-3 text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{euro(d.montantTTC)}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 whitespace-nowrap">{d.nbSurveillants} surv.</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDialog({ mode: "edit", devis: d })}
                        title={`Modifier ${d.reference}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        disabled={pending}
                        title={`Supprimer ${d.reference}`}
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
              {dialog?.mode === "edit" ? `Modifier — ${dialog.devis.reference}` : "Nouveau devis"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <DevisForm
              key={dialog.mode === "edit" ? dialog.devis.id : "create"}
              initial={dialog.mode === "edit" ? dialog.devis : undefined}
              suggestedRef={suggestReference(devis)}
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
