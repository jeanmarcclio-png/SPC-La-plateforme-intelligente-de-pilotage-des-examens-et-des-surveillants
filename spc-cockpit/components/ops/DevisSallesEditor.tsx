"use client";

import { useState, useRef, useMemo } from "react";
import type { DevisSalle } from "@/lib/operations/types";
import { calculateRoomBillableHours, formatHours, type Period } from "@/lib/operations/engine";
import { Plus, Trash2 } from "lucide-react";

const NAVY = "#0d2137";

type Session = "matin" | "apres-midi";

interface SalleRow {
  key: string;
  salle: string;
  etudiants: number;
  surveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
  debut: string;
  fin: string;
  observations: string;
}

// Payload sérialisé soumis au serveur (ordre calculé à la volée).
export interface SallePayload {
  session: Session;
  salle: string;
  etudiants: number;
  surveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
  debut: string;
  fin: string;
  observations: string;
  ordre: number;
}

const OBS_SUGGESTIONS = ["Salle renforcée", "Fin décalée", "Oral", "Surveillance spécifique", "Besoin renfort", "Tiers temps long"];

function toRow(s: DevisSalle, i: number): SalleRow {
  return {
    key: `init-${s.id ?? i}-${i}`,
    salle: s.salle,
    etudiants: s.etudiants,
    surveillants: s.surveillants,
    pmr: s.pmr,
    tiersTemps: s.tiersTemps,
    debut: s.debut ?? "",
    fin: s.fin ?? "",
    observations: s.observations ?? "",
  };
}

function billableHours(r: SalleRow, period: Period): number {
  return calculateRoomBillableHours({
    id: r.key,
    period,
    roomCode: r.salle,
    startTime: r.debut || null,
    endTime: r.fin || null,
    requiredSupervisors: r.surveillants,
  });
}

const inputCls =
  "w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400";

export function DevisSallesEditor({ initial }: { initial: DevisSalle[] }) {
  const seq = useRef(0);
  const newKey = () => `row-${seq.current++}`;

  const initMatin = initial.filter((s) => s.session === "matin").sort((a, b) => a.ordre - b.ordre);
  const initApm = initial.filter((s) => s.session === "apres-midi").sort((a, b) => a.ordre - b.ordre);

  const [matin, setMatin] = useState<SalleRow[]>(initMatin.map(toRow));
  const [apm, setApm] = useState<SalleRow[]>(initApm.map(toRow));

  // Horaires globaux de session — préremplissent les nouvelles lignes.
  const [gMatin, setGMatin] = useState({ debut: initMatin[0]?.debut ?? "08:30", fin: initMatin[0]?.fin ?? "11:30" });
  const [gApm, setGApm] = useState({ debut: initApm[0]?.debut ?? "13:30", fin: initApm[0]?.fin ?? "17:00" });

  const payload = useMemo<SallePayload[]>(() => {
    const build = (rows: SalleRow[], session: Session): SallePayload[] =>
      rows
        .filter((r) => r.salle.trim())
        .map((r, i) => ({
          session, salle: r.salle.trim(), etudiants: r.etudiants, surveillants: r.surveillants,
          pmr: r.pmr, tiersTemps: r.tiersTemps, debut: r.debut, fin: r.fin, observations: r.observations.trim(), ordre: i + 1,
        }));
    return [...build(matin, "matin"), ...build(apm, "apres-midi")];
  }, [matin, apm]);

  return (
    <div className="space-y-5">
      <input type="hidden" name="salles_json" value={JSON.stringify(payload)} />

      <SessionTable
        titre="Répartition des salles — Session du matin"
        rows={matin}
        setRows={setMatin}
        global={gMatin}
        setGlobal={setGMatin}
        addLabel="Ajouter une salle matin"
        newKey={newKey}
      />
      <SessionTable
        titre="Répartition des salles — Session de l'après-midi"
        rows={apm}
        setRows={setApm}
        global={gApm}
        setGlobal={setGApm}
        addLabel="Ajouter une salle après-midi"
        newKey={newKey}
      />

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-[12.5px] text-gray-700 flex flex-wrap gap-x-6 gap-y-1">
        <span className="font-semibold text-gray-500">Volume horaire facturable</span>
        <span>Matin : <strong>{formatHours(matin.reduce((s, r) => s + billableHours(r, "morning"), 0))}</strong></span>
        <span>Après-midi : <strong>{formatHours(apm.reduce((s, r) => s + billableHours(r, "afternoon"), 0))}</strong></span>
        <span className="text-blue-700">Total : <strong>{formatHours(matin.reduce((s, r) => s + billableHours(r, "morning"), 0) + apm.reduce((s, r) => s + billableHours(r, "afternoon"), 0))}</strong></span>
      </div>
    </div>
  );
}

