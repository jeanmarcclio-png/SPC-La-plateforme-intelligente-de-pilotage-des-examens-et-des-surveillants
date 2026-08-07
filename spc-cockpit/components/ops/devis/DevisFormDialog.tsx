"use client";

// Formulaire de devis (création / modification) — extrait de l'ancien
// DevisTable pour que le tableau reste un tableau. Le calcul du TTC continue de
// passer par le moteur central (ttcFromHT), jamais par une formule locale.

import { useState, useTransition } from "react";
import type { Devis, DevisSalle } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DevisSallesEditor } from "@/components/ops/DevisSallesEditor";
import { createDevis, updateDevis } from "@/app/actions/devis";
import { showToast } from "@/components/Toast";
import { ttcFromHT } from "@/lib/operations/engine";

const STATUTS = ["Brouillon", "Envoyé", "Accepté", "Refusé", "Facturé"];

export function suggestReference(devis: Devis[]): string {
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
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400";

function DevisForm({
  initial,
  initialSalles,
  suggestedRef,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Devis;
  initialSalles: DevisSalle[];
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact">
          <input name="contact" defaultValue={initial?.contact ?? ""} placeholder="ex: Service scolarité" className={inputCls} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="contact@etablissement.fr" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville / site">
          <input name="ville" defaultValue={initial?.ville ?? ""} placeholder="ex: Paris" className={inputCls} />
        </Field>
        <Field label="Type d'épreuve">
          <input name="type_epreuve" defaultValue={initial?.typeEpreuve ?? ""} placeholder="ex: Concours, Rattrapage…" className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date début">
          <input name="date_debut" type="date" defaultValue={initial?.dateDebut ?? ""} className={inputCls} />
        </Field>
        <Field label="Date fin">
          <input name="date_fin" type="date" defaultValue={initial?.dateFin ?? ""} className={inputCls} />
        </Field>
      </div>
      <Field label="Coefficient d'ajustement">
        <input name="coefficient" type="number" min="0.01" step="0.01" defaultValue={initial?.coefficient ?? 1} className={inputCls} />
        <p className="text-[11px] text-gray-400 mt-1">
          1,00 = aucun ajustement. Le coefficient représente une marge opérationnelle appliquée au volume horaire afin de couvrir les imprévus, renforts, remplacements, retards ou ajustements de dernière minute.
        </p>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Frais déplacement (€)">
          <input name="frais_deplacement" type="number" min="0" step="0.01" defaultValue={initial?.fraisDeplacement ?? 0} className={inputCls} />
        </Field>
        <Field label="Frais coordination (€)">
          <input name="frais_coordination" type="number" min="0" step="0.01" defaultValue={initial?.fraisCoordination ?? 0} className={inputCls} />
        </Field>
        <Field label="Remise (€)">
          <input name="remise" type="number" min="0" step="0.01" defaultValue={initial?.remise ?? 0} className={inputCls} />
        </Field>
      </div>
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

      <div className="pt-2 border-t border-gray-100">
        <h2 className="text-[13px] font-bold text-gray-900 mb-3">Répartition des salles par session</h2>
        <DevisSallesEditor initial={initialSalles} />
      </div>

      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50 transition-opacity"
          style={{ background: "var(--accent, #5B3DF5)" }}
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer le devis"}
        </button>
      </div>
    </form>
  );
}

export type ModeDialog = { mode: "create" } | { mode: "edit"; devis: Devis };

export function DevisFormDialog({
  dialog,
  devis,
  devisSalles,
  onClose,
}: {
  dialog: ModeDialog | null;
  devis: Devis[];
  devisSalles: DevisSalle[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit" ? await updateDevis(dialog.devis.id, fd) : await createDevis(fd);
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      const missionRef = "missionRef" in result ? result.missionRef : undefined;
      showToast(
        missionRef
          ? `${fd.get("reference")} accepté — mission ${missionRef} créée`
          : dialog.mode === "edit"
            ? `${fd.get("reference")} mis à jour`
            : `Devis ${fd.get("reference")} créé`,
      );
      const warning = "warning" in result ? result.warning : undefined;
      if (warning) showToast(warning, "error");
      onClose();
    });
  }

  return (
    <Dialog open={!!dialog} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialog?.mode === "edit" ? `Modifier — ${dialog.devis.reference}` : "Nouveau devis"}</DialogTitle>
        </DialogHeader>
        {dialog && (
          <DevisForm
            key={dialog.mode === "edit" ? dialog.devis.id : "create"}
            initial={dialog.mode === "edit" ? dialog.devis : undefined}
            initialSalles={dialog.mode === "edit" ? devisSalles.filter((s) => s.devisId === dialog.devis.id) : []}
            suggestedRef={suggestReference(devis)}
            pending={pending}
            onSubmit={submit}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
