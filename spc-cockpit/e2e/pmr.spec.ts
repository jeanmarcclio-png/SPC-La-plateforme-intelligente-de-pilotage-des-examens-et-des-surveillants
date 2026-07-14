import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : suivi des aménagements PMR & tiers-temps — enjeu de conformité
// central pour SPC (étudiants à besoins spécifiques, durées majorées).
test.describe("PMR & Tiers-temps", () => {
  test("affiche les aménagements et les salles dédiées", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations/pmr");

    await expect(
      page.getByRole("heading", { level: 1, name: /PMR .* Tiers-temps/i }),
    ).toBeVisible();

    // KPI de conformité.
    await expect(page.getByText(/Temps additionnel/i)).toBeVisible();

    // Salle dédiée aux aménagements (E31 = PMR + tiers-temps dans les mocks).
    await expect(page.getByText(/E31/).first()).toBeVisible();

    // Badge tiers-temps présent au moins une fois.
    await expect(page.getByText(/Tiers-temps/i).first()).toBeVisible();

    await expectNoPageErrors(errors);
  });
});
