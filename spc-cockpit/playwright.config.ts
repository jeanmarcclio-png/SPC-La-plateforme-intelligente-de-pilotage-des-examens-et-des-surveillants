import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Tests end-to-end SPC — pilotent l'application RÉELLE, avec le bypass d'auth de
// test (SPC_E2E=1) et le jeu de démonstration (SPC_DEMO=1).
//
// `SPC_DEMO=1` est OBLIGATOIRE depuis le chantier 2 : les lectures ne retombent
// plus silencieusement sur un jeu d'exemple quand la base est absente (BUG-002).
// Sans ce drapeau, les écrans afficheraient un bandeau d'erreur — ce qui est le
// comportement voulu en production, mais rend les tests inexploitables.

const PORT = Number(process.env.E2E_PORT ?? 3999);

// Chromium : fourni par l'environnement de développement à un chemin fixe, mais
// absent des exécuteurs GitHub, où Playwright installe le sien. On ne force le
// chemin que s'il existe réellement, sinon `playwright install` fait foi.
const CHROMIUM_LOCAL = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/opt/pw-browsers/chromium";
const executablePath = existsSync(CHROMIUM_LOCAL) ? CHROMIUM_LOCAL : undefined;

// En CI, on pilote le BUILD DE PRODUCTION : c'est l'artefact déployé, et le
// serveur de développement masque certaines erreurs de rendu.
const commande = process.env.CI
  ? `SPC_E2E=1 SPC_DEMO=1 PORT=${PORT} npm run start`
  : `SPC_E2E=1 SPC_DEMO=1 PORT=${PORT} npm run dev`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: commande,
    url: `http://localhost:${PORT}/operations`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
