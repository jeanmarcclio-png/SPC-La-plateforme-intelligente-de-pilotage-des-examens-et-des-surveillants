"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { CONFIGS, DEFAULT_CONFIG } from "./configs";
import type { TenantConfig } from "./types";

const STORAGE_KEY = "jmc_secteur";

interface TenantContextValue {
  config:     TenantConfig;
  setSecteur: (secteur: string) => void;
  isReady:    boolean;
}

const TenantContext = createContext<TenantContextValue>({
  config:     DEFAULT_CONFIG,
  setSecteur: () => {},
  isReady:    false,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig]   = useState<TenantConfig>(DEFAULT_CONFIG);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init client-only (hydratation-safe)
    if (stored && CONFIGS[stored]) setConfig(CONFIGS[stored]);
    setIsReady(true);
  }, []);

  function setSecteur(secteur: string) {
    if (!CONFIGS[secteur]) return;
    localStorage.setItem(STORAGE_KEY, secteur);
    setConfig(CONFIGS[secteur]);
    document.body.style.setProperty("--color-primary", CONFIGS[secteur].couleur);
  }

  // Sync CSS variable on mount
  useEffect(() => {
    if (isReady) {
      document.body.style.setProperty("--color-primary", config.couleur);
    }
  }, [isReady, config.couleur]);

  return (
    <TenantContext.Provider value={{ config, setSecteur, isReady }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
