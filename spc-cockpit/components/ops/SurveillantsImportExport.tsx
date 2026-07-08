"use client";

import { useState, useRef, useTransition } from "react";
import type { Surveillant } from "@/lib/operations/types";
import { parseCSV, toCSV } from "@/lib/operations/csv";
import { buildImportPreview, type ImportPreview } from "@/lib/operations/surveillants-import";
import { importSurveillants, type ImportRowInput } from "@/app/actions/surveillants";
import { showToast } from "@/components/Toast";
import { Button } from "@/components/ops/Button";
import { UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Copy, X } from "lucide-react";

const EXPORT_HEADER = ["Prénom", "Nom", "Téléphone", "Email", "Rôle", "Disponibilité matin", "Disponibilité après-midi", "Statut", "Zone", "Observations"];

function downloadFile(name: string, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SurveillantsImportExport({ surveillants }: { surveillants: Surveillant[] }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xlsx" || ext === "xls") {
      showToast("Fichier Excel : ouvrez-le puis « Enregistrer sous » CSV (UTF-8), et réimportez le .csv.", "error");
      return;
    }
    if (ext !== "csv") {
      showToast("Format non accepté. Importez un fichier .csv (ou exportez votre Excel en CSV).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result ?? ""));
        if (rows.length < 2) { showToast("Fichier vide ou sans données.", "error"); return; }
        setPreview(buildImportPreview(rows, surveillants));
        setFileName(file.name);
        setOpen(true);
      } catch {
        showToast("Impossible de lire ce fichier CSV.", "error");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function doImport() {
    if (!preview) return;
    const rows: ImportRowInput[] = preview.rows
      .filter((r) => r.valid)
      .map((r) => ({
        nom: r.nomComplet,
        role: r.data.role || "Surveillant salle",
        statut: r.statutNormalise,
        email: r.data.email || null,
        telephone: r.data.telephone || null,
        qualifications: r.qualifications || null,
      }));
    if (!rows.length) { showToast("Aucune ligne valide à importer.", "error"); return; }
    startTransition(async () => {
      const res = await importSurveillants(rows, updateExisting);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`Import terminé : ${res.ajoutes} ajouté(s), ${res.misAJour} mis à jour, ${res.ignores} ignoré(s).`);
        setOpen(false);
        setPreview(null);
      }
    });
  }

  function exportCSV() {
    const rows = [
      EXPORT_HEADER,
      ...surveillants.map((s) => ["", s.nom, s.telephone ?? "", s.email ?? "", s.role, "", "", s.statut, "", s.qualifications ?? ""]),
    ];
    downloadFile(`SPC_surveillants_export_${today()}.csv`, toCSV(rows));
    showToast(`${surveillants.length} surveillant(s) exporté(s).`);
  }

  function downloadTemplate() {
    const rows = [
      EXPORT_HEADER,
      ["Marie", "Lecomte", "06 00 00 00 00", "marie.lecomte@email.com", "Coordinatrice", "Disponible", "Disponible", "Disponible", "Paris", "Référente"],
    ];
    downloadFile("SPC_modele_surveillants.csv", toCSV(rows));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 mb-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileSpreadsheet className="w-4.5 h-4.5" aria-hidden /></span>
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Import / Export CSV</h2>
            <p className="text-[12px] text-slate-500">Colonnes : Prénom · Nom · Téléphone · Email · Rôle · Dispo · Statut · Zone · Observations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}><Download className="w-3.5 h-3.5" aria-hidden />Modèle</Button>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download className="w-3.5 h-3.5" aria-hidden />Exporter</Button>
        </div>
      </div>

      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragOver ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60"}`}
      >
        <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${dragOver ? "text-indigo-500" : "text-slate-400"}`} aria-hidden />
        <div className="text-[13.5px] font-semibold text-gray-800">Déposez votre fichier ici ou cliquez pour parcourir</div>
        <div className="text-[12px] text-slate-400 mt-0.5">.csv — Excel : « Enregistrer sous » CSV avant l&apos;import</div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </div>

      {/* Aperçu */}
      {open && preview && (
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 flex-wrap">
            <div className="text-[12.5px] text-slate-600">
              <span className="font-bold text-gray-900">Aperçu — {fileName}</span> · {preview.total} ligne(s) ·
              <span className="text-emerald-600 font-semibold"> {preview.valides} valide(s)</span> ·
              <span className="text-amber-600 font-semibold"> {preview.aCorriger} à corriger</span> ·
              <span className="text-sky-600 font-semibold"> {preview.doublons} doublon(s)</span>
            </div>
            <button onClick={() => { setOpen(false); setPreview(null); }} className="text-slate-400 hover:text-slate-600" aria-label="Fermer l'aperçu"><X className="w-4 h-4" /></button>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Nom complet", "Téléphone", "Email", "Rôle", "Statut", "État"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-[10.5px] font-bold text-slate-400 uppercase tracking-[.6px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40">
                    <td className="px-4 py-2 text-[12.5px] font-semibold text-gray-800">{r.nomComplet || <span className="text-rose-500">—</span>}</td>
                    <td className="px-4 py-2 text-[12px] text-slate-600">{r.data.telephone || "—"}</td>
                    <td className="px-4 py-2 text-[12px] text-slate-600 truncate max-w-[180px]">{r.data.email || "—"}</td>
                    <td className="px-4 py-2 text-[12px] text-slate-600">{r.data.role || "Surveillant salle"}</td>
                    <td className="px-4 py-2 text-[12px] text-slate-600">{r.statutNormalise}</td>
                    <td className="px-4 py-2">
                      {r.errors.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />{r.errors.join(", ")}</span>
                      ) : r.duplicate ? (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-sky-600"><Copy className="w-3.5 h-3.5" aria-hidden />Doublon</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden />Valide</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 flex-wrap">
            <label className="flex items-center gap-2 text-[12.5px] text-slate-600 cursor-pointer">
              <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              Mettre à jour les doublons existants (sinon ignorés)
            </label>
            <Button variant="accent" size="sm" onClick={doImport} disabled={pending}>
              {pending ? "Import…" : `Importer ${preview.valides} surveillant(s)`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
