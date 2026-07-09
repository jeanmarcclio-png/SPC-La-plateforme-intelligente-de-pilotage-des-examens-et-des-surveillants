"use client";

import { useState, useMemo, useTransition } from "react";
import type { Surveillant } from "@/lib/operations/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSurveillant, updateSurveillant, deleteSurveillant } from "@/app/actions/surveillants";
import { showToast } from "@/components/Toast";
import { SurvBadge } from "@/components/ops/badges";
import { Button } from "@/components/ops/Button";
import { Search, Plus, Pencil, Trash2, Star } from "lucide-react";

const ACCENT = "#2563eb";
const ROLES = ["Coordinatrice", "Surveillant salle", "Surveillant volant", "Surveillant PMR"];
const STATUTS = ["Disponible", "Planifié", "Annulé", "Indisponible"];
const AVATAR_COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#2563eb"];

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

function SurveillantForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Surveillant;
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
      <Field label="Nom complet *">
        <input name="nom" required defaultValue={initial?.nom} placeholder="ex: Marie Lecomte" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rôle">
          <select name="role" defaultValue={initial?.role ?? "Surveillant salle"} className={inputCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select name="statut" defaultValue={initial?.statut ?? "Disponible"} className={inputCls}>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="prenom@spc.fr" className={inputCls} />
        </Field>
        <Field label="Téléphone">
          <input name="telephone" defaultValue={initial?.telephone ?? ""} placeholder="06 12 34 56 78" className={inputCls} />
        </Field>
      </div>
      <Field label="Qualifications">
        <input name="qualifications" defaultValue={initial?.qualifications ?? ""} placeholder="ex: PMR · Tiers-temps · Coordination" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Taux horaire (€)">
          <input name="taux_horaire" type="number" min="0" step="0.5" defaultValue={initial?.tauxHoraire ?? 18} className={inputCls} />
        </Field>
        <Field label="Note (/5)">
          <input name="note" type="number" min="0" max="5" step="0.1" defaultValue={initial?.note ?? 0} className={inputCls} />
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
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}

export function SurveillantsTable({ surveillants }: { surveillants: Surveillant[] }) {
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [role, setRole] = useState("");
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; surveillant: Surveillant } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return surveillants.filter((s) => {
      if (q && !s.nom.toLowerCase().includes(q) && !(s.qualifications ?? "").toLowerCase().includes(q)) return false;
      if (statut && s.statut !== statut) return false;
      if (role && s.role !== role) return false;
      return true;
    });
  }, [surveillants, search, statut, role]);

  function submit(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const result = dialog.mode === "edit"
        ? await updateSurveillant(dialog.surveillant.id, fd)
        : await createSurveillant(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(dialog.mode === "edit" ? `"${fd.get("nom")}" mis à jour` : `"${fd.get("nom")}" ajouté à l'équipe`);
        setDialog(null);
      }
    });
  }

  function handleDelete(s: Surveillant) {
    if (!confirm(`Supprimer définitivement "${s.nom}" de l'équipe ?`)) return;
    startTransition(async () => {
      const result = await deleteSurveillant(s.id);
      if (result.error) showToast(result.error, "error");
      else showToast(`"${s.nom}" supprimé`);
    });
  }

  const hasFilters = search || statut || role;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[190px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un surveillant…"
            className="w-full pl-8 pr-3 py-2 text-[12.5px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400"
          />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="text-[12px] bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-600 focus:outline-none">
          <option value="">Tous rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="text-[12px] bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-600 focus:outline-none">
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatut(""); setRole(""); }} className="text-[11.5px] text-gray-400 hover:text-red-500 px-2 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Effacer ✕
          </button>
        )}
        <button
          onClick={() => setDialog({ mode: "create" })}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: ACCENT }}
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un surveillant
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Surveillant", "Contact", "Qualifications", "Statut", "Heures", "Taux", "Note", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-[13px] text-gray-400">Aucun surveillant ne correspond aux filtres.</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                      >
                        {s.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-gray-800">{s.nom}</div>
                        <div className="text-[11.5px] text-gray-400">{s.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-[12px] text-gray-600">{s.email ?? "—"}</div>
                    <div className="text-[11.5px] text-gray-400">{s.telephone ?? ""}</div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-gray-500 max-w-[180px] truncate">{s.qualifications || "—"}</td>
                  <td className="px-5 py-3"><SurvBadge statut={s.statut} /></td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 whitespace-nowrap">{s.heures}h</td>
                  <td className="px-5 py-3 text-[13px] text-gray-700 whitespace-nowrap">{s.tauxHoraire.toFixed(2).replace(".", ",")} €/h</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />{s.note.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDialog({ mode: "edit", surveillant: s })}
                        aria-label={`Modifier ${s.nom}`}
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden />
                        Modifier
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(s)}
                        disabled={pending}
                        aria-label={`Supprimer ${s.nom}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog ajout / modification */}
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? `Modifier — ${dialog.surveillant.nom}` : "Nouveau surveillant"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <SurveillantForm
              initial={dialog.mode === "edit" ? dialog.surveillant : undefined}
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
