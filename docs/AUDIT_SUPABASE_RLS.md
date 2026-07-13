# Audit Supabase & RLS — SPC Cockpit

Audit **statique** (lecture des scripts SQL du dépôt). Il n'a pas été possible
de se connecter à l'instance Supabase depuis l'environnement de travail : les
constats portent sur les migrations versionnées, pas sur l'état réel de la base.
Chaque point marqué **[à vérifier en base]** doit être confirmé côté Supabase.

## 1. Périmètre

Schéma **Opérations** (cockpit examens). La lignée commerciale
(`supabase/commercial/` — campagnes/prospects) est hors périmètre de cet audit.

Tables métier : `surveillants`, `missions`, `affectations`, `devis`,
`devis_lignes`, `devis_salles`, `devis_equipe`, `salles`, `amenagements`,
`factures`, `incidents`, `journal_sessions`, `user_preferences`.
Tables multi-tenant : `organizations`, `organization_members`.

## 2. État RLS par table

**RLS activé** (`enable row level security`) sur toutes les tables métier — ✅.

Deux régimes de policies coexistent selon les migrations appliquées :

| Régime | Migration | Politique |
|--------|-----------|-----------|
| **Permissif (transition)** | 01, 04, 05, 06… | `for {select,insert,update,delete} to authenticated using (true)` — **tout utilisateur authentifié lit et écrit toutes les lignes** |
| **Strict (multi-tenant)** | 12 (`rls-strict`) | `select` = `spc_member_of(org_id)` ; `insert/update` = `spc_has_role(org_id, rang)` ; `delete` = rang admin |

## 3. Risques identifiés

### 🔴 Bloquant — incohérence 11 ↔ 12 (org_id manquant)
`12_rls-strict` applique des policies basées sur `org_id` à
**affectations, amenagements, incidents, journal_sessions, factures**, mais
`11_org-isolation` n'ajoute `org_id` qu'à 7 tables (missions, devis,
devis_lignes, devis_equipe, devis_salles, salles, surveillants).
→ Jouer `12` en l'état échoue (`column org_id does not exist`). C'est très
probablement la raison pour laquelle l'isolation stricte n'est pas active.
**Correctif fourni** : `migrations/11b_org-id-completion.sql` (additif,
idempotent) — à jouer **avant** `12_rls-strict`.

### 🔴 Élevé — isolation permissive par défaut
Tant que `11 (+11b)` et `12` ne sont pas appliqués **et** les appartenances
d'organisation renseignées, **il n'y a aucune isolation entre organisations au
niveau base** : chaque utilisateur authentifié voit toutes les données de
toutes les tables. Acceptable pour un déploiement mono-organisation ; à corriger
impérativement avant tout usage multi-tenant réel. **[à vérifier en base]** :
quel régime est effectivement appliqué aujourd'hui ?

### 🟠 Moyen — `org_id` NULLABLE + backfill
Après `11/11b`, `org_id` est NULLABLE et les lignes existantes valent `NULL`.
Une fois `12` appliqué, `spc_member_of(NULL)` déterminera la visibilité de ces
lignes héritées : selon l'implémentation, elles peuvent devenir **invisibles**
(risque de « disparition » de données à l'écran) ou **visibles de tous** (trou
d'isolation). **Avant d'activer le strict** : backfiller `org_id` sur toutes les
lignes (rattacher chaque donnée à son organisation), puis idéalement passer les
colonnes en `NOT NULL`.

### 🟠 Moyen — double couche d'autorisation à garder synchrone
L'app applique aussi des gardes applicatives (`requireCapability`, mode
transition tant que `SPC_ENFORCE_ROLES≠1`). Ces gardes **ne remplacent pas** le
RLS : un accès direct à l'API Supabase (clé anon) n'est protégé que par le RLS.
La sécurité réelle en multi-tenant repose donc sur le RLS strict, pas seulement
sur l'app.

### 🟡 Faible — index & intégrité
Présents : index sur `journal_sessions(mission_id, created_at)`,
`organization_members(user_id/org_id)`, clés étrangères devis↔missions,
factures↔devis. **[à vérifier en base]** : index sur les colonnes de filtre
fréquentes (`affectations.mission_id`, `affectations.surveillant_id`,
`org_id` sur les tables scopées) — à ajouter si absents pour la performance des
policies (`spc_member_of(org_id)` est évalué à chaque ligne).

## 4. Plan de correction priorisé

1. **[à vérifier en base]** Déterminer le régime RLS actuellement appliqué.
2. Appliquer `11b_org-id-completion.sql` (débloque `12`).
3. Définir la stratégie d'organisations : créer les orgs, renseigner
   `organization_members`, **backfiller `org_id`** sur toutes les tables.
4. Rejouer `12_rls-strict.sql` (les `drop policy if exists` le rendent
   idempotent) pour remplacer les policies permissives.
5. Passer les `org_id` en `NOT NULL` une fois le backfill terminé.
6. Activer `SPC_ENFORCE_ROLES=1` côté application pour aligner la couche applicative.
7. Ajouter les index manquants sur `org_id` et les colonnes de jointure.
8. Tester l'isolation avec deux organisations distinctes (cf. Playwright, Phase 6).

## 5. Ce qui n'a pas pu être vérifié

- L'état réel de la base (quelles migrations sont appliquées, données présentes).
- Le comportement exact de `spc_member_of(NULL)`.
- La présence effective des index en production.

Ces points nécessitent un accès au projet Supabase (SQL Editor / `supabase db`).
