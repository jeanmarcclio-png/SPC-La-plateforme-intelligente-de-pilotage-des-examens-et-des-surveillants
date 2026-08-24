/**
 * Configuration Vitest dédiée à la recette applicative.
 *
 * Volontairement séparée de `vitest.config.ts` : la suite ordinaire doit rester
 * exécutable sans base, partout, en quelques secondes. Cette recette-ci exige une
 * pile PostgreSQL + PostgREST vivante ; la mêler à `npm test` rendrait la suite
 * principale rouge sur tout poste sans base — et une suite qu'on apprend à voir
 * rouge ne protège plus rien.
 */
import { defineConfig } from "vitest/config";
import path from "path";

const racine = path.resolve(__dirname, "../../..");

export default defineConfig({
  test: {
    environment: "node",
    include: [path.join(__dirname, "recette-applicative.test.ts")],
    // Les lots partagent une base unique : les faire tourner en parallèle
    // ferait s'entre-détruire leurs fixtures.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": racine,
      // `server-only` est un garde-fou de compilation Next : il n'a pas de
      // contrepartie exécutable. Hors serveur Next, on le neutralise.
      "server-only": path.join(__dirname, "stub-vide.ts"),
    },
  },
});
