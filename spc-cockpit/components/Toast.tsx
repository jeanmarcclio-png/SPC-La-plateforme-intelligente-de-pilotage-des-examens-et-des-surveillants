"use client";

import { useEffect, useState } from "react";

type ToastItem = { id: number; message: string; type: "success" | "error" };

let _id = 0;

export function showToast(message: string, type: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("spc-toast", { detail: { message, type } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const { message, type } = (e as CustomEvent).detail;
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
    }
    window.addEventListener("spc-toast", handler);
    return () => window.removeEventListener("spc-toast", handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-[84px] md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-[13px] font-semibold text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            t.type === "success" ? "bg-[#1a6b7e]" : "bg-red-500"
          }`}
        >
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
