"use client";

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "#0d1e2e" }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1a6b7e" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-8 h-8">
          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" strokeLinecap="round" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" strokeLinecap="round" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" strokeLinecap="round" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" strokeLinecap="round" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" strokeLinecap="round" />
          <line x1="12" y1="20" x2="12.01" y2="20" strokeLinecap="round" strokeWidth={3} />
        </svg>
      </div>

      <div>
        <div className="text-[22px] font-extrabold text-white mb-2">Hors connexion</div>
        <div className="text-[14px] text-[#7a8fa0] leading-relaxed max-w-[280px]">
          Vérifiez votre connexion. Les pages visitées récemment restent disponibles.
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl text-[14px] font-bold text-white"
        style={{ background: "#1a6b7e" }}
      >
        Réessayer
      </button>
    </div>
  );
}
