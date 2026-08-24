import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Harness d'audit QA forensic — crawle chaque route, capture les erreurs
// console, le statut HTTP, le texte rendu et une capture d'écran.

const OUT = path.resolve(__dirname, "../../../audit-artifacts");
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  "/",
  "/operations",
  "/operations/cockpit",
  "/operations/missions",
  "/operations/planification",
  "/operations/planification/planning",
  "/operations/planification/copilote",
  "/operations/surveillants",
  "/operations/salles",
  "/operations/devis",
  "/operations/devis/4",
  "/operations/devis/1",
  "/operations/facturation",
  "/operations/presence",
  "/operations/incidents",
  "/operations/pmr",
  "/operations/rapports",
  "/operations/risques",
  "/operations/supervision",
  "/operations/demandes-client",
  "/dashboard",
  "/cockpit",
  "/planning",
  "/qualification",
  "/reporting",
  "/livrables",
  "/campagnes",
  "/parametres",
  "/moi",
  "/onboarding",
  "/confidentialite",
  "/offline",
  "/route-inexistante-xyz",
];

type Rec = {
  route: string;
  status: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  bodyLen: number;
  suspicious: string[];
  title: string;
  h1: string[];
};

const records: Rec[] = [];

for (const route of ROUTES) {
  test(`crawl ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") consoleErrors.push(`[${m.type()}] ${m.text()}`);
    });
    page.on("pageerror", (e) => pageErrors.push(String(e)));

    const res = await page.goto(route, { waitUntil: "networkidle" }).catch(() => null);
    await page.waitForTimeout(400);

    const body = await page.evaluate(() => document.body?.innerText ?? "");
    // Marqueurs de bug silencieux : valeurs non formatées visibles à l'écran.
    const suspicious: string[] = [];
    for (const pat of [/\bundefined\b/, /\bNaN\b/, /\bnull\b/, /\bInfinity\b/, /\[object Object\]/]) {
      const m = body.match(pat);
      if (m) {
        const i = body.indexOf(m[0]);
        suspicious.push(`${m[0]} :: …${body.slice(Math.max(0, i - 70), i + 70).replace(/\n/g, " ⏎ ")}…`);
      }
    }

    const h1 = await page.locator("h1").allInnerTexts().catch(() => []);
    records.push({
      route,
      status: res?.status() ?? null,
      consoleErrors,
      pageErrors,
      bodyLen: body.length,
      suspicious,
      title: await page.title(),
      h1,
    });

    const slug = route.replace(/[^a-z0-9]+/gi, "_") || "root";
    fs.writeFileSync(path.join(OUT, `text${slug}.txt`), body);
    await page.screenshot({ path: path.join(OUT, `shot${slug}.png`), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(OUT, "crawl.json"), JSON.stringify(records, null, 2));
    expect(true).toBe(true);
  });
}
