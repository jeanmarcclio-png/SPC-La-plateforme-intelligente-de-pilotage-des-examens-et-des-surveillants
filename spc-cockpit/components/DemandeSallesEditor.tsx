"use client";

import { useState, useRef, useMemo } from "react";
import type { DemandeSalle } from "@/lib/operations/types";
import { parseSallesFromText } from "@/lib/operations/demandes-constants";
import { Plus, Copy, Trash2, ClipboardPaste, Upload, X } from "lucide-react";

const NAVY = "#0d2137";

type Row = DemandeSalle & { key: string };

const inputCls =
  "w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400";

function blankRow(key: string, defaults?: Partial<DemandeSalle>): Row {
  return {
    key,
    dateExamen: defaults?.dateExamen ?? "",
    creneau: defaults?.creneau ?? "matin",
    salle: "",
    batiment: defaults?.batiment ?? "",
    etudiants: 0,
    surveillants: 1,
    pmr: false,
    tiersTemps: false,
    debutExamen: defaults?.debutExamen ?? "",
    finExamen: defaults?.finExamen ?? "",
    debutSurveillance: defaults?.debutSurveillance ?? "",
    finSurveillance: defaults?.finSurveillance ?? "",
    observations: "",
    ordre: 0,
  };
}

export function DemandeSallesEditor({ initial = [] }: { initial?: DemandeSalle[] }) {
  const seq = useRef(0);
  const newKey = () => `dc-${seq.current++}`;
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((s, i) => ({ ...s, key: `init-${i}` }))
      : [blankRow("init-0", { creneau: "matin", debutSurveillance: "08:30", finSurveillance: "11:30" })],
  );

  function update(key: string, patch: Partial<DemandeSalle>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, blankRow(newKey(), last ? { dateExamen: last.dateExamen, creneau: last.creneau, debutSurveillance: last.debutSurveillance, finSurveillance: last.finSurveillance } : undefined)]);
  }
  function duplicate(key: string) {
    setRows((prev) => {
      const src = prev.find((r) => r.key === key);
      if (!src) return prev;
      const idx = prev.findIndex((r) => r.key === key);
      const copy = { ...src, key: newKey() };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  // ── Import : coller depuis Excel / fichier .xlsx / .csv (spec §9 & §10) ──
  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importInfo, setImportInfo] = useState<string | null>(null);

  function appendSalles(newSalles: DemandeSalle[]) {
    setRows((prev) => [...prev.filter((r) => r.salle.trim()), ...newSalles.map((s) => ({ ...s, key: newKey() }))]);
  }
  function doPaste() {
    const { salles, errors } = parseSallesFromText(pasteText);
    setImportErrors(errors);
    setImportInfo(salles.length ? `${salles.length} ligne(s) importée(s).` : null);
    if (salles.length) { appendSalles(salles); setPasteText(""); }
  }
  async function doFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let text = "";
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        text = await file.text();
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer());
        text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      }
      const { salles, errors } = parseSallesFromText(text);
      setImportErrors(errors);
      setImportInfo(salles.length ? `${salles.length} ligne(s) importée(s) depuis « ${file.name} ».` : "Aucune ligne exploitable.");
      if (salles.length) appendSalles(salles);
    } catch {
      setImportErrors(["Fichier illisible — formats acceptés : .xlsx, .xls, .csv."]);
    } finally {
      e.target.value = "";
    }
  }

  // Payload sérialisé (ordre calculé à la volée).
  const payload = useMemo(
    () => rows.filter((r) => r.salle.trim()).map((r, i) => ({ ...r, ordre: i + 1, key: undefined })),
    [rows],
  );

  const totalEtud = rows.reduce((s, r) => s + (r.etudiants || 0), 0);
  const totalSurv = rows.reduce((s, r) => s + (r.surveillants || 0), 0);
  const totalSalles = rows.filter((r) => r.salle.trim()).length;

  return (
    <div className="space-y-2.5">
      <input type="hidden" name="salles_json" value={JSON.stringify(payload)} />

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full border-collapse min-w-[1120px]">
          <thead>
            <tr style={{ background: NAVY }}>
              {["Date", "Créneau", "Salle", "Bât.", "Étud.", "Surv.", "PMR", "T.-t.", "Début exam.", "Fin exam.", "Début surv.", "Fin surv.", "Observations", ""].map((h, i) => (
                <th key={i} className={`px-2.5 py-2 text-[10px] font-bold text-white/80 uppercase tracking-[.5px] whitespace-nowrap ${i >= 4 && i <= 11 ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={14} className="px-3 py-5 text-center text-[12.5px] text-gray-400">Aucune salle — ajoutez une ligne.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-1.5"><input type="date" value={r.dateExamen} onChange={(e) => update(r.key, { dateExamen: e.target.value })} className={`${inputCls} w-[140px]`} /></td>
                  <td className="px-2 py-1.5">
                    <select value={r.creneau} onChange={(e) => update(r.key, { creneau: e.target.value as "matin" | "apres-midi" })} className={`${inputCls} w-[104px]`}>
                      <option value="matin">Matin</option>
                      <option value="apres-midi">Après-midi</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input value={r.salle} maxLength={8} onChange={(e) => update(r.key, { salle: e.target.value.toUpperCase() })} placeholder="A21" className={`${inputCls} font-mono w-[72px]`} /></td>
                  <td className="px-2 py-1.5"><input value={r.batiment} maxLength={6} onChange={(e) => update(r.key, { batiment: e.target.value })} placeholder="A" className={`${inputCls} w-[56px]`} /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} value={r.etudiants} onChange={(e) => update(r.key, { etudiants: Number(e.target.value) })} className={`${inputCls} w-[62px] text-center`} /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} value={r.surveillants} onChange={(e) => update(r.key, { surveillants: Number(e.target.value) })} className={`${inputCls} w-[56px] text-center`} /></td>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={r.pmr} onChange={(e) => update(r.key, { pmr: e.target.checked })} aria-label="PMR" className="w-4 h-4 accent-amber-500" /></td>
                  <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={r.tiersTemps} onChange={(e) => update(r.key, { tiersTemps: e.target.checked })} aria-label="Tiers-temps" className="w-4 h-4 accent-sky-500" /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.debutExamen} onChange={(e) => update(r.key, { debutExamen: e.target.value })} className={`${inputCls} font-mono w-[90px]`} /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.finExamen} onChange={(e) => update(r.key, { finExamen: e.target.value })} className={`${inputCls} font-mono w-[90px]`} /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.debutSurveillance} onChange={(e) => update(r.key, { debutSurveillance: e.target.value })} className={`${inputCls} font-mono w-[90px]`} /></td>
                  <td className="px-2 py-1.5"><input type="time" value={r.finSurveillance} onChange={(e) => update(r.key, { finSurveillance: e.target.value })} className={`${inputCls} font-mono w-[90px]`} /></td>
                  <td className="px-2 py-1.5"><input value={r.observations} onChange={(e) => update(r.key, { observations: e.target.value })} placeholder="ex : salle renforcée" className={`${inputCls} min-w-[150px]`} /></td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => duplicate(r.key)} aria-label="Dupliquer la ligne" title="Dupliquer" className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => remove(r.key)} aria-label="Supprimer la ligne" title="Supprimer" className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50/50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
              <td colSpan={4} className="px-2.5 py-2 text-[12px] font-extrabold text-gray-900 whitespace-nowrap">{totalSalles} salle{totalSalles > 1 ? "s" : ""}</td>
              <td className="px-2.5 py-2 text-[12.5px] font-extrabold text-gray-900 text-center">{totalEtud}</td>
              <td className="px-2.5 py-2 text-[12.5px] font-extrabold text-gray-900 text-center">{totalSurv}</td>
              <td colSpan={8}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-[12.5px] font-semibold text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Ajouter une salle
        </button>
        <button type="button" onClick={() => { setShowImport((v) => !v); setImportInfo(null); setImportErrors([]); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-gray-300 transition-colors">
          <ClipboardPaste className="w-3.5 h-3.5" /> Coller / importer depuis Excel
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] font-semibold text-gray-600 hover:border-gray-300 transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> Fichier .xlsx / .csv
          <input type="file" accept=".xlsx,.xls,.csv" onChange={doFile} className="hidden" />
        </label>
      </div>

      {showImport && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-gray-700">Coller depuis Excel</div>
            <button type="button" onClick={() => setShowImport(false)} aria-label="Fermer" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[11px] text-gray-400">Colonnes : Date · Créneau · Salle · Bâtiment · Étudiants · Surveillants · PMR · Tiers-temps · Début/Fin examen · Début/Fin surveillance · Observations. Séparateur tab, « ; » ou « , ».</p>
          <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4} placeholder={"12/01/2026\tMatin\tA21\tA\t120\t3\toui\toui\t09:00\t11:00\t08:30\t11:30\tsalle renforcée"} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[12px] font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/25" />
          <button type="button" onClick={doPaste} disabled={!pasteText.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-40" style={{ background: "var(--color-primary)" }}>
            Analyser & ajouter
          </button>
        </div>
      )}

      {(importInfo || importErrors.length > 0) && (
        <div className="space-y-1">
          {importInfo && <div className="text-[11.5px] text-[var(--color-primary)] font-medium">{importInfo}</div>}
          {importErrors.length > 0 && (
            <ul className="text-[11px] text-red-500 space-y-0.5">
              {importErrors.slice(0, 5).map((e, i) => <li key={i}>· {e}</li>)}
              {importErrors.length > 5 && <li>· … +{importErrors.length - 5} autre(s)</li>}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        Les heures de <strong>surveillance</strong> (≠ heures d&apos;examen) serviront au calcul des heures facturables après conversion en mission.
      </p>
    </div>
  );
}
