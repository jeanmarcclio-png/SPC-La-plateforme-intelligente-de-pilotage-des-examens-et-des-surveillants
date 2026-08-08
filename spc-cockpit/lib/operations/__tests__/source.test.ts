// Non-régression du chantier « supprimer les données fabriquées »
// (audit QA forensic V2 — BUG-001 et BUG-002).

import { describe, it, expect, afterEach } from "vitest";
import { demoActif, origineGlobale, premiereErreur, jeuBase, jeuDemo, jeuVide, jeuErreur } from "../source";
import { buildCockpitView, cockpitVide, DEMO_COCKPIT } from "../cockpit";
import { mockMissions, mockAffectations, mockSurveillants, mockSalles } from "../mock";

const sansDemo = () => { delete process.env.SPC_DEMO; };
afterEach(sansDemo);

describe("demoActif — le jeu de démonstration exige un drapeau explicite", () => {
  it("est inactif par défaut", () => {
    sansDemo();
    expect(demoActif()).toBe(false);
  });

  it("n'est actif que sur la valeur exacte « 1 »", () => {
    process.env.SPC_DEMO = "1";
    expect(demoActif()).toBe(true);
    process.env.SPC_DEMO = "true";
    expect(demoActif()).toBe(false);
    process.env.SPC_DEMO = "0";
    expect(demoActif()).toBe(false);
  });
});

describe("origineGlobale — une erreur ne peut pas être masquée", () => {
  it("l'erreur prime sur tout le reste", () => {
    expect(origineGlobale(jeuBase([1]), jeuDemo([2]), jeuErreur("RLS refusée"))).toBe("erreur");
  });

  it("la démonstration prime sur les données réelles", () => {
    expect(origineGlobale(jeuBase([1]), jeuDemo([2]))).toBe("demo");
  });

  it("« vide » n'est retenu que si aucune lecture n'a ramené de ligne", () => {
    expect(origineGlobale(jeuVide(), jeuVide())).toBe("vide");
    expect(origineGlobale(jeuVide(), jeuBase([1]))).toBe("base");
  });

  it("remonte le premier message technique disponible", () => {
    expect(premiereErreur(jeuVide(), jeuErreur("permission denied"), jeuErreur("autre"))).toBe("permission denied");
    expect(premiereErreur(jeuVide(), jeuBase([1]))).toBeUndefined();
  });
});

describe("BUG-001 — le cockpit n'invente plus de session", () => {
  const entreeVide = { missions: [], affectations: [], surveillants: [], salles: [] };

  it("sans session exploitable et sans SPC_DEMO : vue VIDE, aucun nom inventé", () => {
    sansDemo();
    const vue = buildCockpitView(entreeVide);
    expect(vue.vide).toBe(true);
    expect(vue.demo).toBe(false);
    expect(vue.sessions).toEqual([]);
    expect(vue.alerts).toEqual([]);
    expect(vue.actions).toEqual([]);
    expect(vue.kpis.couverturePct).toBe(0);
    expect(vue.kpis.postesTotal).toBe(0);
    expect(vue.missionLabel).toBe("");
  });

  it("le jeu de démonstration n'est servi QUE sous SPC_DEMO=1", () => {
    process.env.SPC_DEMO = "1";
    expect(buildCockpitView(entreeVide)).toBe(DEMO_COCKPIT);
    sansDemo();
    expect(buildCockpitView(entreeVide)).not.toBe(DEMO_COCKPIT);
  });

  it("une mission active sans aucune affectation ne produit plus 92 % de couverture", () => {
    sansDemo();
    const vue = buildCockpitView({
      missions: [{ id: 1, reference: "X", client: "Y", type: "Examen écrit", nbSalles: 2, nbSurveillants: 6, montantHT: 0, statut: "En cours" }],
      affectations: [],
      surveillants: [],
      salles: [],
    });
    expect(vue.vide).toBe(true);
    expect(vue.kpis.couverturePct).toBe(0);
  });

  it("la vue vide ne contient aucun libellé du jeu de démonstration", () => {
    const serialise = JSON.stringify(cockpitVide());
    for (const inventé of ["Marie Laroche", "Fatma Benali", "Amir Marc CLIO", "176 salles", "Très bon"]) {
      expect(serialise).not.toContain(inventé);
    }
  });

  it("les données réelles restent traitées normalement", () => {
    sansDemo();
    const vue = buildCockpitView({
      missions: mockMissions,
      affectations: mockAffectations,
      surveillants: mockSurveillants,
      salles: mockSalles,
    });
    expect(vue.vide).toBe(false);
    expect(vue.demo).toBe(false);
    expect(vue.kpis.postesCouverts).toBe(10);
    expect(vue.kpis.postesTotal).toBe(14);
  });
});
