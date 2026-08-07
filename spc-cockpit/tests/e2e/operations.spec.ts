import { test, expect } from "@playwright/test";

// Parcours pilotés sur l'app réelle (données de démo, bypass d'auth de test).
// Couvre : chargement sans régression de chaque écran Opérations + interactions
// clés (actions libellées, aide à la décision IA, filtres, cycle de vie mission).

const PAGES: { path: string; expect: string }[] = [
  { path: "/operations", expect: "Tableau de bord" },
  { path: "/operations/cockpit", expect: "Cockpit opérationnel" },
  { path: "/operations/surveillants", expect: "Import Excel / CSV" },
  { path: "/operations/missions", expect: "Missions" },
  { path: "/operations/planification", expect: "Santé de la session" },
  { path: "/operations/planification/planning", expect: "Affectations & planning" },
  { path: "/operations/planification/copilote", expect: "Copilote IA & contrôle" },
  { path: "/operations/devis", expect: "Devis" },
  { path: "/operations/salles", expect: "Salles" },
  { path: "/operations/facturation", expect: "Facturation" },
  { path: "/operations/presence", expect: "Présence" },
  { path: "/operations/incidents", expect: "Incidents" },
  { path: "/operations/pmr", expect: "PMR" },
  { path: "/operations/rapports", expect: "Rapports" },
  { path: "/operations/risques", expect: "Risques" },
];

test.describe("Smoke — chaque écran Opérations se charge", () => {
  for (const p of PAGES) {
    test(`charge ${p.path}`, async ({ page }) => {
      const res = await page.goto(p.path, { waitUntil: "domcontentloaded" });
      expect(res?.ok(), `réponse HTTP de ${p.path}`).toBeTruthy();
      // pas d'écran de connexion (le bypass de test doit être actif)
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByText(p.expect, { exact: false }).first()).toBeVisible();
    });
  }
});

test.describe("Surveillants — actions libellées", () => {
  test("les boutons Modifier / Supprimer sont de vrais boutons", async ({ page }) => {
    await page.goto("/operations/surveillants", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /^Modifier/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Supprimer/ }).first()).toBeVisible();
  });
});

test.describe("Planification — parcours Piloter → Planifier → Optimiser", () => {
  test("la synthèse porte les indicateurs de commandement", async ({ page }) => {
    await page.goto("/operations/planification", { waitUntil: "networkidle" });
    await expect(page.getByText("Santé de la session")).toBeVisible();
    await expect(page.getByText("Couverture surveillants")).toBeVisible();
    await expect(page.getByText("Marge estimée")).toBeVisible();
    await expect(page.getByText("Heures planifiées").first()).toBeVisible();
    await expect(page.getByText("Copilote d'affectation")).toBeVisible();
  });

  test("la session suit la navigation entre les trois étapes", async ({ page }) => {
    await page.goto("/operations/planification", { waitUntil: "networkidle" });
    // Portée au parcours : la sidebar porte un raccourci « Planifier une équipe ».
    const parcours = page.getByRole("navigation", { name: "Parcours de planification" });
    await parcours.getByRole("link", { name: /Planifier/ }).click();
    await expect(page).toHaveURL(/\/planification\/planning\?session=\d+/);
    await parcours.getByRole("link", { name: /Optimiser/ }).click();
    await expect(page).toHaveURL(/\/planification\/copilote\?session=\d+/);
  });

  test("le filtre « Sans salle » restreint la liste des affectations", async ({ page }) => {
    await page.goto("/operations/planification/planning", { waitUntil: "networkidle" });
    const toutes = await page.locator("table tbody tr").count();
    await page.getByRole("button", { name: /^Sans salle/ }).click();
    const filtrees = await page.locator("table tbody tr").count();
    expect(filtrees).toBeLessThan(toutes);
  });

  test("le total des heures est calculé en minutes exactes", async ({ page }) => {
    await page.goto("/operations/planification/planning", { waitUntil: "networkidle" });
    await expect(page.getByText("Total heures planifiées")).toBeVisible();
    await expect(page.getByText("66,25 h").first()).toBeVisible();
  });

  test("le copilote expose contrôle et aperçu sans répéter les cartes de synthèse", async ({ page }) => {
    await page.goto("/operations/planification/copilote", { waitUntil: "networkidle" });
    await expect(page.getByText("Sous-effectifs détectés")).toBeVisible();
    await expect(page.getByText("Rééquilibrage de charge")).toBeVisible();
    await expect(page.getByText("Aperçu de la session")).toBeVisible();
    await expect(page.getByText("Santé de la session")).toHaveCount(0);
  });
});

test.describe("Missions — cycle de vie à 11 statuts", () => {
  test("le formulaire d'édition propose les 11 statuts", async ({ page }) => {
    await page.goto("/operations/missions", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Modifier/ }).first().click();
    const options = page.locator('select[name="statut"] option');
    await expect(options).toHaveCount(11);
  });
});
