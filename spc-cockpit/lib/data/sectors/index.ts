import { examensPack } from "./examens";
import type { SectorPack } from "./types";

export type { SectorPack, SectorKPI, SectorAIAlert, SectorPlanningItem, SectorLivrable } from "./types";

// Produit vertical « examens » : un seul pack. getSectorPack conserve sa signature
// (repli sur examens) pour ne rien casser côté appelants.
const SECTOR_PACKS: Record<string, SectorPack> = {
  examens: examensPack,
};

export function getSectorPack(secteurId: string): SectorPack {
  return SECTOR_PACKS[secteurId] ?? SECTOR_PACKS.examens;
}

export { examensPack };
