import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : navigation réelle via la sidebar Opérations (desktop). Vérifie que
// le shell reste monté et que les Server Components se rechargent correctement
// d'un écran à l'autre — régression classique lors des refontes du layout.
test.describe("Navigation sidebar Opérations", () => {
  test("navigue entre Dashboard, Surveillants et Devis", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/operations");

    // La sidebar desktop (<aside hidden md:flex>) contient la navigation.
    const sidebar = page.locator("aside").filter({ hasText: "Navigation" });
    await expect(sidebar).toBeVisible();

    await sidebar.getByRole("link", { name: "Surveillants", exact: true }).click();
    await expect(page).toHaveURL(/\/operations\/surveillants$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Surveillants/i }),
    ).toBeVisible();

    await sidebar.getByRole("link", { name: "Devis", exact: true }).click();
    await expect(page).toHaveURL(/\/operations\/devis$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Devis/i }),
    ).toBeVisible();

    // Le lien actif porte bien aria-current="page".
    await expect(
      sidebar.getByRole("link", { name: "Devis", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    await expectNoPageErrors(errors);
  });
});
