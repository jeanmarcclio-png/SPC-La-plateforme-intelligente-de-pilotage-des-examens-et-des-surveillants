// Preuves navigateur des chantiers 4, 5 et 6 — audit QA forensic V2.
//
// Ces tests PILOTENT l'application réelle (données de démonstration, SPC_DEMO=1)
// et relèvent ce qui est effectivement affiché. Ils reproduisent les scénarios
// QA-SALLE-001, QA-TEMPS-001, QA-VALID-001 et les constats BUG-017 à BUG-021.
//
// Lancement : E2E_PORT=<port> npx playwright test tests/e2e/zz-chantier456.spec.ts
// Le serveur doit tourner avec SPC_E2E=1 et SPC_DEMO=1.

import { test, expect } from "@playwright/test";
import { appendFileSync } from "node:fs";

const PREUVES = "tests/e2e/preuves-chantier456.txt";
const trace = (ligne: string) => appendFileSync(PREUVES, ligne + "\n");

test.describe("Chantier 4 — intégrité référentielle (BUG-004)", () => {
  test("QA-SALLE-001 — la page Salles nomme les salles absentes du référentiel", async ({ page }) => {
    await page.goto("/operations/salles");
    const bandeau = page.locator(".integr");
    await expect(bandeau).toBeVisible();

    const texte = (await bandeau.innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-SALLE-001 → ${texte.slice(0, 260)}`);

    // Les 5 salles fantômes relevées par l'audit sont citées à l'écran.
    for (const nom of ["AMP", "C14", "E32", "F11", "F12"]) {
      expect(texte).toContain(nom);
    }
    // Et l'écran dit quoi faire, pas seulement qu'il y a un problème.
    expect(texte).toMatch(/Créez ces salles|corrigez le planning/);
  });
});

test.describe("Chantier 4 — vérité temporelle (BUG-014 / BUG-019)", () => {
  test("QA-TEMPS-001 — une session close n'est pas présentée comme « en direct »", async ({ page }) => {
    await page.goto("/operations/cockpit");

    const titre = (await page.locator(".hdr .ttl").first().innerText()).replace(/\s+/g, " ").trim();
    const sousTitre = (await page.locator(".hdr .subttl").first().innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-TEMPS-001 titre    → ${titre}`);
    trace(`QA-TEMPS-001 sous-ttl → ${sousTitre}`);

    // La session de démonstration est datée du 30 juillet 2026 : le badge
    // « Temps réel » et le curseur « maintenant » n'ont plus lieu d'être.
    expect(titre).not.toContain("Temps réel");
    expect(sousTitre).toMatch(/clôturée|à venir|sans date/);
    await expect(page.locator(".tl-now")).toHaveCount(0);

    // BUG-019 : la date est en toutes lettres, comme sur tous les autres écrans.
    const label = await page.locator(".hdr .datesel").first().innerText();
    trace(`QA-DATE-001 → ${label.replace(/\s+/g, " ").trim()}`);
    expect(label).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test("BUG-020 — le KPI Confirmations ne dit plus 100 % avec des postes vacants", async ({ page }) => {
    await page.goto("/operations/cockpit");
    const carte = page.locator(".kpi", { hasText: "CONFIRMATIONS" }).first();
    const texte = (await carte.innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-CONF-001 → ${texte}`);

    // Le dénominateur est le nombre de postes REQUIS (14), pas le nombre
    // d'affectations existantes (10) qui donnait « 100 % · 10 / 10 confirmés ».
    const m = texte.match(/(\d+)\s*\/\s*(\d+)\s*confirm/);
    expect(m).not.toBeNull();
    const [, confirmes, total] = m!;
    expect(Number(total)).toBeGreaterThan(Number(confirmes));
    expect(texte).not.toMatch(/\b100 %/);
  });

  test("BUG-021 — le ratio de salles supérieur à 100 % est nommé comme un écart", async ({ page }) => {
    await page.goto("/operations/cockpit");
    const pied = (await page.locator(".tbl-foot").first().innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-SALLES-RATIO → ${pied}`);
    expect(pied).toMatch(/de trop au planning|non ouverte|ouvertes sur/);
    expect(pied).not.toMatch(/^\s*8 \/ 6 salles/);
  });
});

test.describe("Chantier 4 — moteur de validation branché (BUG-015)", () => {
  // PORTÉE DE CE TEST — à lire avant de s'en satisfaire.
  // Il prouve que la session de démonstration (10/14) est REFUSÉE et que le
  // motif est affiché. Il ne prouve PAS quelle garde a refusé : le garde client
  // s'arrête sur la première cause rencontrée (ici les alertes de ligne), avant
  // même d'atteindre la sous-couverture. Le contrôle SERVEUR — celui qui compte,
  // puisqu'un Server Action est un point d'entrée réseau — est couvert par
  // `lib/operations/__tests__/validation-session.test.ts` et ne peut pas être
  // atteint depuis le navigateur sans contourner le garde client.
  test("QA-VALID-001 — une session à 10/14 est REFUSÉE", async ({ page }) => {
    await page.goto("/operations/planification");
    const bouton = page.locator("button", { hasText: "Valider la session" }).first();
    await expect(bouton).toBeVisible({ timeout: 15_000 });
    await bouton.click();

    // Le refus est visible : ni validation silencieuse, ni bouton inerte.
    // Les toasts sont rendus par sonner, sous [data-sonner-toast].
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    const message = (await toast.innerText()).replace(/\s+/g, " ").trim();
    trace(`QA-VALID-001 → ${message}`);

    expect(message).toMatch(/Impossible de valider|Validation refusée/);
    // Le motif est dit — la sous-couverture ou l'alerte à corriger, jamais
    // « une erreur est survenue ».
    expect(message).toMatch(/poste|alerte|surveillant|salle/i);
  });
});

test.describe("Chantier 6 — KPI honnêtes du dashboard (BUG-017 / BUG-018)", () => {
  test("BUG-017 — le titre de la courbe annonce des sessions et la période réelle", async ({ page }) => {
    await page.goto("/operations");
    // On relève le texte de la PAGE entière : le titre de la courbe est un
    // simple <div>, sans conteneur nommé sur lequel s'ancrer.
    // `innerText` rend le texte APRÈS transformation CSS : le titre est en
    // capitales à l'écran (`uppercase`), la comparaison est donc insensible.
    const texte = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const titre = texte.match(/(\d+ dernières? sessions? datées?|Évolution de la couverture)/i)?.[0] ?? "";
    const periode = texte.match(/\d{2}\/\d{2} → \d{2}\/\d{2}/)?.[0] ?? "";
    trace(`QA-TREND-001 → « ${titre} » · période ${periode || "—"}`);

    expect(texte.toLowerCase()).not.toContain("évolution sur 7 jours");
    expect(titre).not.toBe("");
    expect(periode).not.toBe("");
  });

  test("BUG-018 — la colonne DATE du tableau des sessions est triée", async ({ page }) => {
    await page.goto("/operations");
    const table = page.locator("table").filter({ hasText: "Mission" }).first();
    const cellules = await table.locator("tbody tr td:first-child").allInnerTexts();
    const dates = cellules.map((c) => c.split("\n")[0].trim());
    trace(`QA-TRI-001 → ${dates.join(" · ")}`);

    const MOIS: Record<string, number> = {
      janv: 1, févr: 2, mars: 3, avr: 4, mai: 5, juin: 6,
      juil: 7, août: 8, sept: 9, oct: 10, nov: 11, déc: 12,
    };
    const cles = dates.map((d) => {
      const m = d.match(/(\d{2}) (\S+?)\.? (\d{4})/);
      if (!m) return 0;
      return Number(m[3]) * 10000 + (MOIS[m[2].replace(".", "")] ?? 0) * 100 + Number(m[1]);
    });
    expect(cles).toEqual([...cles].sort((a, b) => a - b));
  });
});
