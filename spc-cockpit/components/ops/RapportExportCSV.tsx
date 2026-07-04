"use client";

import type { Mission } from "@/lib/operations/types";
import { Download } from "lucide-react";

export function RapportExportCSV({ missions }: { missions: Mission[] }) {
  function exporter() {
    const headers = ["Référence", "Client", "Session", "Date", "Type", "Salles", "Surveillants", "Montant HT", "Statut"];
    const rows = missions.map((m) => [
      m.reference, m.client, m.session ?? "", m.dateMission ?? "", m.type,
      m.nbSalles, m.nbSurveillants, m.montantHT.toFixed(2), m.statut,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-missions-spc-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={exporter}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[12.5px] font-semibold transition-opacity hover:opacity-90"
      style={{ background: "#0d2137" }}
    >
      <Download className="w-3.5 h-3.5" aria-hidden />
      Exporter CSV
    </button>
  );
}