function SessionTable({
  titre, rows, setRows, global, setGlobal, addLabel, newKey,
}: {
  titre: string;
  rows: SalleRow[];
  setRows: React.Dispatch<React.SetStateAction<SalleRow[]>>;
  global: { debut: string; fin: string };
  setGlobal: React.Dispatch<React.SetStateAction<{ debut: string; fin: string }>>;
  addLabel: string;
  newKey: () => string;
}) {
  function update(key: string, patch: Partial<SalleRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((prev) => [
      ...prev,
      { key: newKey(), salle: "", etudiants: 0, surveillants: 1, pmr: false, tiersTemps: false, debut: global.debut, fin: global.fin, observations: "" },
    ]);
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  const tSalles = rows.filter((r) => r.salle.trim()).length;
  const tEtud = rows.reduce((s, r) => s + (r.etudiants || 0), 0);
  const tSurv = rows.reduce((s, r) => s + (r.surveillants || 0), 0);
  const tPmr = rows.filter((r) => r.pmr).length;
  const tTt = rows.filter((r) => r.tiersTemps).length;

  return (
    <section>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <h3 className="text-[13.5px] font-bold text-gray-900">{titre}</h3>
        <div className="flex items-center gap-2 text-[11.5px] text-gray-500">
          <span className="font-semibold uppercase tracking-[.5px] text-gray-400">Horaires session</span>
          <input type="time" aria-label={`Début session ${titre}`} value={global.debut} onChange={(e) => setGlobal((g) => ({ ...g, debut: e.target.value }))} className="px-2 py-1 rounded-lg border border-gray-200 text-[12px] font-mono" />
          <span className="text-gray-300">–</span>
          <input type="time" aria-label={`Fin session ${titre}`} value={global.fin} onChange={(e) => setGlobal((g) => ({ ...g, fin: e.target.value }))} className="px-2 py-1 rounded-lg border border-gray-200 text-[12px] font-mono" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr style={{ background: NAVY }}>
              {["Salle", "Étud.", "Surv.", "PMR", "Tiers-t.", "Début", "Fin", "Observations", ""].map((h, i) => (
                <th key={i} className={`px-2.5 py-2 text-[10.5px] font-bold text-white/80 uppercase tracking-[.6px] ${i >= 1 && i <= 6 ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-5 text-center text-[12.5px] text-gray-400">Aucune salle — cliquez sur « {addLabel} ».</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="border-b border-gray-100 last:border-0">
                  <td className="px-2.5 py-1.5">
                    <input value={r.salle} maxLength={6} onChange={(e) => update(r.key, { salle: e.target.value.toUpperCase() })} placeholder="A21" className={`${inputCls} font-mono w-[72px]`} />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input type="number" min={0} value={r.etudiants} onChange={(e) => update(r.key, { etudiants: Number(e.target.value) })} className={`${inputCls} w-[64px] text-center`} />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input type="number" min={0} value={r.surveillants} onChange={(e) => update(r.key, { surveillants: Number(e.target.value) })} className={`${inputCls} w-[58px] text-center`} />
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    <input type="checkbox" checked={r.pmr} onChange={(e) => update(r.key, { pmr: e.target.checked })} aria-label="PMR" className="w-4 h-4 accent-amber-500" />
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    <input type="checkbox" checked={r.tiersTemps} onChange={(e) => update(r.key, { tiersTemps: e.target.checked })} aria-label="Tiers-temps" className="w-4 h-4 accent-sky-500" />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input type="time" value={r.debut} onChange={(e) => update(r.key, { debut: e.target.value })} className={`${inputCls} font-mono w-[92px]`} />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input type="time" value={r.fin} onChange={(e) => update(r.key, { fin: e.target.value })} className={`${inputCls} font-mono w-[92px]`} />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <input value={r.observations} list="obs-suggestions" onChange={(e) => update(r.key, { observations: e.target.value })} placeholder="ex : salle renforcée" className={`${inputCls} min-w-[150px]`} />
                  </td>
                  <td className="px-2.5 py-1.5 text-center">
                    <button type="button" onClick={() => remove(r.key)} aria-label={`Supprimer la salle ${r.salle || ""}`} title="Supprimer la ligne" className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-500 hover:bg-red-100 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
              <td className="px-2.5 py-2 text-[12px] font-extrabold text-gray-900 whitespace-nowrap">{tSalles} salle{tSalles > 1 ? "s" : ""}</td>
              <td className="px-2.5 py-2 text-[12.5px] font-extrabold text-gray-900 text-center">{tEtud}</td>
              <td className="px-2.5 py-2 text-[12.5px] font-extrabold text-gray-900 text-center">{tSurv}</td>
              <td className="px-2.5 py-2 text-[12px] font-semibold text-amber-600 text-center">{tPmr}</td>
              <td className="px-2.5 py-2 text-[12px] font-semibold text-sky-600 text-center">{tTt}</td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button type="button" onClick={add} className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-[12.5px] font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
        <Plus className="w-3.5 h-3.5" />
        {addLabel}
      </button>
      <datalist id="obs-suggestions">
        {OBS_SUGGESTIONS.map((o) => <option key={o} value={o} />)}
      </datalist>
    </section>
  );
}
