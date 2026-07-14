import { test, expect } from "@playwright/test";
import {
  OPERATIONS_ROUTES,
  collectPageErrors,
  expectNoPageErrors,
} from "./helpers";

// Filet de sécurité large : chaque écran du module Opérations doit rendre
// (grâce au mock-fallback, sans Supabase), afficher un <h1> cohérent et ne
// lever aucune exception runtime. Détecte les régressions du shell premium
// (PageHeader / OPS_CONTENT_CLASS) et des Server Components de données.
test.describe("Opérations — smoke de rendu", () => {
  for (const { path, heading } of OPERATIONS_ROUTES) {
    test(`rend ${path} avec un titre et sans erreur JS`, async ({ page }) => {
      const errors = collectPageErrors(page);
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      expect(response?.status(), `statut HTTP de ${path}`).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();

      await expectNoPageErrors(errors);
    });
  }
});
