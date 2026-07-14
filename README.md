# SPC — Plateforme de pilotage des examens et des surveillants

SPC est une plateforme SaaS de **gestion des examens et des surveillants** :
planification des salles, calcul automatique des heures facturables, devis,
affectation des surveillants et pilotage des sessions de bout en bout.

## Contenu du dépôt

| Dossier | Application | Techno | Statut |
|---|---|---|---|
| [`spc-cockpit/`](spc-cockpit/README.md) | **Cockpit examens** (production web) | Next.js 16 · TypeScript · Supabase | Actif — déployé sur Vercel |
| `spc-mobile/` | Cockpit commercial (prospection) | Expo / React Native | App mobile séparée |

👉 **Commencer par [`spc-cockpit/README.md`](spc-cockpit/README.md)** : installation,
configuration, commandes, base de données et déploiement.

## Documentation

- [`docs/CI_CD.md`](docs/CI_CD.md) — pipeline d'intégration continue et déploiement.
- [`docs/AUDIT_SUPABASE_RLS.md`](docs/AUDIT_SUPABASE_RLS.md) — audit des politiques RLS et de l'isolation multi-organisation.
- [`docs/COUVERTURE_TESTS.md`](docs/COUVERTURE_TESTS.md) — traçabilité des règles métier critiques vers les tests.
- [`spc-cockpit/supabase/README.md`](spc-cockpit/supabase/README.md) — structure et ordre des migrations SQL.

## Qualité

Portes automatisées (CI GitHub Actions) : `lint` · `typecheck` · `test` ·
`build`. Le moteur métier (calcul financier, validation planning, risques) est
pur et testé (~94 % de couverture). Aucun secret n'est stocké dans le dépôt.
