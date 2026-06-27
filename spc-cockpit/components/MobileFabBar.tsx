"use client";

export function MobileFabBar() {
  function openSearch() {
    window.dispatchEvent(new CustomEvent("search:open"));
  }
  function openCopilote() {
    window.dispatchEvent(new CustomEvent("copilote:open", { detail: "" }));
  }

  return (
    <div className="md:hidden fixed bottom-[76px] left-4 right-4 z-40 flex items-center bg-white rounded-2xl shadow-lg border border-gray-100 px-2 py-2 gap-2">
      {/* Search pill */}
      <button
        onClick={openSearch}
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-label="Recherche globale"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} className="w-4 h-4 flex-shrink-0">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <span className="text-[13px] text-gray-400">Rechercher…</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-100 flex-shrink-0" />

      {/* Copilote button */}
      <button
        onClick={openCopilote}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[13px] font-semibold flex-shrink-0"
        style={{ background: "#1a6b7e" }}
        aria-label="Copilote IA"
      >
        <span className="text-base leading-none">🤖</span>
        <span>Copilote</span>
      </button>
    </div>
  );
}
