"use client";

import { useState, useEffect } from "react";

type PermState = "default" | "granted" | "denied" | "unsupported";

export function PushNotificationBanner() {
  const [perm, setPerm]       = useState<PermState>("default");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden, load from localStorage

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPerm("unsupported");
      return;
    }
    const p = Notification.permission as PermState;
    setPerm(p);
    // Show banner only if not yet decided and not previously dismissed
    if (p === "default" && !localStorage.getItem("spc-push-dismissed")) {
      setDismissed(false);
    }
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ) as unknown as ArrayBuffer,
      });
      setPerm("granted");
      setDismissed(true);
      await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(sub.toJSON()),
      });
    } catch {
      setPerm(Notification.permission as PermState);
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("spc-push-dismissed", "1");
  }

  if (perm === "unsupported" || perm === "granted" || perm === "denied" || dismissed) {
    return null;
  }

  return (
    <div className="md:hidden mx-4 mb-3 bg-[#1a6b7e]/10 border border-[#1a6b7e]/20 rounded-2xl p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#1a6b7e] flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-bold text-[#1a6b7e]">Activer les rappels</div>
        <div className="text-[11px] text-gray-500">Recevez vos relances du jour</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={dismiss}
          className="text-[11px] text-gray-400 font-semibold px-2 py-1.5 rounded-lg hover:bg-gray-100"
        >
          Plus tard
        </button>
        <button
          onClick={subscribe}
          disabled={loading}
          className="text-[11px] font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
          style={{ background: "#1a6b7e" }}
        >
          {loading ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
