# SPC Cockpit — Pilotage opérationnel des examens

Application web de **gestion des examens et des surveillants** : planification
des salles et créneaux, calcul automatique des heures facturables, devis
HT/TVA/TTC, affectation des surveillants, validation de session, suivi terrain
(présence, incidents) et aide à la décision (copilote d'affectation,
rentabilité, santé de session).

> C'est l'application web de production du dépôt (déployée sur Vercel). Le dépôt
> contient aussi `spc-mobile/` (app Expo commerciale), hors de ce périmètre.

## Problème métier

Les centres d'examens (écoles, universités, business schools) doivent, pour
chaque session : dimensionner les salles, mobiliser le bon nombre de
surveillants (dont PMR / tiers-temps), respecter des contraintes horaires,
chiffrer précisément et facturer sans erreur. SPC Cockpit centralise ce flux —
**demande → mission → devis → planning → affectation → validation → terrain →
facturation** — avec un moteur de calcul unique et traçable.

## Fonctionnalités principales

- **Devis** : heures facturables, taux, coefficient d'ajustement, frais, remise,
  HT/TVA/TTC exacts (calcul en centimes, aucun arrondi flottant).
- **Planification** : salles matin/après-midi indépendantes, créneaux, affectation
  recherchable, détection de conflits, validation bloquante, journal append-only.
- **Surveillants** : annuaire (prénom/nom, zone, disponibilités), import/export
  Excel/CSV avec aperçu, dédoublonnage et détection des affectations existantes.
- **Cockpit & alertes** : synthèse terrain, alertes priorisées (criticité +
  urgence), couverture des salles.
- **Aide à la décision** : copilote d'affectation explicable, analyse de
  rentabilité, prédiction de sous-effectif, score de santé de session.
- **PMR / tiers-temps, présence, incidents, facturation, rapports.**

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Langage | TypeScript (`strict`) |
| Style | Tailwind CSS v4 + design system maison (`components/ops`) |
| Données | Supabase (PostgreSQL + RLS) via `@supabase/ssr` |
| Tests | Vitest (+ couverture v8) |
| Import/export | SheetJS `xlsx` (Excel), parseur CSV maison |
| Qualité | ESLint, `tsc --noEmit`, CI GitHub Actions |

## Prérequis

- **Node ≥ 20.9** (voir `.nvmrc` → 22) et **npm**.
- Un projet **Supabase** (URL + clé anon) pour les données réelles. Sans base
  connectée, l'app affiche des **données de démonstration** (mock-fallback).

## Installation

```bash
cd spc-cockpit
npm ci                     # installation reproductible
cp .env.example .env.local # puis renseigner les valeurs
```

### Configuration (`.env.local`)

Voir [`.env.example`](.env.example). Variables clés :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Connexion Supabase (la clé anon est publique ; la sécurité repose sur le RLS) |
| `SPC_ENFORCE_ROLES` | `1` active le contrôle strict des rôles (sinon mode transition) |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `*VAPID*`, `CRON_SECRET` | IA, emails, notifications push, sécurité du cron (optionnels) |

> **Aucun secret n'est versionné.** Ne jamais committer de `.env.local`.

## Commandes

```bash
npm run dev            # développement (http://localhost:3000)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # tests unitaires (Vitest)
npm run test:coverage  # tests + rapport de couverture
npm run build          # build de production
```

## Base de données (Supabase)

Les scripts SQL sont dans [`supabase/`](supabase/README.md) :
`migrations/` (ordonnées, idempotentes), `seed/` (démo), `bootstrap/`
(installation rapide), `commercial/` (lignée prospection). Ils se jouent
**manuellement** dans le SQL Editor de Supabase. L'audit des politiques RLS est
documenté dans [`../docs/AUDIT_SUPABASE_RLS.md`](../docs/AUDIT_SUPABASE_RLS.md).

## Structure du projet

```
spc-cockpit/
  app/
    (operations)/operations/   pages du module (cockpit, planification, devis, …)
    actions/                   Server Actions ({ error? }, gardées par capacité)
    api/                       routes API (push/cron, …)
  components/ops/              design system + composants métier
  lib/
    operations/
      engine/                  moteur pur : financier, validation, risque
      *.ts                     import, suggestions, rentabilité, couverture, santé…
    auth/                      rôles & autorisation
    supabase/                  clients server/browser
  supabase/                    migrations, seed, bootstrap
```

Le **moteur métier est pur et testé** (aucun calcul financier dans les
composants) : voir [`../docs/COUVERTURE_TESTS.md`](../docs/COUVERTURE_TESTS.md).

## Conventions Git & CI

- Commits conventionnels : `feat(...)`, `fix(...)`, `chore(...)`, `test(...)`,
  `docs(...)`.
- Avant chaque commit : `lint`, `typecheck`, `test`, `build` doivent passer.
- La **CI GitHub Actions** rejoue ces étapes sur chaque PR et push `main`
  (voir [`../docs/CI_CD.md`](../docs/CI_CD.md)). On ne désactive jamais une règle
  pour faire passer la CI — on corrige la cause.

## Déploiement

Déploiement **Vercel** (Root Directory = `spc-cockpit`). Un push sur `main`
déclenche la production ; une PR génère une prévisualisation. Les variables
d'environnement sont configurées dans Vercel (jamais dans le dépôt).

## Dépannage

- **Les écrans montrent des données d'exemple** → Supabase n'est pas connecté
  (`.env.local` manquant/incomplet). L'app bascule volontairement sur le
  mock-fallback plutôt que de planter.
- **`column ... does not exist`** à l'exécution d'un SQL → une migration
  antérieure manque ; suivre l'ordre de `supabase/README.md`.
- **Build échoue avec « No Next.js version detected » sur Vercel** → le Root
  Directory du projet doit être `spc-cockpit`.

## Sécurité

- **RLS PostgreSQL** sur les tables sensibles ; isolation multi-organisation
  disponible (migrations 11/11b/12) — voir l'audit RLS.
- **Gardes applicatives** : chaque Server Action mutante appelle
  `requireCapability(...)`.
- **Aucun secret dans le dépôt** ; `.env.example` documente les variables.

## Contribution

1. Créer une branche de travail.
2. Développer avec des commits petits et explicites.
3. `npm run lint && npm run typecheck && npm run test && npm run build` — tout
   doit passer.
4. Ouvrir une pull request ; la CI valide automatiquement.
