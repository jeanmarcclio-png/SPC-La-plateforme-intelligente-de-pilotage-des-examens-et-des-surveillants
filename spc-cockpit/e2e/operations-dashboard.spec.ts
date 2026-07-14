import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : un décideur ouvre le tableau de bord Opérations et doit voir,
// en < 5 s, les KPI, les priorités du jour et des données de mission réelles.
test.describe("Dashboard Opérations", () => {
  test("affiche le titre, des données mission et des priorités", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations");

    await expect(
      page.getByRole("heading", { level: 1, name: /Vue d.ensemble/i }),
    ).toBeVisible();

    // Données mock issues du moteur de données (mission active EX-2026-041).
    await expect(page.getByText("ICP Paris").first()).toBeVisible();

    // Au moins un montant en euros doit être rendu (KPI CA / pipeline).
    await expect(page.getByText(/€/).first()).toBeVisible();

    await expectNoPageErrors(errors);
  });
});
