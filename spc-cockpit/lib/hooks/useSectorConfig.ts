"use client";

import { useTenant } from "@/lib/tenant/TenantContext";
import { getSectorPack } from "@/lib/data/sectors";
import type { SectorPack } from "@/lib/data/sectors";
import { SECTEURS_LISTE } from "@/lib/tenant/configs";
import type { TenantConfig } from "@/lib/tenant/types";

interface SectorConfigResult {
  sector: string;
  tenantConfig: TenantConfig;
  sectorPack: SectorPack;
  setSector: (secteur: string) => void;
  availableSectors: TenantConfig[];
  isReady: boolean;
}

export function useSectorConfig(): SectorConfigResult {
  const { config, setSecteur, isReady } = useTenant();
  const sectorPack = getSectorPack(config.secteur);

  return {
    sector: config.secteur,
    tenantConfig: config,
    sectorPack,
    setSector: setSecteur,
    availableSectors: SECTEURS_LISTE,
    isReady,
  };
}
