import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { aUnScriptDedie, scriptPour } from "../narration";

/**
 * COUVERTURE DE LA NARRATION — énumérée depuis le SYSTÈME DE FICHIERS.
 *
 * POURQUOI CE FICHIER EXISTE
 * --------------------------
 * La première version de la narration a été écrite à partir d'une liste
 * d'écrans dressée à la main. Elle en a oublié quatre — le tableau de bord, la
 * supervision live, les demandes clients et les risques — et l'oubli n'a été
 * découvert qu'en visitant la démonstration déployée.
 *
 * Une liste écrite à la main oublie toujours les écrans ajoutés après elle. Ce
 * test part donc de l'arborescence `app/`, c'est-à-dire de la seule source qui
 * ne peut pas se désynchroniser du produit : ajouter une page sans la commenter
 * fait échouer la suite, immédiatement.
 */

const RACINE_APP = join(__dirname, "..", "..", "..", "app");

/**
 * Pages hors parcours produit. Elles ont le droit au script par défaut, et
 * chacune porte sa raison — une exemption sans motif finit par en couvrir
 * d'autres qui n'en méritaient pas.
 */
const HORS_PARCOURS: Record<string, string> = {
  "/": "redirige immédiatement vers /operations",
  "/login": "en démonstration, le proxy redirige vers le cockpit",
  "/onboarding": "création d'organisation — inaccessible sans écriture",
  "/offline": "page de secours du service worker",
  "/confidentialite": "mention légale, pas un écran de travail",
};

/** Toutes les routes réelles, déduites des `page.tsx` présents sur le disque. */
function routesDuProduit(): string[] {
  const routes: string[] = [];

  function parcourir(repertoire: string) {
    for (const entree of readdirSync(repertoire)) {
      const chemin = join(repertoire, entree);
      if (statSync(chemin).isDirectory()) {
        // `_dossier` et `api` ne produisent pas d'écran visitable.
        if (entree.startsWith("_") || entree === "api") continue;
        parcourir(chemin);
      } else if (entree === "page.tsx") {
        const segments = relative(RACINE_APP, repertoire)
          .split(/[\\/]/)
          .filter((s) => s && !/^\(.*\)$/.test(s)) // groupes de routes : (operations)
          // Un segment dynamique est remplacé par une valeur plausible : c'est
          // ce que verra réellement `usePathname()`.
          .map((s) => (s.startsWith("[") ? "42" : s));
        routes.push("/" + segments.join("/"));
      }
    }
  }

  parcourir(RACINE_APP);
  return [...new Set(routes)].sort();
}

describe("couverture de la narration de démonstration", () => {
  const routes = routesDuProduit();

  it("l'énumération trouve bien les écrans (garde-fou du test lui-même)", () => {
    // Si le parcours de l'arborescence cassait, le test passerait à vide et ne
    // protégerait plus rien.
    expect(routes.length).toBeGreaterThan(20);
    expect(routes).toContain("/operations/cockpit");
    expect(routes).toContain("/operations/supervision");
  });

  it("CHAQUE écran du produit est commenté", () => {
    const orphelins = routes.filter(
      (r) => !(r in HORS_PARCOURS) && !aUnScriptDedie(r),
    );
    expect(
      orphelins,
      `Écrans sans narration dédiée :\n  ${orphelins.join("\n  ")}\n` +
        "Ajoutez-leur un script dans lib/demo/narration.ts, ou déclarez-les " +
        "hors parcours avec leur raison.",
    ).toEqual([]);
  });

  it("aucune exemption ne masque un écran qui existe encore", () => {
    // Une page supprimée doit disparaître de la liste d'exemptions, sinon
    // celle-ci enfle et finit par couvrir des écrans réels.
    const exemptionsMortes = Object.keys(HORS_PARCOURS).filter((r) => !routes.includes(r));
    expect(exemptionsMortes, `Exemptions devenues inutiles : ${exemptionsMortes.join(", ")}`).toEqual([]);
  });

  it("chaque écran commenté nomme un écran, pas une catégorie", () => {
    for (const route of routes) {
      if (route in HORS_PARCOURS) continue;
      const s = scriptPour(route);
      expect(s.ecran.trim(), route).not.toBe("");
      expect(s.ecran.length, `${route} — « ${s.ecran} » est trop long pour l'en-tête`).toBeLessThanOrEqual(28);
      expect(s.etapes.length, route).toBeGreaterThan(0);
    }
  });

  it("un écran de détail hérite du script de sa section", () => {
    // /operations/devis/42 n'a pas de script propre et ne DOIT pas être
    // considéré comme orphelin : la correspondance par préfixe le rattache aux
    // devis. C'est le mécanisme qui évite d'écrire un script par identifiant.
    expect(scriptPour("/operations/devis/42").ecran).toBe("Devis");
    expect(aUnScriptDedie("/operations/devis/42")).toBe(true);
  });
});
