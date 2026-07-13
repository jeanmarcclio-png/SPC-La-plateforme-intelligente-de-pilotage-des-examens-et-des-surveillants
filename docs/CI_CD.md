# CI / CD — SPC

## Pipeline d'intégration continue

Workflow : [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

La CI s'exécute sur **chaque pull request** et sur **chaque push vers `main`**.
Elle est **bloquante** : une étape en échec fait échouer tout le job (pas de
merge d'un état cassé).

### Étapes (dans l'ordre)

| # | Étape | Commande | Rôle |
|---|-------|----------|------|
| 1 | Install | `npm ci` | Installation reproductible depuis `package-lock.json` |
| 2 | Lint | `npm run lint` | ESLint (config Next) |
| 3 | Types | `npm run typecheck` | `tsc --noEmit` — 0 erreur TypeScript |
| 4 | Tests | `npm run test` | Vitest (moteur métier + règles critiques) |
| 5 | Build | `npm run build` | `next build` de production |

### Choix techniques

- **Répertoire de travail** : `spc-cockpit/` (l'app web de production ; l'app
  Expo `spc-mobile/` n'est pas dans ce pipeline).
- **Node 22** — aligné sur l'environnement de développement et Vercel
  (voir `spc-cockpit/.nvmrc` et `engines` dans `package.json`).
- **Cache npm** via `actions/setup-node` (`cache-dependency-path`
  pointant sur `spc-cockpit/package-lock.json`).
- **Concurrency** : une exécution en cours sur une même réf est annulée quand
  un nouveau commit arrive (économie de minutes).

### Règle d'or

On **ne désactive jamais** une règle (ESLint, TypeScript, test) pour faire
passer la CI : on corrige la cause. Le build ne doit pas masquer d'erreur de
type — `next.config` ne contient pas de `ignoreBuildErrors`.

## Couverture de tests

`npm run test:coverage` génère un rapport de couverture (provider `v8`).
Référence actuelle sur le moteur métier (`lib/operations`) : **~94 % de
statements**. La couverture n'est pas un objectif chiffré à 100 % ; elle vise à
garantir qu'**aucune règle métier critique n'est sans test** (calculs
financiers, conflits d'affectation, validation de session, import).

## Déploiement

Le déploiement web est géré par **Vercel** (projet relié au dépôt GitHub,
Root Directory = `spc-cockpit`). Un push sur `main` déclenche un déploiement de
production ; une pull request génère un déploiement de prévisualisation.

> Les variables d'environnement (Supabase, etc.) sont configurées dans Vercel
> et localement via `spc-cockpit/.env.local` (modèle : `.env.example`). Aucun
> secret n'est stocké dans le dépôt.
