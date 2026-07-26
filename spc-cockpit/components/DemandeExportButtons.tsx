"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, FolderArchive } from "lucide-react";
import { useTenant } from "@/lib/tenant/TenantContext";
import { buildDemandeSheets, buildDemandePrintHtml, buildDossierReadme, demandeFileBase, dossierFileBase } from "@/lib/operations/demande-export";
import { getDossierPieces } from "@/app/actions/demandes";
import type { DemandeClient } from "@/lib/operations/types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DemandeExportButtons({ demande }: { demande: DemandeClient }) {
  const { config } = useTenant();
  const [busy, setBusy] = useState<"excel" | "pdf" | "zip" | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  async function exportExcel() {
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const sheet of buildDemandeSheets(demande)) {
        const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
      }
      XLSX.writeFile(wb, `${demandeFileBase(demande)}.xlsx`);
    } finally {
      setBusy(null);
    }
  }

  function exportPdf() {
    setBusy("pdf");
    try {
      const html = buildDemandePrintHtml(demande, { nom: config.nom, emoji: config.emoji, couleur: config.couleur });
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    } finally {
      setBusy(null);
    }
  }

  async function exportZip() {
    setBusy("zip");
    setZipError(null);
    try {
      const [XLSX, JSZipMod] = await Promise.all([import("xlsx"), import("jszip")]);
      const JSZip = JSZipMod.default;
      const zip = new JSZip();
      const base = demandeFileBase(demande);

      // 1) Récapitulatif Excel (5 onglets)
      const wb = XLSX.utils.book_new();
      for (const sheet of buildDemandeSheets(demande)) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name.slice(0, 31));
      }
      zip.file(`${base}.xlsx`, XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);

      // 2) Fiche officielle imprimable (HTML → PDF via Ctrl+P)
      zip.file(`Fiche_${base}.html`, buildDemandePrintHtml(demande, { nom: config.nom, emoji: config.emoji, couleur: config.couleur }));

      // 3) Pièces jointes (URLs signées côté serveur, récupérées ici)
      const incluses: string[] = [];
      const manquantes: string[] = [];
      const res = await getDossierPieces(demande.id);
      if (res.error) setZipError(res.error);
      const pieces = res.pieces ?? [];
      if (pieces.length) {
        const folder = zip.folder("pieces")!;
        for (let i = 0; i < pieces.length; i++) {
          const p = pieces[i];
          const nom = `${String(i + 1).padStart(2, "0")}-${p.nom}`;
          try {
            const r = await fetch(p.url);
            if (!r.ok) throw new Error();
            folder.file(nom, await r.blob());
            incluses.push(nom);
          } catch {
            manquantes.push(p.nom);
          }
        }
      }

      // 4) LISEZMOI
      zip.file("LISEZMOI.txt", buildDossierReadme(demande, { pieces: incluses, manquantes }));

      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `${dossierFileBase(demande)}.zip`);
    } catch (e) {
      setZipError(e instanceof Error ? e.message : "Génération du dossier échouée.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button onClick={exportExcel} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {busy === "excel" ? "…" : "Excel"}
        </button>
        <button onClick={exportPdf} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
          <FileText className="w-4 h-4 text-red-500" /> {busy === "pdf" ? "…" : "PDF"}
        </button>
        <button onClick={exportZip} disabled={busy !== null} title="Dossier complet : Excel + fiche + pièces jointes" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-lg bg-white border border-[var(--color-primary)]/40 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 disabled:opacity-50 transition-colors">
          <FolderArchive className="w-4 h-4" /> {busy === "zip" ? "Dossier…" : "Dossier ZIP"}
        </button>
      </div>
      {zipError && <div className="text-[11px] text-red-500">{zipError}</div>}
    </div>
  );
}
