import { defineConfig, devices } from "@playwright/test";

// Tests end-to-end SPC — pilotent l'app réelle avec les données de démonstration
// (mock-fallback, sans Supabase) et le bypass d'auth de test (SPC_E2E=1).
// Le navigateur Chromium est fourni par l'environnement (PLAYWRIGHT_BROWSERS_PATH) ;
// on le vise directement pour éviter tout téléchargement.

const PORT = Number(process.env.E2E_PORT ?? 3999);
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `SPC_E2E=1 PORT=${PORT} npm run dev`,
    url: `http://localhost:${PORT}/operations`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
