# CONFORMITE.md — Conformité technique RGPD

> Document de référence interne. Décrit les mesures techniques de protection des
> données mises en œuvre dans la plateforme SPC (spc-cockpit). À tenir à jour à
> chaque évolution touchant les données personnelles.
>
> **Statut : v0.1 — Juillet 2026.** À faire valider par le conseil juridique /
> DPO avant diffusion externe. Les documents contractuels associés (DPA, registre
> des traitements, politique de confidentialité) sont maintenus séparément.

---

## 1. Localisation et hébergement des données

| Composant | Fournisseur | Région | Données |
|-----------|-------------|--------|---------|
| Base de données, Auth, Storage, Realtime | Supabase | **eu-west-1 (Irlande, UE)** | Toutes les données applicatives (surveillants, sessions, affectations, comptes, journaux) |
| Hébergement applicatif (Next.js) | Vercel | **cdg1 (Paris, France, UE)** — forcé via `vercel.json` | Aucune donnée persistée ; traitement en transit |

- **Supabase — région UE confirmée** : projet hébergé en `eu-west-1` (Irlande).
  Aucune donnée personnelle n'est stockée hors Union européenne. Aucune migration
  de région n'est nécessaire.
- **Vercel — région forcée UE** : `vercel.json` fixe `"regions": ["cdg1"]` (Paris)
  pour que l'exécution des fonctions serverless et le rendu se fassent en UE.
- **Polices de caractères auto-hébergées** : la plateforme utilise `next/font`,
  qui télécharge et sert les polices depuis le domaine de l'application au build.
  **Aucun appel runtime vers Google Fonts** (pas de fuite d'IP visiteur vers un
  tiers).

### Inventaire des flux sortants (sous-traitants / destinataires)

| Flux | Destinataire | Région | Données transmises | Base / garde-fou |
|------|--------------|--------|--------------------|------------------|
| REST / Realtime / Auth / Storage | Supabase | UE (Irlande) | Toutes les données applicatives | Sous-traitant art. 28 ; RLS par organisation et par rôle |
| Emails transactionnels (prospection) | Resend | **Hors UE (US)** | Email + contenu du message prospect | Sous-traitant ; encadrement chapitre V (CCT) à confirmer au DPA. Activé uniquement si `RESEND_API_KEY` présent |
| Notifications push navigateur | Service push du navigateur (Google/Mozilla/Apple) via VAPID | Variable | Endpoint d'abonnement + contenu de la notification (sans PII) | Web Push standard ; contenu minimisé |
| Assistance IA (copilote, analyse de risque) | Anthropic | **Hors UE (US)** | Données **agrégées et pseudonymisées** — jamais de nom/email/téléphone | Voir §4. Redaction + garde-fou `assertNoPII`. Activé uniquement si `ANTHROPIC_API_KEY` présent |

> **Anthropic — sous-traitant IA** : les endpoints `/api/copilote` et
> `/api/agents/planning-risk` appellent l'API Anthropic (US). Un garde-fou
> (`lib/agents/redaction.ts`) pseudonymise les surveillants (`S-12`) et neutralise
> toute PII résiduelle (email/téléphone) **avant** l'envoi ; `assertNoPII` bloque
> le payload si une PII est détectée. À inscrire au registre des sous-traitants et
> à encadrer par CCT (chapitre V RGPD).

---

## 2. Durées de conservation et purges

Purges automatisées via **pg_cron** (extension PostgreSQL) — exécution **en base,
dans l'UE**, sans egress de données. Migration : `supabase/migrations/25_rgpd-purges.sql`.
Planification hebdomadaire (dimanche 03:00 UTC), fonction `spc_purge_rgpd()`.

| Donnée | Durée | Traitement |
|--------|-------|-----------|
| Sessions d'examens + affectations | N+2 ans | Suppression |
| Journaux d'actions (`journal_sessions`) | 12 mois | Suppression |
| Comptes surveillants inactifs (liés à un compte) | 2 ans sans affectation | **Anonymisation** (nom → « Compte supprimé », email → hash `.invalid`, téléphone → null) ; **agrégats d'heures / taux / nb_examens CONSERVÉS** pour la paie (5 ans) |
| Candidats surveillants (jamais affectés, sans compte) | 2 ans | Suppression |

Chaque passage écrit une ligne de synthèse dans la table **`evenements`**
(type, nb de lignes, `dry_run: true/false`, seuil appliqué).

### Mode DRY-RUN par défaut

- La fonction lit `rgpd_config.enforce` (**`false` par défaut**).
- Tant que `enforce = false` : la purge **COMPTE et journalise** dans `evenements`
  **sans rien supprimer** (`detail.dry_run = true`).
- **Activation réelle** (après ~1 mois d'observation des volumes en dry-run) :
  ```sql
  update rgpd_config set enforce = true, updated_at = now() where id = 1;
  ```
- Exécution manuelle possible à tout moment (reste en dry-run tant que `enforce` est `false`) :
  ```sql
  select spc_purge_rgpd();
  ```
- Retour en observation :
  ```sql
  update rgpd_config set enforce = false where id = 1;
  ```

**Pré-requis Supabase** : activer l'extension `pg_cron` une fois (Dashboard →
Database → Extensions), puis appliquer la migration 25.

---

## 3. Exercice des droits des personnes

