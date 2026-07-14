import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// ── Chromium préinstallé ──────────────────────────────────────────────────────
// L'environnement d'exécution fournit un Chromium déjà installé (variable
// PLAYWRIGHT_BROWSERS_PATH). Sa révision peut différer de celle attendue par la
// version de @playwright/test : on pointe donc explicitement executablePath sur
// le binaire présent quand il existe, sinon on laisse Playwright résoudre le
// sien (poste développeur classique après `npx playwright install chromium`).
const PREINSTALLED_CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = fs.existsSync(PREINSTALLED_CHROMIUM)
  ? PREINSTALLED_CHROMIUM
  : undefined;

// Port dédié pour ne pas entrer en conflit avec `next dev` (3000).
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

// Variables d'environnement injectées au serveur de test. Aucune vraie valeur
// Supabase n'est nécessaire : le module Opérations retombe sur ses données mock
// (voir lib/operations/queries.ts) dès que l'appel réseau échoue. Les
// placeholders évitent seulement les crashes d'initialisation client.
const webServerEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://e2e.invalid.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-placeholder-anon-key",
  SPC_ENFORCE_ROLES: "0",
  // Désactive la redirection d'auth du middleware (proxy.ts) le temps des tests
  // e2e : sans backend Supabase, aucun utilisateur n'est authentifié et toutes
  // les routes seraient sinon redirigées vers /login. Jamais actif en prod.
  E2E_AUTH_BYPASS: "1",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    env: webServerEnv,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
