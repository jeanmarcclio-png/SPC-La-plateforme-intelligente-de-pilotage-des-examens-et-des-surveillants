"use client";

import { FileText } from "lucide-react";

export function ConseilBar({ text, stats }: { text: string; stats?: Array<{ label: string; value: string; highlight?: boolean }> }) {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
      <span className="text-lg">✨</span>
      <p className="text-[12.5px] text-gray-600">
        <strong className="text-[var(--color-primary)]">Conseil Survéo</strong> — {text}
      </p>
      {stats && stats.length > 0 && (
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          {stats.map((s, i) => (
            <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${s.highlight ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"}`}>
              {s.label} · {s.value}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Explique-moi en détail la méthode BANT et comment l'appliquer à la prospection Survéo pour les établissements d'enseignement supérieur." }))} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-600 hover:bg-gray-50 whitespace-nowrap">
        <FileText className="w-3 h-3" />
        Voir les critères BANT
      </button>
    </div>
  );
}
