import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Scénarios QA forensic pilotés sur l'app réelle (données de démonstration).
// Chaque test produit une PREUVE écrite dans audit-artifacts/evidence.txt.

const OUT = path.resolve(__dirname, "../../../audit-artifacts");
fs.mkdirSync(OUT, { recursive: true });
const EV = path.join(OUT, "evidence.txt");
function proof(id: string, lines: string[]) {
  fs.appendFileSync(EV, `\n=== ${id} ===\n${lines.join("\n")}\n`);
}

test.setTimeout(180_000);

// QA-STATUT-001 — transitions de statut proposées par le formulaire d'édition
test("QA-STATUT-001 transitions proposées sur une mission Terminée", async ({ page }) => {
  await page.goto("/operations/missions", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const rows = page.locator("table tbody tr");
  const n = await rows.count();
  let found = "";
  for (let i = 0; i < n; i++) {
    const txt = await rows.nth(i).innerText();
    if (txt.includes("Terminée")) {
      found = txt.replace(/\s+/g, " ").slice(0, 120);
      await rows.nth(i).getByRole("button", { name: /^Modifier/ }).click();
      break;
    }
  }
  await page.waitForTimeout(800);
  const sel = page.locator('select[name="statut"]');
  const opts = await sel.locator("option").allInnerTexts();
  const current = await sel.inputValue();
  proof("QA-STATUT-001", [
    `Ligne ciblée : ${found}`,
    `Statut courant du select : ${current}`,
    `Options proposées (${opts.length}) : ${opts.join(" | ")}`,
    `Transition métier autorisée depuis « Terminée » (mission-status.ts) : Facturée, Archivée`,
  ]);
});

// QA-STATUT-002 — le menu d'actions de ligne applique-t-il la matrice ?
test("QA-STATUT-002 menu d'actions vs formulaire", async ({ page }) => {
  await page.goto("/operations/missions", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const rows = page.locator("table tbody tr");
  const n = await rows.count();
  const lines: string[] = [];
  for (let i = 0; i < n && lines.length < 4; i++) {
    const txt = (await rows.nth(i).innerText()).replace(/\s+/g, " ");
    const btns = await rows.nth(i).getByRole("button").allInnerTexts();
    lines.push(`ligne ${i}: ${txt.slice(0, 90)} → boutons: ${btns.map((b) => b.replace(/\s+/g, " ")).join(", ")}`);
  }
  proof("QA-STATUT-002", lines);
});

// QA-DBLCLICK-001 — double soumission du formulaire mission
test("QA-DBLCLICK-001 double clic sur Créer la mission", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(`${r.method()} ${r.url()}`);
  });
  await page.goto("/operations/missions", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Nouvelle mission/i }).first().click();
  await page.waitForTimeout(600);
  await page.locator('input[name="reference"]').fill("QA-DBL-001");
  await page.locator('input[name="client"]').fill("Client QA Doublon");
  const submit = page.getByRole("button", { name: /Créer la mission/i });
  const before = posts.length;
  await submit.click({ force: true });
  await submit.click({ force: true }).catch(() => {});
  await submit.click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);
  const body = await page.evaluate(() => document.body.innerText);
  proof("QA-DBLCLICK-001", [
    `Requêtes POST déclenchées par 3 clics rapides : ${posts.length - before}`,
    ...posts.slice(before).map((p) => `  ${p}`),
    `Bouton désactivé pendant traitement : ${await submit.isDisabled().catch(() => "n/a")}`,
    `Message d'erreur affiché : ${(body.match(/(échouée|Erreur|erreur)[^\n]{0,120}/) ?? ["(aucun)"])[0]}`,
  ]);
});

