"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

function heure() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function CockpitSubtitle() {
  const [maj, setMaj] = useState<string | null>(null);
  useEffect(() => { setMaj(heure()); }, []);
  return (
    <p className="text-[13px] text-gray-500 mt-0.5">
      Pilotage temps réel · Dernière mise à jour : <span className="font-bold text-gray-700">{maj ?? "…"}</span>
    </p>
  );
}

export function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <button
      onClick={refresh}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} aria-hidden />
      Actualiser
    </button>
  );
}
