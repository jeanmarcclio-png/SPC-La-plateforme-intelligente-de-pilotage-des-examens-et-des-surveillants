"use client";

import { useEffect } from "react";

export function SyncStamp() {
  useEffect(() => {
    localStorage.setItem("spc_last_sync", new Date().toISOString());
  }, []);
  return null;
}
