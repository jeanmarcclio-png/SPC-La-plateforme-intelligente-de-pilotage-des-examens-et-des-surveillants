import { examensPack } from "./examens";
import { conseilPack } from "./conseil";
import { securitePack } from "./securite";
import { btpPack } from "./btp";
import { rhPack } from "./rh";
import type { SectorPack } from "./types";

export type { SectorPack, SectorKPI, SectorAIAlert, SectorPlanningItem, SectorLivrable } from "./types";

const SECTOR_PACKS: Record<string, SectorPack> = {
  examens:  examensPack,
  conseil:  conseilPack,
  securite: securitePack,
  btp:      btpPack,
  rh:       rhPack,
};

export function getSectorPack(secteurId: string): SectorPack {
  return SECTOR_PACKS[secteurId] ?? SECTOR_PACKS.examens;
}

export { examensPack, conseilPack, securitePack, btpPack, rhPack };
