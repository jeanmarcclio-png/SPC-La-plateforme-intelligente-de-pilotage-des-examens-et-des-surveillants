import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : consultation de l'annuaire des surveillants — rôles métier et
// disponibilités matin/après-midi (indépendance des demi-journées, principe
// non négociable du Product Bible).
test.describe("Annuaire surveillants", () => {
  test("liste les surveillants avec leurs rôles métier", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations/surveillants");

    await expect(
      page.getByRole("heading", { level: 1, name: /Surveillants/i }),
    ).toBeVisible();

    // On cible le tableau : les <select> de filtre exposent des <option> de même
    // libellé (masqués), qu'il faut exclure des assertions de visibilité.
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Surveillants mock attendus.
    await expect(table.getByText("Marie Lecomte").first()).toBeVisible();
    await expect(table.getByText("Jean-Pierre Moreau").first()).toBeVisible();

    // Rôles métier spécifiques SPC (coordination, PMR) rendus dans les lignes.
    await expect(table.getByText(/Coordinatrice/i).first()).toBeVisible();
    await expect(table.getByText(/PMR/i).first()).toBeVisible();

    await expectNoPageErrors(errors);
  });
});
