"use client";

import { AlertCircle } from "lucide-react";

export function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <div className="text-[15px] font-bold text-gray-800 mb-1">Une erreur est survenue</div>
      <div className="text-[12.5px] text-gray-400 mb-5 max-w-[260px]">
        {error.message || "Impossible de charger cette page. Réessayez."}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
        style={{ background: "#1a6b7e" }}
      >
        Réessayer
      </button>
    </div>
  );
}
