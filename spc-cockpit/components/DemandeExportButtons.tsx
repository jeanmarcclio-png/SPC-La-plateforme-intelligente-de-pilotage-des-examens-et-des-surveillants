"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useTenant } from "@/lib/tenant/TenantContext";
import { buildDemandeSheets, buildDemandePrintHtml, demandeFileBase } from "@/lib/operations/demande-export";
import type { DemandeClient } from "@/lib/operations/types";

export function DemandeExportButtons({ demande }: { demande: DemandeClient }) {
  const { config } = useTenant();
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);

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

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportExcel} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {busy === "excel" ? "…" : "Excel"}
      </button>
      <button onClick={exportPdf} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
        <FileText className="w-4 h-4 text-red-500" /> {busy === "pdf" ? "…" : "PDF"}
      </button>
    </div>
  );
}
