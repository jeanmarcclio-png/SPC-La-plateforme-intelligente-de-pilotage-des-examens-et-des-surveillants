"use client";

import { useState, useEffect } from "react";

type PermState = "default" | "granted" | "denied" | "unsupported" | "ios-browser";

export function PushNotificationBanner() {
  const [perm, setPerm]           = useState<PermState>("default");
  const [loading, setLoading]     = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect iOS Safari running outside PWA (standalone mode)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone;
    if (isIOS && !isStandalone) {
      setPerm("ios-browser");
      setDismissed(false); // Always show iOS instructions — no localStorage check
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPerm("unsupported");
      return;
    }

    const p = Notification.permission as PermState;
    setPerm(p);
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

  // iOS Safari — show install-to-home-screen instructions
  if (perm === "ios-browser") {
    return (
      <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-2xl p-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1a6b7e] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold text-[#1a6b7e]">Activer les rappels (iOS)</div>
            <button
              onClick={() => setShowIOSHelp(h => !h)}
              className="text-[11px] text-[#1a6b7e] underline mt-0.5"
            >
              {showIOSHelp ? "Masquer" : "Comment faire ?"}
            </button>
            {showIOSHelp && (
              <ol className="mt-2 space-y-1 text-[11px] text-gray-600">
                <li>1. Tapez <strong>↑</strong> (partager) dans Safari</li>
                <li>2. Choisissez <strong>"Sur l'écran d'accueil"</strong></li>
                <li>3. Ouvrez l'app depuis l'icône créée</li>
                <li>4. La bannière de notifications apparaîtra</li>
              </ol>
            )}
          </div>
          <button onClick={dismiss} className="text-gray-300 text-[18px] leading-none flex-shrink-0">×</button>
        </div>
      </div>
    );
  }

  // Standard banner (Android / desktop Chrome)
  return (
    <div className="mx-4 mb-3 bg-[#1a6b7e]/10 border border-[#1a6b7e]/20 rounded-2xl p-3 flex items-center gap-3">
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
        <button onClick={dismiss} className="text-[11px] text-gray-400 font-semibold px-2 py-1.5 rounded-lg">
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

// ─── Standalone toggle for Paramètres page ────────────────────────────────────
export function PushNotificationToggle() {
  const [perm, setPerm]       = useState<PermState>("default");
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS]     = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const sa  = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone === true;
    setIsIOS(ios);
    setIsStandalone(sa);
    if (!("Notification" in window)) { setPerm("unsupported"); return; }
    setPerm(Notification.permission as PermState);
  }, []);

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ) as unknown as ArrayBuffer,
      });
      // Clear any previous dismissal
      localStorage.removeItem("spc-push-dismissed");
      setPerm("granted");
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

  const statusLabel =
    perm === "granted"     ? "Activées ✓" :
    perm === "denied"      ? "Bloquées (réactivez dans les réglages navigateur)" :
    perm === "unsupported" ? "Non supporté sur ce navigateur" :
    isIOS && !isStandalone ? "Requiert l'app sur l'écran d'accueil" :
    "Non activées";

  const statusColor =
    perm === "granted" ? "text-green-600" :
    perm === "denied"  ? "text-red-500"   : "text-gray-400";

  return (
    <div className="py-1 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-gray-800">Notifications push</div>
          <div className={`text-[11px] mt-0.5 ${statusColor}`}>{statusLabel}</div>
        </div>
        {perm !== "denied" && perm !== "unsupported" && (
          <button
            onClick={subscribe}
            disabled={loading || (isIOS && !isStandalone)}
            className="text-[12px] font-bold text-white px-4 py-2 rounded-xl disabled:opacity-40"
            style={{ background: "#1a6b7e" }}
          >
            {loading ? "…" : perm === "granted" ? "Renouveler" : "Activer"}
          </button>
        )}
      </div>
      {isIOS && !isStandalone && (
        <div className="bg-blue-50 rounded-xl p-3 text-[11.5px] text-gray-700 space-y-1">
          <div className="font-bold text-[#1a6b7e] mb-1.5">Comment activer sur iPhone :</div>
          <div>1. Dans Safari → appuyez sur <strong>↑</strong> (bouton partage)</div>
          <div>2. Choisissez <strong>"Sur l'écran d'accueil"</strong></div>
          <div>3. Ouvrez l'app depuis la nouvelle icône</div>
          <div>4. Revenez dans Paramètres → bouton Activer apparaît</div>
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
