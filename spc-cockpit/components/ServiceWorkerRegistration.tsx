"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A new SW activating mid-session means the page's HTML/JS/CSS may no
    // longer match what's cached — reload once to pick up the new build cleanly.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {/* SW optional — fail silently */});
  }, []);

  return null;
}
