"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { buildModeleSheets, MODELE_FILE_BASE } from "@/lib/operations/demande-export";

/** Génère et télécharge le modèle Excel vierge à envoyer au client (spec §10.1). */
export function DemandeModeleButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const sheet of buildModeleSheets()) {
        const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
      }
      XLSX.writeFile(wb, `${MODELE_FILE_BASE}.xlsx`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors ${className}`}
    >
      <FileDown className="w-4 h-4 text-emerald-600" /> {busy ? "…" : "Modèle Excel"}
    </button>
  );
}
