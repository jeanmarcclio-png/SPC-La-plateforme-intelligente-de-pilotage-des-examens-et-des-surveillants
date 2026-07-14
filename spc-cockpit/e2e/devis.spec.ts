import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : pilotage du pipeline de devis — statuts, montants TTC calculés
// par le moteur financier, et ouverture du détail d'un devis.
test.describe("Devis Opérations", () => {
  test("affiche le pipeline, les statuts et des montants en euros", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations/devis");

    await expect(
      page.getByRole("heading", { level: 1, name: /Devis/i }),
    ).toBeVisible();

    // KPI du pipeline commercial.
    await expect(page.getByText(/CA accepté HT/i)).toBeVisible();

    // Devis mock et clients réels.
    await expect(page.getByText("Sciences Po").first()).toBeVisible();
    await expect(page.getByText(/SPC-2026/).first()).toBeVisible();

    // Statuts de pipeline visibles.
    await expect(page.getByText(/Accept/i).first()).toBeVisible();

    // Au moins un montant en euros rendu par le moteur financier.
    await expect(page.getByText(/€/).first()).toBeVisible();

    await expectNoPageErrors(errors);
  });

  test("ouvre le détail d'un devis via une ligne du tableau", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations/devis");

    // La table rend des liens vers /operations/devis/[id]. On suit le premier.
    const detailLink = page
      .locator('a[href^="/operations/devis/"]')
      .first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();

    await expect(page).toHaveURL(/\/operations\/devis\/\d+/);
    await expect(page.getByText(/€/).first()).toBeVisible();

    await expectNoPageErrors(errors);
  });
});
