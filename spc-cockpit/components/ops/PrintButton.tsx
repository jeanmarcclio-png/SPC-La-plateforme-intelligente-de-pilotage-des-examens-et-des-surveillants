"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold transition-opacity hover:opacity-90 print:hidden"
      style={{ background: "#0d2137" }}
    >
      <Printer className="w-4 h-4" aria-hidden />
      Imprimer / PDF
    </button>
  );
}
