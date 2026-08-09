"use client";

import type { Mission } from "@/lib/operations/types";
import { MISSION_STATUTS, statutOptions } from "@/lib/operations/mission-status";
import { useSoumissionUnique } from "@/components/ops/useSoumissionUnique";

// Formulaire de création / édition d'une mission.
// Champs et noms de champs INCHANGÉS (contrat des Server Actions
// createMission / updateMission) : la refonte visuelle ne touche pas au CRUD.

export const TYPES_EXAMEN = ["Examen écrit", "Examen oral", "Concours", "Certification RNCP", "Partiels"];

const champ =
  "w-full px-3 py-2.5 rounded-xl border border-[#E3E8F1] text-[13px] text-[#11182D] focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300";

export function nextReference(missions: Mission[]): string {
  const year = missions[0]?.reference.match(/^EX-(\d{4})-/)?.[1] ?? String(new Date().getFullYear());
  const max = missions.reduce((acc, m) => {
    const n = Number(m.reference.match(/^EX-\d{4}-(\d+)$/)?.[1] ?? 0);
    return Math.max(acc, n);
  }, 0);
  return `EX-${year}-${String(max + 1).padStart(3, "0")}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-[#64708A] mb-1">{label}</label>
      {children}
    </div>
  );
}

export function MissionForm({
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
  // Verrou SYNCHRONE contre la rafale de clics (BUG-012) : `disabled={pending}`
  // ne bascule qu'au rendu suivant et laissait passer 3 soumissions.
  const soumettre = useSoumissionUnique(onSubmit, pending);

  return (
    <form
      onSubmit={soumettre}
      className="space-y-3.5 mt-1"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Référence *">
          <input name="reference" required defaultValue={initial?.reference ?? suggestedRef} className={`${champ} font-mono`} />
        </Field>
        <Field label="Date">
          <input name="date_mission" type="date" defaultValue={initial?.dateMission ?? ""} className={champ} />
        </Field>
      </div>
      <Field label="Client *">
        <input name="client" required defaultValue={initial?.client} placeholder="ex : ICP Paris" className={champ} />
      </Field>
      <Field label="Session">
        <input name="session" defaultValue={initial?.session ?? ""} placeholder="ex : Session principale — mai 2026" className={champ} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select name="type" defaultValue={initial?.type ?? "Examen écrit"} className={champ}>
            {TYPES_EXAMEN.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          {/* Seules les transitions LÉGALES depuis le statut courant sont
              proposées (audit QA forensic V2, BUG-011) : le formulaire offrait
              les 11 statuts, si bien qu'une mission « Terminée » pouvait
              repasser en « Brouillon ». Le Server Action revalide de son côté. */}
          <select name="statut" defaultValue={initial?.statut ?? "Planifiée"} className={champ}>
            {(initial ? statutOptions(initial.statut) : MISSION_STATUTS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Salles">
          <input name="nb_salles" type="number" min="1" defaultValue={initial?.nbSalles ?? 1} className={champ} />
        </Field>
        <Field label="Surveillants">
          <input name="nb_surveillants" type="number" min="1" defaultValue={initial?.nbSurveillants ?? 1} className={champ} />
        </Field>
        <Field label="Montant HT (€)">
          <input name="montant_ht" type="number" min="0" step="0.01" defaultValue={initial?.montantHT ?? 0} className={champ} />
        </Field>
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[40px] rounded-xl border border-[#E3E8F1] text-[13px] font-semibold text-[#64708A] hover:bg-slate-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 min-h-[40px] rounded-xl text-white text-[13px] font-semibold bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la mission"}
        </button>
      </div>
    </form>
  );
}
