import { describe, it, expect } from "vitest";
import type { Mission } from "../types";
import type { LigneMission } from "../missions-dashboard";
import {
  FILTRES_VIDES, filtrerMissions, filtresActifs, nbFiltresAvances, trierMissions,
} from "../missions-filtres";

function ligne(p: Partial<Mission> & { id: number }, avancement = 50, affectes = 0): LigneMission {
  return {
    mission: {
      reference: `EX-2026-${String(p.id).padStart(3, "0")}`,
      client: "ICP Paris",
      type: "Examen écrit",
      nbSalles: 4,
      nbSurveillants: 10,
      montantHT: 1000,
      statut: "Planifiée",
      ...p,
    },
    avancement,
    surveillantsAffectes: affectes,
    affectationsSuivies: affectes,
    candidats: null,
  };
}

const lignes: LigneMission[] = [
  ligne({ id: 1, client: "ICP Paris", session: "Session principale", dateMission: "2026-07-08", statut: "En cours", montantHT: 4042, nbSurveillants: 14, nbSalles: 6 }, 68, 12),
  ligne({ id: 2, client: "Dauphine PSL", session: "Partiels L3", dateMission: "2026-05-26", statut: "Terminée", montantHT: 2600, type: "Partiels" }, 100, 9),
  ligne({ id: 3, client: "Sciences Po", session: "Concours écrit", dateMission: "2026-05-23", statut: "Terminée", montantHT: 5200, type: "Concours" }, 100, 18),
  ligne({ id: 4, client: "ESSEC", dateMission: undefined, statut: "À chiffrer", montantHT: 0 }, 25, 0),
];

describe("filtre de recherche", () => {
  it("cherche dans la référence, le client, la session et le type", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, recherche: "dauphine" }).map((l) => l.mission.id)).toEqual([2]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, recherche: "concours" }).map((l) => l.mission.id)).toEqual([3]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, recherche: "EX-2026-001" }).map((l) => l.mission.id)).toEqual([1]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, recherche: "zzz" })).toEqual([]);
  });

  it("est insensible à la casse et aux espaces superflus", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, recherche: "  ESSEC " }).map((l) => l.mission.id)).toEqual([4]);
  });
});

describe("filtre de statut", () => {
  it("ne conserve que le statut demandé", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, statut: "Terminée" }).map((l) => l.mission.id)).toEqual([2, 3]);
  });

  it("« Tous statuts » ne retire rien", () => {
    expect(filtrerMissions(lignes, FILTRES_VIDES)).toHaveLength(4);
  });
});

describe("filtre de période", () => {
  it("applique les bornes de début et de fin", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, du: "2026-06-01" }).map((l) => l.mission.id)).toEqual([1]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, au: "2026-05-25" }).map((l) => l.mission.id)).toEqual([3]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, du: "2026-05-01", au: "2026-05-31" }).map((l) => l.mission.id)).toEqual([2, 3]);
  });

  it("exclut les missions sans date dès qu'une borne est posée", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, du: "2020-01-01" }).some((l) => l.mission.id === 4)).toBe(false);
  });

  it("les bornes sont inclusives", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, du: "2026-07-08", au: "2026-07-08" }).map((l) => l.mission.id)).toEqual([1]);
  });
});

describe("filtres avancés", () => {
  it("combine client, type, montants, salles et couverture", () => {
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, client: "ESSEC" }).map((l) => l.mission.id)).toEqual([4]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, type: "Concours" }).map((l) => l.mission.id)).toEqual([3]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, montantMin: "3000" }).map((l) => l.mission.id)).toEqual([1, 3]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, montantMax: "2600" }).map((l) => l.mission.id)).toEqual([2, 4]);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, sallesMin: "6" }).map((l) => l.mission.id)).toEqual([1]);
    // 12/14 = 86 % → conservée avec un seuil à 90 %, écartée avec un seuil à 80 %
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, couvertureMax: "90" }).map((l) => l.mission.id)).toContain(1);
    expect(filtrerMissions(lignes, { ...FILTRES_VIDES, couvertureMax: "80" }).map((l) => l.mission.id)).not.toContain(1);
  });

  it("« sous-effectif » ne retient que les missions engagées incomplètes", () => {
    const r = filtrerMissions(lignes, { ...FILTRES_VIDES, avecAlertes: true });
    expect(r.map((l) => l.mission.id)).toEqual([1]);
  });

  it("les filtres se cumulent", () => {
    const r = filtrerMissions(lignes, { ...FILTRES_VIDES, statut: "Terminée", montantMin: "3000" });
    expect(r.map((l) => l.mission.id)).toEqual([3]);
  });

  it("compte les filtres avancés actifs pour le badge du bouton", () => {
    expect(nbFiltresAvances(FILTRES_VIDES)).toBe(0);
    expect(nbFiltresAvances({ ...FILTRES_VIDES, client: "ESSEC", avecAlertes: true })).toBe(2);
    // la recherche et le statut ne sont pas des filtres « avancés »
    expect(nbFiltresAvances({ ...FILTRES_VIDES, recherche: "x", statut: "Terminée" })).toBe(0);
    expect(filtresActifs({ ...FILTRES_VIDES, recherche: "x" })).toBe(true);
    expect(filtresActifs(FILTRES_VIDES)).toBe(false);
  });
});

describe("tri du tableau", () => {
  it("trie par date, montant et avancement dans les deux sens", () => {
    expect(trierMissions(lignes, "date", "desc").map((l) => l.mission.id)).toEqual([1, 2, 3, 4]);
    expect(trierMissions(lignes, "montant", "desc").map((l) => l.mission.id)).toEqual([3, 1, 2, 4]);
    expect(trierMissions(lignes, "avancement", "asc").map((l) => l.mission.id)).toEqual([4, 1, 2, 3]);
  });

  it("place toujours les missions sans date en fin de liste", () => {
    expect(trierMissions(lignes, "date", "asc").map((l) => l.mission.id)).toEqual([3, 2, 1, 4]);
    expect(trierMissions(lignes, "date", "desc").at(-1)?.mission.id).toBe(4);
  });

  it("trie les clients selon l'alphabet français", () => {
    expect(trierMissions(lignes, "client", "asc").map((l) => l.mission.client)).toEqual([
      "Dauphine PSL", "ESSEC", "ICP Paris", "Sciences Po",
    ]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const avant = lignes.map((l) => l.mission.id);
    trierMissions(lignes, "client", "desc");
    expect(lignes.map((l) => l.mission.id)).toEqual(avant);
  });
});
