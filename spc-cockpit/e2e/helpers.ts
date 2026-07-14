import { type Page, expect } from "@playwright/test";

/**
 * Attache un collecteur d'erreurs JS non capturées (`pageerror`) à la page.
 * On ne surveille QUE les exceptions runtime — pas les `console.warn`/`error`
 * (souvent bruités par l'hydratation Next/React et sources de flakiness).
 * Retourne un accès à la liste pour l'asserter en fin de test.
 */
export function collectPageErrors(page: Page): { errors: Error[] } {
  const bucket: { errors: Error[] } = { errors: [] };
  page.on("pageerror", (err) => bucket.errors.push(err));
  return bucket;
}

/** Assertion commune : la page a bien chargé et n'a levé aucune exception. */
export async function expectNoPageErrors(bucket: { errors: Error[] }) {
  expect(
    bucket.errors,
    bucket.errors.map((e) => e.message).join("\n"),
  ).toHaveLength(0);
}

/** Toutes les routes du module Opérations (miroir de la sidebar). */
export const OPERATIONS_ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/operations", heading: /Vue d.ensemble/i },
  { path: "/operations/cockpit", heading: /Cockpit/i },
  { path: "/operations/missions", heading: /Missions/i },
  { path: "/operations/surveillants", heading: /Surveillants/i },
  { path: "/operations/planification", heading: /Planification/i },
  { path: "/operations/salles", heading: /Salles/i },
  { path: "/operations/pmr", heading: /PMR/i },
  { path: "/operations/devis", heading: /Devis/i },
  { path: "/operations/facturation", heading: /Facturation/i },
  { path: "/operations/presence", heading: /Pr.sence/i },
  { path: "/operations/incidents", heading: /Incidents/i },
  { path: "/operations/rapports", heading: /Rapports/i },
  { path: "/operations/risques", heading: /Risques/i },
];
