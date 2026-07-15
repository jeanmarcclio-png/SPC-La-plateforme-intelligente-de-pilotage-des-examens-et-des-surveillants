# Supabase — SPC Cockpit

Base PostgreSQL du module **Opérations** (gestion des examens, surveillants,
salles, missions, devis, facturation).

> ⚠️ Aucun script de ce dossier n'est exécuté automatiquement par l'application
> ni par Vercel. Ils se lancent **manuellement** dans le **SQL Editor** de
> Supabase. Les fichiers ont été **réorganisés sans réécriture** : le contenu
> est identique à celui déjà appliqué en production, seul le rangement change.

## Structure

```
supabase/
  migrations/    Évolutions ordonnées du schéma Opérations (à jouer dans l'ordre)
  seed/          Données de démonstration (JAMAIS en production)
  bootstrap/     Snapshot « tout-en-un » pour initialiser une base neuve
  commercial/    Lignée séparée de l'app prospection (hors cockpit examens)
```

## Migrations (ordre de dépendance)

| Ordre | Fichier | Objet |
|------|---------|-------|
| 01 | `01_operations-base.sql` | Tables de base : surveillants, missions, affectations, devis, incidents (+ RLS) |
| 02 | `02_missions-type-montant.sql` | missions : `type`, `montant_ht` |
| 03 | `03_affectations-creneaux.sql` | affectations : salle, créneaux matin/après-midi |
| 04 | `04_salles.sql` | Table `salles` (+ RLS) |
| 05 | `05_amenagements-factures-presence.sql` | Tables `amenagements`, `factures` ; `presence` sur affectations |
| 06 | `06_devis-lignes.sql` | Table `devis_lignes` |
| 07 | `07_devis-salles-champs.sql` | `devis_salles` + champs devis (contact, dates, ville…) |
| 08 | `08_devis-equipe-frais.sql` | `devis_equipe` + frais/remise ; `factures.devis_id` |
| 09 | `09_devis-coefficient.sql` | devis : `coefficient` d'ajustement |
| 10 | `10_journal-sessions.sql` | Table `journal_sessions` (audit append-only) |
| 11 | `11_org-isolation.sql` | `organizations`, `organization_members` (multi-tenant) + `org_id` sur 7 tables |
| 11b | `11b_org-id-completion.sql` | **Correctif** : `org_id` sur les tables oubliées (affectations, amenagements, incidents, journal_sessions, factures) — requis avant le RLS strict |
| 12 | `12_rls-strict.sql` | Fonctions `spc_member_of` / `spc_has_role` + RLS strict par organisation/rôle |
| 13 | `13_surveillants-prenom-zone-dispo.sql` | surveillants : `prenom`, `zone`, `dispo_matin`, `dispo_apm` |
| 14 | `14_user-preferences.sql` | Table `user_preferences` |
| 15 | `15_profiles.sql` | Table `profiles` (1:1 `auth.users`) + trigger de création auto + RLS self |
| 16 | `16_org-parametres.sql` | organizations : `slug` (unique), `taux_horaire` (12.31), `coefficient_net` (0.7824) |
| 17 | `17_sessions.sql` | **Nouvelle** table `sessions` (examens : date, creneau, salle, duree_minutes, statut, besoin) + RLS stricte |
| 18 | `18_surveillants-affectations-liens.sql` | surveillants : `matin`/`aprem`/`heures_*`/`user_id` ; affectations : `session_id`, `remplacant_id` |
| 19 | `19_rls-surveillant.sql` | Rôle `surveillant` (lecture seule ses affectations) — helpers posés, durcissement documenté (phase 2) |
| 20 | `20_onboarding-rpc.sql` | RPC `spc_create_organization` (création d'org + rattachement admin, `security definer`) |

**Vocabulaire des rôles (`organization_members.role`)** : la couche applicative
reconnaît `admin`/`administrateur` (≡ admin), `coordinateur`, `planificateur`,
`surveillant` (lecture seule) et `lecteur`. La spec SaaS utilise `admin` /
`coordinateur` / `surveillant` ; les rangs legacy restent compatibles.

Toutes les migrations sont **idempotentes** (usage systématique de
`if not exists`, `create or replace`, `drop policy if exists`) : les rejouer est
sans effet de bord.

## Initialiser une base

**Option A — pas à pas (recommandé pour tracer l'historique)**
Jouer `migrations/01 → 14` dans l'ordre.

**Option B — installation rapide**
Jouer `bootstrap/operations-complet.sql` (équivaut aux migrations 01→05
consolidées), puis les migrations `06 → 14`.

**Données de démo (optionnel, hors production)**
`seed/demo-icp-reims.sql` insère un jeu d'exemple (salles, mission, devis,
factures, aménagements).
`seed/demo-saas-multitenant.sql` insère la démo SaaS multi-tenant : **1 organisation**,
**3 comptes** (`admin@demo.spc` / `coordinateur@demo.spc` / `surveillant@demo.spc`,
mot de passe `Demo1234!`), **10 surveillants**, **5 sessions**. À jouer après les
migrations 15 → 20. ⚠️ Écrit dans `auth.users`/`auth.identities` (schéma GoTrue) :
réservé aux environnements de démo, jamais en production.

## Sécurité / isolation

L'audit des politiques RLS et de l'isolation multi-organisation est documenté
dans [`../../docs/AUDIT_SUPABASE_RLS.md`](../../docs/AUDIT_SUPABASE_RLS.md).
Point clé : par défaut les policies sont **permissives** (tout utilisateur
authentifié accède à toutes les lignes) ; l'isolation stricte n'est effective
qu'une fois `11_org-isolation` + `12_rls-strict` appliqués **et** les
appartenances d'organisation renseignées.

## Lignée commerciale (`commercial/`)

`schema.sql` et `seed-prospects.sql` concernent l'app **prospection**
(campagnes, prospects, livrables) — un domaine distinct du cockpit examens.
Conservés ici pour référence, ils ne font pas partie du schéma Opérations.