| Droit | Mise en œuvre | Où |
|-------|---------------|-----|
| Accès / portabilité | Export **JSON + CSV** de toutes les données d'un surveillant (identité, disponibilités, affectations, heures) | Fiche surveillant → « Exporter les données » (`exporterDonneesSurveillant`) |
| Effacement | **Anonymisation individuelle** (mêmes règles que la purge auto ; heures conservées pour la paie ; compte Auth supprimé ; événement d'audit) | Fiche surveillant → « Anonymiser (effacement) » (`anonymiserSurveillant`, réservé admin) |
| Information | Page publique **/confidentialite** (sans authentification) | Lien en pied de la page de connexion, du portail surveillant, et à insérer dans l'email d'invitation Supabase |

### Procédure d'exercice d'un droit (surveillant / candidat SPC)

1. La demande arrive à l'adresse de contact RGPD (voir politique de confidentialité).
2. Un administrateur ouvre la fiche du surveillant concerné (module Opérations → Surveillants).
3. **Accès / portabilité** : cliquer « Exporter les données » → transmettre les fichiers JSON + CSV générés.
4. **Effacement** : cliquer « Anonymiser (effacement) » → confirmation → l'action
   efface les données identifiantes, conserve les agrégats de paie (obligation légale),
   supprime le compte de connexion et journalise l'opération dans `evenements`.
5. Répondre à la personne dans un délai d'un mois.
6. Si la personne relève d'un **établissement client** (responsable de traitement),
   transmettre la demande à cet établissement.

> **Lien /confidentialite dans l'email d'invitation** : dans Supabase → Auth →
> Email Templates → « Invite user », ajouter un lien vers
> `https://<domaine>/confidentialite` dans le corps du template.

---

## 4. Minimisation des données

- **Import Excel/CSV** : seules les colonnes reconnues (`HEADER_MAP`) sont
  importées. Les en-têtes non reconnus sont **ignorés ET listés** à l'utilisateur
  (« Colonnes non importées : … ») — aucune donnée libre non maîtrisée n'entre en base.
- **Aménagements d'épreuves (tiers-temps / PMR)** : **aucun champ d'identification
  d'étudiant**. Les aménagements sont rattachés à une session (réf. `ETU-001`
  générée), jamais à un étudiant nommé. Le libellé libre est plafonné à **200
  caractères** et accompagné de l'avertissement « Ne saisissez aucune donnée
  permettant d'identifier un étudiant ».
- **Journalisation applicative sans PII** : logger centralisé masquant (`lib/log.ts`)
  — emails et téléphones sont masqués (`j***@x.fr`, `06••••••78`) dans tous les logs.
- **IA** : payloads pseudonymisés + garde-fou `assertNoPII` (voir §1 / `lib/agents/redaction.ts`).
- **Cookies** : uniquement strictement nécessaires (session, authentification,
  sécurité) — **exemptés de consentement**, donc **aucune bannière**. Aucun cookie
  publicitaire ni de mesure d'audience tierce.

---

## 5. Sécurité

### En-têtes HTTP (`next.config.ts`)

| En-tête | Valeur |
|---------|--------|
| Content-Security-Policy | `default-src 'self'` + Supabase (REST/wss) + polices auto-hébergées ; `frame-ancestors 'none'`, `object-src 'none'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |

> Évolution possible : durcir la CSP par `nonce` pour supprimer `'unsafe-inline'`
> sur scripts/styles.

### Rate limiting

- **Server Actions** : limite par utilisateur (`lib/rateLimit.ts`, `checkRateLimit`).
- **Endpoints IA** (`/api/copilote`, `/api/agents/planning-risk`) : limite par
  `utilisateur + IP` (20 req/min), réponse `429` avec `Retry-After`.
- **Authentification (`/login`)** : la connexion (mot de passe et lien magique)
  s'effectue directement contre **Supabase Auth**, qui applique ses propres limites
  anti-force-brute côté serveur (configurables dans Supabase → Auth → Rate Limits).
  Aucune donnée d'authentification ne transite par une route applicative custom.

### Authentification

- **Lien magique / OTP : validité ≤ 1 h.** À régler dans Supabase → Auth →
  Providers / Email → « Email OTP Expiration » = `3600` (secondes) ou moins.
- Mots de passe (option) ; comptes cloisonnés par organisation (RLS) et par rôle.

---

## 6. Sauvegardes et restauration

- Sauvegardes gérées par Supabase (Point-in-Time Recovery / backups quotidiens
  selon le plan).
- **Dernier test de restauration effectué le : _______________ (à compléter).**
  À réaliser périodiquement (recommandé : trimestriel) et à consigner ici.

---

## 7. Checklist de mise en production RGPD

- [ ] Extension `pg_cron` activée sur Supabase
- [ ] Migration `25_rgpd-purges.sql` appliquée
- [ ] `rgpd_config.enforce = false` (dry-run) — vérifié
- [ ] Observation des volumes en dry-run pendant ~1 mois (`select * from evenements order by created_at desc`)
- [ ] Passage `enforce = true` planifié et validé
- [ ] OTP expiration ≤ 3600 s réglé dans Supabase
- [ ] Lien `/confidentialite` ajouté au template d'invitation Supabase
- [ ] Placeholders de la politique de confidentialité renseignés (adresse, email RGPD, prestataires SMS/paie)
- [ ] DPA Anthropic / Resend signés et inscrits au registre des sous-traitants
- [ ] Premier test de restauration de sauvegarde consigné (§6)
