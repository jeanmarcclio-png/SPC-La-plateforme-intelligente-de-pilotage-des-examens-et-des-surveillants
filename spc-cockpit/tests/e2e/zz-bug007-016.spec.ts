// Preuves navigateur — BUG-007 (variation du CA) et BUG-016 (réconciliation du
// devis). Ces deux anomalies de l'audit QA forensic V2 n'avaient jamais été
// traitées ; elles portaient toutes deux sur des chiffres montrés à un décideur
// ou à un client.

import { test, expect } from "@playwright/test";
import { appendFileSync } from "node:fs";

const PREUVES = "tests/e2e/preuves-bug007-016.txt";
const trace = (ligne: string) => appendFileSync(PREUVES, ligne + "\n");

test.describe("BUG-007 — la variation décrit la série qu'elle mesure", () => {
  test("QA-FIN-001 — le portefeuille de devis ne porte plus de « vs mois précédent »", async ({ page }) => {
    await page.goto("/operations");
    // La carte KPI porte un aria-label « {libellé} : {valeur} — {sous-titre} » :
    // c'est le seul ancrage stable, les libellés visibles étant mis en capitales
    // par CSS et donc renvoyés transformés par `innerText`.
    const tuile = page.locator('a[aria-label^="CA confirmé HT"]').first();
    await expect(tuile).toBeVisible();
    const texte = ((await tuile.getAttribute("aria-label")) ?? "").replace(/\s+/g, " ").trim();
    trace(`QA-FIN-001 tuile → ${texte}`);

    // Le montant est un STOCK : aucune variation mensuelle ne peut le décrire.
    expect(texte.toLowerCase()).not.toContain("vs mois précédent");
    expect(texte.toLowerCase()).toContain("portefeuille");
  });

  test("QA-FIN-002 — la variation dit sa série et sa période, à périmètre comparable", async ({ page }) => {
    await page.goto("/operations");
    const page_ = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();

    const titre = page_.match(/Évolution du CA réalisé/i)?.[0] ?? "";
    const libelle = page_.match(/CA réalisé · [^·]+ vs [^·]+?(?= [A-ZÉÈ]|$)/)?.[0] ?? "";
    trace(`QA-FIN-002 → « ${titre} » · ${libelle || "libellé introuvable"}`);

    expect(titre).not.toBe("");
    // La comparaison est bornée des deux côtés au même nombre de jours.
    expect(libelle).toMatch(/CA réalisé · (1–\d+ \p{L}+ vs 1–\d+ \p{L}+|\p{L}+ vs \p{L}+)/u);
  });
});

test.describe("BUG-016 — le devis réconcilie sa grille et ses heures facturées", () => {
  test("QA-DEVIS-001 — l'écart entre la grille et la facturation est chiffré", async ({ page }) => {
    await page.goto("/operations/devis/4");
    const bloc = page.locator("section", { hasText: "Contrôle de cohérence" }).last();
    await expect(bloc).toBeVisible();

    const texte = (await bloc.innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-DEVIS-001 → ${texte.slice(0, 400)}`);

    // Les trois nombres relevés par l'audit sont désormais à l'écran.
    expect(texte).toContain("23,33 h");   // grille, une journée
    expect(texte).toContain("233,33 h");  // × 10 jours retenus
    expect(texte).toContain("262,30 h");  // heures effectivement facturées
    expect(texte).toContain("28,97 h");   // écart
    expect(texte).toMatch(/81[01],\d{2} €/); // valorisation de l'écart
    // Et l'écran dit quoi faire, pas seulement qu'il y a un écart.
    expect(texte).toMatch(/journée type|corrigez l'un des deux blocs/);
  });

  test("QA-DEVIS-002 — les trois effectifs sont nommés avec leur périmètre", async ({ page }) => {
    await page.goto("/operations/devis/4");
    const bloc = page.locator("section", { hasText: "Contrôle de cohérence" }).last();
    const texte = (await bloc.innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-DEVIS-002 → ${texte.match(/L'effectif annoncé[^]*?client\./)?.[0] ?? "—"}`);

    expect(texte).toContain("effectif annoncé (6)");
    expect(texte).toContain("10 personnes mobilisées");
    expect(texte).toContain("4 surveillants présents simultanément");
  });

  test("QA-DEVIS-003 — amplitude et heures facturables ne portent plus le même nom", async ({ page }) => {
    await page.goto("/operations/devis/4");
    // Les libellés sont rendus en capitales par CSS : `innerText` les renvoie
    // transformés, la comparaison est donc insensible à la casse.
    const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const amplitude = texte.match(/Amplitude \/ jour\s*([\d, ]+h)/i)?.[1]?.trim() ?? "";
    const facturables = texte.match(/Heures facturables \/ jour\s*([\d, ]+h)/i)?.[1]?.trim() ?? "";
    trace(`QA-DEVIS-003 → amplitude ${amplitude} · facturables ${facturables}`);

    // 8,33 h d'ouverture pour 23,33 h facturables : deux grandeurs distinctes,
    // affichées auparavant sous le seul libellé « Heures / jour ».
    expect(amplitude).not.toBe("");
    expect(facturables).not.toBe("");
    expect(amplitude).not.toBe(facturables);
  });
});
