# SPC Cockpit — Mise en production (SaaS multi-tenant)

Guide de déploiement de l'application Next.js sur **Vercel** avec **Supabase**
(Postgres + Auth + RLS) en **région Union européenne**.

---

## 1. Créer le projet Supabase (région EU)

1. Sur [supabase.com](https://supabase.com), **New project**.
2. **Region** : `Central EU (Frankfurt) — eu-central-1` ou `West EU (Paris) — eu-west-3`.
   > ⚠️ La région est définitive : elle ne peut pas être changée après création.
3. Noter l'**URL du projet** (`https://<ref>.supabase.co`) et la **clé anon**
   (Project Settings → API).

## 2. Appliquer le schéma (SQL Editor Supabase)

Jouer les migrations **dans l'ordre**, depuis `supabase/migrations/` :

```
01 → 14   (schéma Opérations existant)
15_profiles.sql
16_org-parametres.sql
17_sessions.sql
18_surveillants-affectations-liens.sql
19_rls-surveillant.sql
20_onboarding-rpc.sql
21 → 30   (disponibilités, portail surveillant, RGPD, mono-tenant, créneaux)
31_devis-suivi-commercial.sql
```

Toutes les migrations sont idempotentes (rejouables sans effet de bord).

**Démo (hors production)** : `supabase/seed/demo-saas-multitenant.sql`
crée 1 organisation, 3 comptes (admin / coordinateur / surveillant,
mot de passe `Demo1234!`), 10 surveillants, 5 sessions.

## 3. Configurer l'authentification Supabase

Dans **Authentication → URL Configuration** :

- **Site URL** : `https://<votre-domaine-vercel>`
- **Redirect URLs** : ajouter
  `https://<votre-domaine-vercel>/auth/callback`
  (indispensable pour le **magic link** et la validation email).

Dans **Authentication → Providers → Email** : activer **Email** (mot de passe)
et **Magic Link**. Régler la confirmation email selon votre politique.

## 4. Variables d'environnement Vercel

Project → **Settings → Environment Variables** (Production + Preview) :

| Variable | Obligatoire | Rôle |
|----------|:---:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase (EU) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique anon (sécurité portée par la RLS) |
| `SPC_ENFORCE_ROLES` | ⬜ | `1` = application stricte des rôles côté serveur. Laisser `0` (transition) tant que les appartenances ne sont pas semées |
| `SUPABASE_PROJECT_ID` | ⬜ | Ref du projet, pour `npm run db:types` (build local) |
| `ANTHROPIC_API_KEY` | ⬜ | IA d'aide à la décision |
| `RESEND_API_KEY` | ⬜ | Emails transactionnels |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ⬜ | Web Push |
| `CRON_SECRET` | ⬜ | Protection de `/api/push/cron` |

> Ne jamais exposer de clé « service_role » côté client. L'app n'en a pas besoin :
> tout passe par la clé anon + RLS.

## 5. Premier login & onboarding

1. Créer un compte via `/login` (email + mot de passe ou magic link).
2. Sans organisation, l'utilisateur est redirigé vers **`/onboarding`** : il crée
   son organisation (nom, taux horaire `12.31`, coefficient net `0.7824`) et en
   devient **admin** (RPC `spc_create_organization`).
3. Le **sélecteur d'organisation** (topbar Opérations) apparaît dès qu'un
   utilisateur appartient à plusieurs organisations.

## 6. Durcissement RLS (passage en isolation stricte)

Par défaut le projet fonctionne en **mode transition** (policies permissives
héritées du schéma d'origine ; les écritures sont déjà estampillées `org_id`).
Pour activer l'isolation stricte par organisation :

1. **Backfill** : renseigner `org_id` sur toutes les lignes métier existantes
   (voir bloc commenté en fin de `11_org-isolation.sql`).
2. Rattacher chaque utilisateur via `organization_members`.
3. Appliquer `12_rls-strict.sql` (policies scopées par org/rôle).
4. Appliquer le bloc **HARDENING** de `19_rls-surveillant.sql` (lecture
   restreinte du rôle `surveillant` à ses propres affectations).
5. Passer `SPC_ENFORCE_ROLES=1`.

> Tant que le backfill n'est pas fait, ne pas activer `12` : les lignes à
> `org_id` NULL deviendraient invisibles. Détails :
> [`docs/AUDIT_SUPABASE_RLS.md`](../docs/AUDIT_SUPABASE_RLS.md).

## 7. Types TypeScript générés

Après toute migration, régénérer les types depuis le schéma :

```bash
export SUPABASE_PROJECT_ID=<ref>
supabase login          # une fois
npm run db:types        # → lib/supabase/database.types.ts
```

## 8. Vérification post-déploiement

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm test            # 204 tests (moteur financier, imports, alertes…)
npm run build
```

Vérifier ensuite dans l'app : suggestions d'affectation (équité), génération de
convocations, alertes cliquables, auto-complétion des créneaux, import Excel des
surveillants (les nouveaux surveillants sont créés en base avec `org_id`).
