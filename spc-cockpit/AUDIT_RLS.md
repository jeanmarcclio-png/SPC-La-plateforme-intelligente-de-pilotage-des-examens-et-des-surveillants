# AUDIT_RLS.md — Audit du cloisonnement RLS / autorisation multi-tenant

> Audit de sécurité ciblé (lecture seule) sur l'isolation des données entre
> organisations et l'application des rôles. Conservé dans le repo comme référence
> pour le durcissement à venir.
>
> **Contexte confirmé : mono-tenant — SPC seul opérateur, 1 organisation.** Les
> établissements clients n'ont pas de compte. Les constats ci-dessous distinguent
> le risque *aujourd'hui* (mono-tenant) et le risque *au passage multi-tenant*.

## Verdict

Le système est **mono-tenant de fait**. L'isolation inter-organisations n'est pas
garantie au niveau ligne sur les tables PII — **sans danger tant que seuls des
employés SPC ont un compte**, mais **fuite cross-tenant** dès qu'un établissement
client obtient un login dans la même base.

Le risque **actif aujourd'hui** n'est donc pas le cross-tenant (impossible à 1 org)
mais l'**escalade de privilèges applicative** (cf. constat 5).

## Constats (fichier:ligne)

**1. Policies des tables PII gatées sur le RÔLE, pas sur l'organisation**
`supabase/migrations/23_rls-portail-surveillant.sql:45,66,89`
```sql
create policy "spc read surveillants" on surveillants for select to authenticated
  using (not spc_is_surveillant() or user_id = auth.uid());
```
Tout non-surveillant peut lire toutes les lignes, quelle que soit l'org (assumé
comme choix transition l.9-12 : « les policies ne dépendent PAS de org_id »).
→ Cross-tenant **si** plusieurs orgs. Moot à 1 org.

**2. Bootstrap consolidé = policies permissives `using(true)`**
`supabase/bootstrap/saas-quickstart.sql:102-105` — aucune isolation sur un déploiement neuf tant que les migrations 12/23 ne sont pas appliquées.

**3. Backfill `org_id` commenté → lignes `org_id NULL`**
`supabase/migrations/11_org-isolation.sql:89`, `saas-quickstart.sql:661`. Une policy stricte `spc_member_of(org_id)` masque les lignes NULL → d'où le contournement de la v23.

**4. Durcissement des affectations resté en commentaire**
`supabase/migrations/19_rls-surveillant.sql:42-63` (bloc `HARDENING` non exécuté).

**5. 🔴 Application des rôles désactivée côté applicatif (risque ACTIF)**
`lib/auth/session.ts:11-13` — `requireCapability` est permissif tant que
`SPC_ENFORCE_ROLES ≠ "1"` (`lib/auth/roles.ts:80-81` : `enforce=false` → autorisé
dès authentifié). Or des actions destructrices passent par `service_role`, qui
**contourne la RLS** :
`app/actions/rgpd.ts` (`anonymiserSurveillant` → `createServiceClient` +
`admin.auth.admin.deleteUser`). → **Tout compte authentifié peut anonymiser /
supprimer un surveillant.** C'est l'escalade de privilèges à fermer en priorité.

## Correctif livré — Migration 27 (`27_mono-tenant-lockdown.sql`)

Prépare une activation des rôles **sans verrouillage** (purement additive, aucune
réécriture de policy → ne casse pas le portail surveillant) :
1. Résout / crée l'organisation unique.
2. Backfille `org_id` sur les 12 tables métier + valeur par défaut.
3. **Garantit une appartenance à chaque compte auth** (surveillant vs
   administrateur) — condition pour que `SPC_ENFORCE_ROLES=1` ne dégrade personne
   en « lecteur ».

### Activation (2 étapes, côté exploitant)
1. Appliquer `supabase/migrations/27_mono-tenant-lockdown.sql` + exécuter les
   requêtes de vérification (0 ligne orpheline, 0 compte sans appartenance).
2. Positionner `SPC_ENFORCE_ROLES=1` (Vercel) → l'application des rôles ferme
   l'escalade de privilèges (constat 5).

## Reste à faire — Phase multi-tenant (avant tout login client)

Non couvert par la migration 27 (nécessite des tests contre le portail) :
- Remplacer les policies role-only (v23) par des policies **combinées
  `spc_member_of(org_id)` ET règle de rôle** sur `surveillants` / `affectations`
  / `disponibilites`, et restreindre les tables financières aux non-surveillants.
- Ajouter des **tests d'isolation** (un coordinateur de l'org A ne lit rien de
  l'org B) — non couverts par la suite actuelle.
- Auditer chaque usage de `service_role` pour confirmer qu'un `requireCapability`
  strict précède toujours l'écriture.
