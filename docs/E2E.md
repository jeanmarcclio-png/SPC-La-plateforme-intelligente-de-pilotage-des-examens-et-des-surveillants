# Tests end-to-end (Playwright) — SPC

Tests de bout en bout qui **pilotent l'application réelle** dans un navigateur,
avec les **données de démonstration** (mock-fallback, sans Supabase) et un
**bypass d'authentification réservé aux tests**.

## Lancer

```bash
cd spc-cockpit
npm run e2e            # démarre un serveur dev (SPC_E2E=1) et exécute la suite
```

- Playwright démarre lui-même le serveur (`playwright.config.ts` → `webServer`)
  sur le port `E2E_PORT` (défaut 3999) avec `SPC_E2E=1`.
- Le navigateur Chromium est celui de l'environnement
  (`/opt/pw-browsers/chromium`) ; surchargeable via
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Aucun téléchargement de navigateur.

## Bypass d'authentification de test

`proxy.ts` court-circuite la redirection vers `/login` **uniquement** si
`SPC_E2E=1`. Cette variable **n'est jamais définie en production ni sur Vercel** :
le déploiement réel reste protégé par l'authentification Supabase. Le bypass sert
seulement à piloter les écrans avec les données de démo.

## Couverture actuelle (`tests/e2e/operations.spec.ts`)

- **Smoke** : les 13 écrans du module Opérations se chargent sans erreur et sans
  écran de connexion (cockpit, planification, surveillants, missions, devis,
  salles, facturation, présence, incidents, PMR, rapports, risques).
- **Surveillants** : les actions sont de vrais boutons libellés (Modifier / Supprimer).
- **Planification (§21)** : score de santé, couverture, rentabilité et copilote
  d'affectation sont affichés ; le filtre « Sans salle » restreint la liste.
- **Missions** : le formulaire d'édition propose les 11 statuts du cycle de vie.

## Volontairement hors périmètre (nécessitent une base de test)

Les parcours qui **écrivent en base** (créer un devis, valider une session,
affecter et persister) appellent des Server Actions → Supabase. Sans instance de
test dédiée, ils ne sont pas automatisés ici :

- **Mutations** (création/validation/persistance) → nécessitent un projet
  Supabase de test avec un jeu de données isolé.
- **Isolation multi-organisation** (parcours 5) → nécessite deux organisations
  réelles + RLS strict appliqué (voir `AUDIT_SUPABASE_RLS.md`).

Ces parcours sont couverts au niveau **unitaire** côté moteur métier
(voir `COUVERTURE_TESTS.md`) : calculs, conflits, validation, rôles.

## CI

La suite e2e n'est **pas** dans le job CI bloquant (`ci.yml`) : elle exige un
navigateur et un serveur, ce qui alourdit et fragilise le pipeline de merge. Elle
se lance à la demande (`npm run e2e`) et peut être ajoutée plus tard dans un job
séparé (non bloquant) avec `npx playwright install --with-deps chromium`.
