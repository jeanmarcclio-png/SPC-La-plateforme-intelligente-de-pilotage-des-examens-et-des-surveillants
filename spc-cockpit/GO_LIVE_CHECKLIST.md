# SPC — Checklist de go-live (smoke-test + variables Vercel)

Complément à `DEPLOIEMENT.md`. À dérouler **après** avoir appliqué le schéma
(`supabase/bootstrap/saas-quickstart.sql`) et le seed démo.

---

## ③ Variables d'environnement Vercel

Vercel → projet **spc-cockpit** → **Settings → Environment Variables**
(cocher **Production** *et* **Preview**) :

| Variable | Valeur | Obligatoire |
|---|---|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi…` (clé anon) | ✅ |
| `SPC_ENFORCE_ROLES` | `0` (transition ; passer à `1` en phase 2) | ⬜ |
| `SUPABASE_PROJECT_ID` | `<ref>` (pour `npm run db:types`) | ⬜ |
| `ANTHROPIC_API_KEY` | — | ⬜ (IA) |
| `RESEND_API_KEY` | — | ⬜ (emails) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | — | ⬜ (push) |
| `CRON_SECRET` | — | ⬜ (cron push) |

> Jamais de clé `service_role` : l'app n'utilise que la clé anon + RLS.
> Après ajout des variables → **redeploy** (Vercel ne les injecte qu'au build suivant).

---

## ② Smoke-test (comptes de démo)

Comptes du seed : `admin@demo.spc` / `coordinateur@demo.spc` / `surveillant@demo.spc` — mot de passe `Demo1234!`.

### A. Authentification
- [ ] `/operations` en navigation privée → **redirige vers `/login`** (proxy).
- [ ] `/login` (Mot de passe) `admin@demo.spc` / `Demo1234!` → connecté, arrive sur `/dashboard`.
- [ ] `/login` (Lien magique) → email reçu → clic → `/auth/callback` → connecté (vérifie que la Redirect URL est bien configurée côté Supabase).
- [ ] Déconnexion puis `/login?redirect=/operations/surveillants` → après login, atterrit sur la page demandée.

### B. Onboarding & organisation
- [ ] Créer un **nouveau compte** (email jamais vu) → à la 1re connexion, **redirigé vers `/onboarding`**.
- [ ] Formulaire onboarding (nom, taux `12.31`, coeff `0.7824`) → crée l'org, l'utilisateur devient **admin**, arrive sur `/operations`.
- [ ] Avec un user membre de **2 orgs**, le **sélecteur d'organisation** apparaît dans la topbar Ops et bascule bien (les données changent).

### C. Surveillants & import Excel *(fonctionnalité à préserver)*
- [ ] `/operations/surveillants` → les **10 surveillants** du seed s'affichent.
- [ ] Créer un surveillant → apparaît dans la liste.
- [ ] **Import Excel** d'un fichier de surveillants → lignes créées **en base** (pas en local).
- [ ] Contrôle SQL : `select count(*) from surveillants where org_id is not null;` > 0 et les nouvelles lignes ont bien `org_id` (requête ci-dessous).

### D. Suggestions d'affectation par équité *(à préserver)*
- [ ] `/operations/planification` → l'aide à l'affectation propose des surveillants (répartition équitable), sans erreur.

### E. Alertes cliquables *(à préserver)*
- [ ] `/operations/cockpit` → les alertes s'affichent et sont **cliquables** (navigation vers la page concernée).

### F. Auto-complétion des créneaux *(à préserver)*
- [ ] Éditer une affectation (matin/après-midi) → les **créneaux manquants se complètent** automatiquement, matin et après-midi restant indépendants.

### G. Convocations *(à préserver)*
- [ ] Bouton **« Convocations »** (planification) → génération/aperçu SMS sans erreur.

### H. Sessions (nouvelle table) — optionnel
- [ ] Via une action `createSession` ou une insertion SQL, créer une session d'examen → elle porte bien un `org_id` et respecte le statut `prevue|annulee`.

### I. Isolation multi-tenant (mode transition)
- [ ] En transition, un membre voit les données de son org (policies permissives). Contrôle que les **écritures portent `org_id`** :

```sql
-- Les créations récentes doivent avoir un org_id non NULL
select 'surveillants' t, count(*) filter (where org_id is not null) ok, count(*) total from surveillants
union all select 'missions',     count(*) filter (where org_id is not null), count(*) from missions
union all select 'devis',        count(*) filter (where org_id is not null), count(*) from devis
union all select 'affectations', count(*) filter (where org_id is not null), count(*) from affectations
union all select 'sessions',     count(*) filter (where org_id is not null), count(*) from sessions;
```

### J. Rôles (préparation phase 2)
- [ ] (Après `SPC_ENFORCE_ROLES=1`) `surveillant@demo.spc` → **lecture seule** ; `coordinateur`/`admin` → écriture. En transition (`=0`), tout utilisateur authentifié écrit — comportement attendu.

---

## Critère de succès
Tous les items A→G passent au vert avec `SPC_ENFORCE_ROLES=0`. Le durcissement
RLS (phase 2 : backfill → `12_rls-strict` → HARDENING `19` → `SPC_ENFORCE_ROLES=1`)
ne se fait **qu'après** ce smoke-test validé. Voir `DEPLOIEMENT.md` §6.
