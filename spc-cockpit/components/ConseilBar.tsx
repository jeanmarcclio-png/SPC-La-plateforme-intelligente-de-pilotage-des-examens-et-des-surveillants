"use client";

export function ConseilBar({ text }: { text: string }) {
  return (
    <div className="bg-white border-t border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
      <span className="text-lg">✨</span>
      <p className="text-[12.5px] text-gray-600">
        <strong className="text-[#1a6b7e]">Conseil SPC</strong> — {text}
      </p>
      <button onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: "Explique-moi en détail la méthode BANT et comment l'appliquer à la prospection SPC pour les établissements d'enseignement supérieur." }))} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-600 hover:bg-gray-50 whitespace-nowrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Voir les critères BANT
      </button>
    </div>
  );
}
