import { describe, it, expect } from "vitest";
import { scriptPour } from "../narration";

describe("narration de démonstration", () => {
  it("commente le cockpit", () => {
    expect(scriptPour("/operations/cockpit").ecran).toBe("Cockpit");
  });

  it("un écran de détail hérite du script de sa section", () => {
    // /operations/devis/42 n'a pas de script propre et ne doit pas retomber sur
    // le script générique : la correspondance se fait par préfixe.
    expect(scriptPour("/operations/devis/42").ecran).toBe("Devis");
    expect(scriptPour("/operations/planification/planning").ecran).toBe("Planification");
  });

  it("le préfixe le PLUS LONG gagne", () => {
    // /operations et /operations/missions matchent tous deux ; c'est le second
    // qui doit l'emporter, sans quoi tous les écrans seraient commentés par
    // l'accueil.
    expect(scriptPour("/operations/missions").ecran).toBe("Missions");
  });

  it("un chemin inconnu reçoit quand même un commentaire", () => {
    const s = scriptPour("/operations/ecran-inexistant");
    expect(s.etapes.length).toBeGreaterThan(0);
  });

  it("aucune étape vide, aucun titre vide", () => {
    const chemins = [
      "/operations", "/operations/cockpit", "/operations/missions", "/operations/planification",
      "/operations/surveillants", "/operations/salles", "/operations/pmr", "/operations/presence",
      "/operations/incidents", "/operations/devis", "/operations/facturation", "/operations/rapports",
    ];
    for (const c of chemins) {
      const s = scriptPour(c);
      expect(s.etapes.length, c).toBeGreaterThan(0);
      for (const e of s.etapes) {
        expect(e.titre.trim(), c).not.toBe("");
        expect(e.texte.trim().length, `${c} — ${e.titre}`).toBeGreaterThan(40);
      }
    }
  });

  it("le caractère fictif des données est annoncé dès l'accueil et sur le cockpit", () => {
    // Un prospect ne doit jamais repartir en croyant avoir vu des volumes réels.
    for (const c of ["/operations", "/operations/cockpit"]) {
      const texte = scriptPour(c).etapes.map((e) => e.texte).join(" ");
      expect(texte, c).toMatch(/fictif|fictives/i);
    }
  });
});
