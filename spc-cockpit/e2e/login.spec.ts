import { test, expect } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

// Parcours : page de connexion. On ne teste pas l'authentification réelle
// (aucun backend Supabase en e2e) mais le rendu du formulaire, la validation
// HTML native et l'absence d'erreur JS au chargement.
//
// NB : les champs n'ont pas de <label> associé (for/id) — on cible donc par
// placeholder, ce qui reflète le DOM réel de app/login/page.tsx.
test.describe("Page de connexion", () => {
  test("rend le formulaire de connexion", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/login");

    await expect(page.getByText("JMC COCKPIT")).toBeVisible();
    await expect(page.getByPlaceholder("vous@exemple.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Se connecter/i }),
    ).toBeVisible();

    await expectNoPageErrors(errors);
  });

  test("les champs email et mot de passe sont requis", async ({ page }) => {
    await page.goto("/login");

    const email = page.getByPlaceholder("vous@exemple.com");
    const password = page.getByPlaceholder("••••••••");
    await expect(email).toHaveAttribute("required", "");
    await expect(password).toHaveAttribute("required", "");
    await expect(email).toHaveAttribute("type", "email");
    await expect(password).toHaveAttribute("type", "password");
  });
});
