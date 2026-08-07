import { describe, it, expect } from "vitest";
import type { Salle } from "../types";
import {
  classerSalle,
  occupationSalle,
  surveillantsRequisPour,
  construireVueSalles,
} from "../salles-view";

function salle(p: Partial<Salle> & { id: number }): Salle {
  return {
    nom: `Salle ${p.id}`,
    capacite: 30,
    etudiants: 0,
    nbSurveillants: 1,
    pmr: false,
    tiersTemps: false,
    ...p,
  };
}

describe("occupationSalle", () => {
  it("calcule le taux d'occupation", () => {
    expect(occupationSalle({ capacite: 80, etudiants: 75 })).toBe(94);
    expect(occupationSalle({ capacite: 300, etudiants: 260 })).toBe(87);
  });

  it("renvoie 0 quand la capacité est nulle (aucune division par zéro)", () => {
    expect(occupationSalle({ capacite: 0, etudiants: 10 })).toBe(0);
  });
});

describe("surveillantsRequisPour", () => {
  it("compte un surveillant par tranche entamée de 30 étudiants", () => {
    expect(surveillantsRequisPour(30)).toBe(1);
    expect(surveillantsRequisPour(31)).toBe(2);
    expect(surveillantsRequisPour(75)).toBe(3);
  });

  it("n'exige aucun surveillant pour une salle vide", () => {
    expect(surveillantsRequisPour(0)).toBe(0);
  });
});

describe("classerSalle — le rouge reste réservé à l'anomalie réelle", () => {
  it("100 % pile SANS dépassement = vigilance, pas critique", () => {
    const s = salle({ id: 1, capacite: 30, etudiants: 30, nbSurveillants: 1 });
    expect(classerSalle(s).niveau).toBe("vigilance");
  });

  it("dépassement de capacité = critique, avec motif chiffré", () => {
    const s = salle({ id: 2, capacite: 30, etudiants: 34, nbSurveillants: 2 });
    const r = classerSalle(s);
    expect(r.niveau).toBe("critique");
    expect(r.motif).toBe("Capacité dépassée de 4 étudiant(s)");
  });

  it("salle occupée sans aucun surveillant = critique", () => {
    const s = salle({ id: 3, capacite: 30, etudiants: 12, nbSurveillants: 0 });
    const r = classerSalle(s);
    expect(r.niveau).toBe("critique");
    expect(r.motif).toBe("Aucun surveillant affecté");
  });

  it("salle occupée sans capacité renseignée = critique (configuration invalide)", () => {
    const s = salle({ id: 4, capacite: 0, etudiants: 5 });
    expect(classerSalle(s).motif).toBe("Capacité non renseignée");
  });

  it("applique les paliers vigilance / normale / faible / non utilisée", () => {
    expect(classerSalle(salle({ id: 5, capacite: 80, etudiants: 75 })).niveau).toBe("vigilance"); // 94 %
    expect(classerSalle(salle({ id: 6, capacite: 100, etudiants: 80 })).niveau).toBe("vigilance"); // 80 % → seuil inclus
    expect(classerSalle(salle({ id: 7, capacite: 100, etudiants: 79 })).niveau).toBe("normale");
    expect(classerSalle(salle({ id: 8, capacite: 100, etudiants: 60 })).niveau).toBe("normale"); // seuil inclus
    expect(classerSalle(salle({ id: 9, capacite: 100, etudiants: 59 })).niveau).toBe("faible");
    expect(classerSalle(salle({ id: 10, capacite: 30, etudiants: 0 })).niveau).toBe("inutilisee");
  });
});

describe("construireVueSalles", () => {
  const jeu: Salle[] = [
    salle({ id: 1, nom: "Salle A21", batiment: "Bâtiment A", capacite: 80, etudiants: 75, nbSurveillants: 3 }),
    salle({ id: 2, nom: "Salle E31", batiment: "Bâtiment E", capacite: 30, etudiants: 8, nbSurveillants: 2, pmr: true, tiersTemps: true }),
    salle({ id: 3, nom: "Grand Amphithéâtre", batiment: "Bâtiment C", capacite: 300, etudiants: 320, nbSurveillants: 8 }),
  ];

  it("agrège les KPI de capacité", () => {
    const { kpis } = construireVueSalles(jeu);
    expect(kpis.sallesConfigurees).toBe(3);
    expect(kpis.capaciteTotale).toBe(410);
    expect(kpis.etudiantsPlanifies).toBe(403);
    expect(kpis.tauxCapacite).toBe(98);
  });

  it("compte les salles critiques et sous-occupées", () => {
    const { kpis } = construireVueSalles(jeu);
    expect(kpis.sallesCritiques).toBe(1); // l'amphi dépasse sa capacité
    expect(kpis.partCritiques).toBe(33);
    expect(kpis.sallesSousOccupees).toBe(1); // E31 à 27 %
  });

  it("calcule le besoin en surveillants et le manque", () => {
    const { kpis } = construireVueSalles(jeu);
    // A21 : ceil(75/30)=3 · E31 : 1 · Amphi : ceil(320/30)=11
    expect(kpis.surveillantsRequis).toBe(15);
    expect(kpis.surveillantsAffectes).toBe(13);
    expect(kpis.surveillantsManquants).toBe(2);
  });

  it("trie par criticité décroissante", () => {
    const { salles } = construireVueSalles(jeu);
    expect(salles.map((s) => s.niveau)).toEqual(["critique", "vigilance", "faible"]);
  });

  it("produit les alertes attendues avec leurs cibles", () => {
    const { alertes } = construireVueSalles(jeu);
    const ids = alertes.map((a) => a.id);
    expect(ids).toContain("surcharge");
    expect(ids).toContain("sous-occupation");
    expect(ids).toContain("surveillants");
    expect(ids).toContain("ia"); // salles tendues + salles creuses → optimisation pertinente
    expect(alertes.find((a) => a.id === "surcharge")?.cibles).toEqual([3]);
  });

  it("n'expose pas l'optimisation IA sans matière à rééquilibrer", () => {
    const homogene = [salle({ id: 1, capacite: 100, etudiants: 70, nbSurveillants: 3 })];
    expect(construireVueSalles(homogene).alertes.map((a) => a.id)).not.toContain("ia");
  });

  it("liste les bâtiments distincts triés", () => {
    expect(construireVueSalles(jeu).batiments).toEqual(["Bâtiment A", "Bâtiment C", "Bâtiment E"]);
  });

  it("reste cohérent sur une liste vide", () => {
    const v = construireVueSalles([]);
    expect(v.kpis.tauxCapacite).toBe(0);
    expect(v.kpis.partCritiques).toBe(0);
    expect(v.alertes).toEqual([]);
    expect(v.salles).toEqual([]);
  });
});
