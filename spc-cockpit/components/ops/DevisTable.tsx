"use client";

import { useState, useMemo, useTransition } from "react";
import type { Devis, DevisEquipe, DevisLigne, DevisSalle } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DevisSallesEditor } from "@/components/ops/DevisSallesEditor";
import { createDevis, updateDevis, deleteDevis, duplicateDevis } from "@/app/actions/devis";
import { showToast } from "@/components/Toast";
import { DevisBadge } from "@/components/ops/badges";
import { euro, dateFR } from "@/lib/operations/format";
import { Button, ButtonLink } from "@/components/ops/Button";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, Trash2, Eye, Copy } from "lucide-react";
import { calculateDevisTotauxComplets } from "@/lib/operations/engine";

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
  initialSalles,
  initialLignes,
  initialEquipe,
  suggestedRef,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Devis;
  initialSalles: DevisSalle[];
  initialLignes: DevisLigne[];
  initialEquipe: DevisEquipe[];
  suggestedRef: string;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  // Base HT saisie + paramètres : les totaux affichés viennent du moteur, comme à la lecture.
  const [ht, setHt] = useState(initial?.montantHTBase ?? initial?.montantHT ?? 0);
  const [coefficient, setCoefficient] = useState(initial?.coefficient ?? 1);
  const [fraisDeplacement, setFraisDeplacement] = useState(initial?.fraisDeplacement ?? 0);
  const [fraisCoordination, setFraisCoordination] = useState(initial?.fraisCoordination ?? 0);
  const [remise, setRemise] = useState(initial?.remise ?? 0);
  const totaux = calculateDevisTotauxComplets({
    montantHTBase: ht,
    coefficient: coefficient > 0 ? coefficient : 1,
    fraisDeplacement,
    fraisCoordination,
    remise,
    lignes: initialLignes,
    equipe: initialEquipe,
  });
  const detailPresent = initialLignes.length > 0 || initialEquipe.length > 0;

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
        <input name="coefficient" type="number" min="0.01" step="0.01" value={coefficient} onChange={(e) => setCoefficient(Number(e.target.value))} className={inputCls} />
        <p className="text-[11px] text-gray-400 mt-1">
          1,00 = aucun ajustement. Le coefficient représente une marge opérationnelle appliquée au volume horaire afin de couvrir les imprévus, renforts, remplacements, retards ou ajustements de dernière minute.
        </p>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Frais déplacement (€)">
          <input name="frais_deplacement" type="number" min="0" step="0.01" value={fraisDeplacement} onChange={(e) => setFraisDeplacement(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Frais coordination (€)">
          <input name="frais_coordination" type="number" min="0" step="0.01" value={fraisCoordination} onChange={(e) => setFraisCoordination(Number(e.target.value))} className={inputCls} />
        </Field>
        <Field label="Remise (€)">
          <input name="remise" type="number" min="0" step="0.01" value={remise} onChange={(e) => setRemise(Number(e.target.value))} className={inputCls} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant HT de base (€)">
          <input
            name="montant_ht" type="number" min="0" step="0.01" value={ht}
            onChange={(e) => setHt(Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Surveillants">
          <input name="nb_surveillants" type="number" min="0" defaultValue={initial?.nbSurveillants ?? 0} className={inputCls} />
        </Field>
      </div>
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px]" aria-live="polite">
        <div><div className="text-gray-500">Base brute HT</div><div className="font-semibold text-gray-900">{euro(totaux.baseBruteHT)}</div></div>
        <div><div className="text-gray-500">Total HT</div><div className="font-semibold text-gray-900">{euro(totaux.ht)}</div></div>
        <div><div className="text-gray-500">TVA</div><div className="font-semibold text-gray-900">{euro(totaux.tva)}</div></div>
        <div><div className="text-gray-500">Total TTC</div><div className="font-extrabold text-gray-900">{euro(totaux.ttc)}</div></div>
      </div>
      <p className="text-[11px] text-gray-400">
        Calculé automatiquement : base × coefficient + frais − remise, TVA appliquée une seule fois. Le TTC n&apos;est jamais saisi.
        {detailPresent && " Les lignes ou l'équipe du détail du devis remplacent la base saisie."}
      </p>

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
          style={{ background: ACCENT }}
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer le devis"}
        </button>
      </div>
    </form>
  );
}

export function DevisTable({
  devis,
  devisSalles = [],
  devisLignes = [],
  devisEquipe = [],
}: {
  devis: Devis[];
  devisSalles?: DevisSalle[];
  devisLignes?: DevisLigne[];
  devisEquipe?: DevisEquipe[];
}) {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; devis: Devis } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDuplicate(d: Devis) {
    startTransition(async () => {
      const result = await duplicateDevis(d.id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(`${d.reference} dupliqué en brouillon`);
        if (result.newId) router.push(`/operations/devis/${result.newId}`);
      }
    });
  }

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
        const missionRef = "missionRef" in result ? result.missionRef : undefined;
        showToast(
          missionRef
            ? `${fd.get("reference")} accepté — mission ${missionRef} créée`
            : dialog.mode === "edit" ? `${fd.get("reference")} mis à jour` : `Devis ${fd.get("reference")} créé`
        );
        const warning = "warning" in result ? result.warning : undefined;
        if (warning) showToast(warning, "error");
        setDialog(null);
      }
    });
  }

  function handleDelete(d: Devis) {
    const message = d.statut === "Accepté" || d.statut === "Facturé"
      ? `⚠️ ATTENTION : le devis ${d.reference} est ${d.statut.toUpperCase()}.\nIl peut être lié à une mission, une planification ou une facture.\n\nSupprimer quand même définitivement ?`
      : `Supprimer définitivement le devis ${d.reference} (${d.client}) ?`;
    if (!confirm(message)) return;
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
          <table className="w-full border-collapse min-w-[1040px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Référence", "Client", "Session", "Période", "Statut", "Montant HT", "Montant TTC", "Équipe", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-[13px] text-gray-400">Aucun devis ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">{d.reference}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold text-gray-800">{d.client}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 max-w-[200px] truncate">{d.session ?? "—"}</td>
                  <td className="px-5 py-3 text-[12px] text-gray-600 whitespace-nowrap">
                    {d.dateDebut ? `${dateFR(d.dateDebut)}${d.dateFin && d.dateFin !== d.dateDebut ? ` → ${dateFR(d.dateFin)}` : ""}` : "—"}
                  </td>
                  <td className="px-5 py-3"><DevisBadge statut={d.statut} /></td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 whitespace-nowrap">{euro(d.montantHT)}</td>
                  <td className="px-5 py-3 text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{euro(d.montantTTC)}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-500 whitespace-nowrap">{d.nbSurveillants} surv.</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <ButtonLink href={`/operations/devis/${d.id}`} variant="secondary" size="sm" aria-label={`Voir le devis ${d.reference}`}>
                        <Eye className="w-3.5 h-3.5" aria-hidden />Voir
                      </ButtonLink>
                      <Button variant="secondary" size="sm" onClick={() => setDialog({ mode: "edit", devis: d })} aria-label={`Modifier ${d.reference}`}>
                        <Pencil className="w-3.5 h-3.5" aria-hidden />Modifier
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDuplicate(d)} disabled={pending} aria-label={`Dupliquer ${d.reference}`}>
                        <Copy className="w-3.5 h-3.5" aria-hidden />Dupliquer
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(d)} disabled={pending} aria-label={`Supprimer ${d.reference}`}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Modifier — ${dialog.devis.reference}` : "Nouveau devis"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <DevisForm
              key={dialog.mode === "edit" ? dialog.devis.id : "create"}
              initial={dialog.mode === "edit" ? dialog.devis : undefined}
              initialSalles={dialog.mode === "edit" ? devisSalles.filter((s) => s.devisId === dialog.devis.id) : []}
              initialLignes={dialog.mode === "edit" ? devisLignes.filter((l) => l.devisId === dialog.devis.id) : []}
              initialEquipe={dialog.mode === "edit" ? devisEquipe.filter((e) => e.devisId === dialog.devis.id) : []}
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
