"use client";

import { useState, useMemo, useTransition } from "react";
import type { Mission } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createMission, updateMission, deleteMission } from "@/app/actions/missions";
import { showToast } from "@/components/Toast";
import { MissionBadge } from "@/components/ops/badges";
import { euro, dateFR } from "@/lib/operations/format";
import { Search, Plus, Pencil, Trash2, Briefcase } from "lucide-react";

const ACCENT = "#2563eb";
const TYPES = ["Examen écrit", "Examen oral", "Concours", "Certification RNCP", "Partiels"];
const STATUTS = ["Planifiée", "Validée", "En cours", "Terminée", "Annulée"];

function nextReference(missions: Mission[]): string {
  const year = missions[0]?.reference.match(/^EX-(\d{4})-/)?.[1] ?? "2026";
  const max = missions.reduce((acc, m) => {
    const n = Number(m.reference.match(/^EX-\d{4}-(\d+)$/)?.[1] ?? 0);
    return Math.max(acc, n);
  }, 0);
  return `EX-${year}-${String(max + 1).padStart(3, "0")}`;
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

function MissionForm({
  initial,
  suggestedRef,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Mission;
  suggestedRef: string;
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Référence *">
          <input name="reference" required defaultValue={initial?.reference ?? suggestedRef} className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Date">
          <input name="date_mission" type="date" defaultValue={initial?.dateMission ?? ""} className={inputCls} />
        </Field>
      </div>
      <Field label="Client *">
        <input name="client" required defaultValue={initial?.client} placeholder="ex: ICP Paris" className={inputCls} />
      </Field>
      <Field label="Session">
        <input name="session" defaultValue={initial?.session ?? ""} placeholder="ex: Session principale — mai 2026" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select name="type" defaultValue={initial?.type ?? "Examen écrit"} className={inputCls}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select name="statut" defaultValue={initial?.statut ?? "Planifiée"} className={inputCls}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Salles">
          <input name="nb_salles" type="number" min="1" defaultValue={initial?.nbSalles ?? 1} className={inputCls} />
        </Field>
        <Field label="Surveillants">
          <input name="nb_surveillants" type="number" min="1" defaultValue={initial?.nbSurveillants ?? 1} className={inputCls} />
        </Field>
        <Field label="Montant HT (€)">
          <input name="montant_ht" type="number" min="0" step="0.01" defaultValue={initial?.montantHT ?? 0} className={inputCls} />
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
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la mission"}
        </button>
      </div>
    </form>
  );
}

export function MissionsTable({ missions }: { missions: Mission[] }) {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; mission: Mission } | null>(null);
  const [pending, startTransition] = useTransition();

  const active = useMemo(
    () => missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Planifiée"),
    [missions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return missions.filter((m) => {
      if (q && !m.client.toLowerCase().includes(q) && !m.reference.toLowerCase().includes(q) && !(m.session ?? "").toLowerCase().includes(q)) return false;
      if (statut && m.statut !== statut) return false;
      return true;
    });
  }, [missions, search, statut]);

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateMission(dialog.mission.id, fd)
        : await createMission(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? `${fd.get("reference")} mise à jour` : `Mission ${fd.get("reference")} créée`);
        setDialog(null);
      }
    });
  }

  function handleDelete(m: Mission) {
    if (!confirm(`Supprimer définitivement la mission ${m.reference} (${m.client}) ?`)) return;
    startTransition(async () => {
      const result = await deleteMission(m.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`${m.reference} supprimée`);
    });
  }

  return (
    <>
      {/* Mission active */}
      {active && (
        <div className="rounded-2xl p-5 mb-5 text-white shadow-sm" style={{ background: "#0d2137" }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#7fb2ff]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT }} />
                Mission {active.statut === "En cours" ? "active" : "à venir"}
              </div>
              <div className="text-[17px] font-extrabold mt-1">
                {active.client} — {dateFR(active.dateMission)}
              </div>
              {active.session && <div className="text-[12.5px] text-white/50 mt-0.5">{active.session}</div>}
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Salles</div>
                <div className="text-[20px] font-extrabold">{active.nbSalles}</div>
              </div>
              <div className="text-center">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Surveillants</div>
                <div className="text-[20px] font-extrabold">{active.nbSurveillants}</div>
              </div>
              <div className="text-center">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/40">Montant estimé HT</div>
                <div className="text-[20px] font-extrabold">{euro(active.montantHT)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[190px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une mission, un client…"
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
          Nouvelle mission
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Référence", "Client", "Date", "Type", "Volume", "Montant HT", "Statut", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-[13px] text-gray-400">Aucune mission ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                  <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {m.id === active?.id && <Briefcase className="w-3 h-3" style={{ color: ACCENT }} />}
                      {m.reference}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[13px] font-semibold text-gray-800">{m.client}</div>
                    {m.session && <div className="text-[11.5px] text-gray-400">{m.session}</div>}
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(m.dateMission)}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{m.type}</td>
                  <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{m.nbSalles} salles · {m.nbSurveillants} surv.</td>
                  <td className="px-5 py-3 text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{euro(m.montantHT)}</td>
                  <td className="px-5 py-3"><MissionBadge statut={m.statut} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDialog({ mode: "edit", mission: m })}
                        title={`Modifier ${m.reference}`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={pending}
                        title={`Supprimer ${m.reference}`}
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

      {/* Dialog */}
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Modifier — ${dialog.mission.reference}` : "Nouvelle mission"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <MissionForm
              initial={dialog.mode === "edit" ? dialog.mission : undefined}
              suggestedRef={nextReference(missions)}
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
