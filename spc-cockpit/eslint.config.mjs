import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // La passerelle de recette est un utilitaire Node autonome, lancé par
    // `node fichier.cjs` hors de toute compilation Next. CommonJS y est le
    // format correct, pas une entorse : `require` est le seul chargeur
    // disponible dans un `.cjs`.
    files: ["supabase/recette/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);

export default eslintConfig;