// QA-FORM-001 — valeurs zéro / négatives / non numériques
test("QA-FORM-001 valeurs limites du formulaire mission", async ({ page }) => {
  await page.goto("/operations/missions", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Nouvelle mission/i }).first().click();
  await page.waitForTimeout(600);
  const lines: string[] = [];
  for (const name of ["nb_salles", "nb_surveillants", "montant_ht"]) {
    const el = page.locator(`[name="${name}"]`);
    if ((await el.count()) === 0) { lines.push(`${name}: champ absent`); continue; }
    const attrs = await el.evaluate((e: HTMLInputElement) => ({
      type: e.type, min: e.min, max: e.max, step: e.step, required: e.required,
    }));
    await el.fill("-5").catch(() => {});
    const after = await el.inputValue().catch(() => "?");
    lines.push(`${name}: type=${attrs.type} min="${attrs.min}" max="${attrs.max}" step="${attrs.step}" required=${attrs.required} → saisie "-5" acceptée par le champ : "${after}"`);
  }
  proof("QA-FORM-001", lines);
});

// QA-FILTRE-001 — filtres du planning : compteurs vs lignes réelles
test("QA-FILTRE-001 cohérence filtre / compteur / lignes", async ({ page }) => {
  await page.goto("/operations/planification/planning", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const lines: string[] = [];
  const total = await page.locator("table tbody tr").count();
  lines.push(`Lignes sans filtre : ${total}`);
  for (const label of ["Sans salle", "Matin", "Après-midi", "Coordination", "Alertes"]) {
    const btn = page.getByRole("button", { name: new RegExp("^" + label) }).first();
    if ((await btn.count()) === 0) { lines.push(`${label}: bouton absent`); continue; }
    const badge = (await btn.innerText()).replace(/\s+/g, " ");
    await btn.click();
    await page.waitForTimeout(500);
    const c = await page.locator("table tbody tr").count();
    lines.push(`Filtre « ${badge} » → ${c} ligne(s) affichée(s)`);
  }
  proof("QA-FILTRE-001", lines);
});

// QA-CROISE-001 — même objet, plusieurs pages
test("QA-CROISE-001 mission active vue par chaque page", async ({ page }) => {
  const grab = async (route: string, pats: RegExp[]) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    return pats.map((p) => `${p} → ${(t.match(p) ?? ["(absent)"])[0]}`);
  };
  const lines: string[] = [];
  lines.push("— /operations (dashboard)");
  lines.push(...(await grab("/operations", [/COUVERTURE SURVEILLANTS \d+ %/, /\d+ sur \d+ postes pourvus/, /Manquants \d+/, /CA CONFIRMÉ HT [\d  ,]+€/, /MARGE HT [\d  ,]+€/])));
  lines.push("— /operations/cockpit");
  lines.push(...(await grab("/operations/cockpit", [/COUVERTURE GLOBALE \d+ %/, /\d+ \/ \d+ postes couverts/, /CONFIRMATIONS \d+ %/, /\d+ \/ \d+ salles/, /SCORE DE FLUIDITÉ IA [\d,]+ \/10/, /ALERTES ACTIVES \d+/])));
  lines.push("— /operations/planification");
  lines.push(...(await grab("/operations/planification", [/\d+ \/ \d+ requis/, /\d+ % de couverture/, /Marge estimée \d+ %/, /\d+ salles/, /[\d,]+ h/, /\/100/, /\d+ alerte\(s\) à traiter/])));
  lines.push("— /operations/salles");
  lines.push(...(await grab("/operations/salles", [/\d+ Salles configurées/, /\d+ Surveillants requis/, /affectés \d+ · manque \d+/, /\d+ Alertes actives/])));
  lines.push("— /operations/missions");
  lines.push(...(await grab("/operations/missions", [/Surveillants \d+\/\d+/, /Salles \d+\/\d+/, /Taux de couverture \d+ %/, /CA TOTAL \(HT\) [\d  ,]+€/, /ALERTES & POINTS D'ATTENTION \(\d+\)/])));
  proof("QA-CROISE-001", lines);
});

// QA-NAV-001 — deep link, paramètre invalide, retour arrière
test("QA-NAV-001 navigation directe et paramètres invalides", async ({ page }) => {
  const lines: string[] = [];
  for (const url of [
    "/operations/planification/planning?session=999999",
    "/operations/planification/planning?session=abc",
    "/operations/devis/999999",
    "/operations/devis/abc",
  ]) {
    const res = await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => null);
    await page.waitForTimeout(1500);
    const t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
    lines.push(`${url} → HTTP ${res?.status()} · ${t.slice(0, 180)}`);
  }
  proof("QA-NAV-001", lines);
});
