# Mise en service — de l'instance vide au premier écran utilisable

Procédure complète, dans l'ordre. Compter **une heure à deux**, l'essentiel étant
de l'attente (création du projet Supabase, déploiement Vercel).

Deux décisions sont **irréversibles** et arrivent tôt : la **région** du projet
Supabase, et le **mot de passe** de la base. Elles sont signalées 🔒.

---

## 1. Créer le projet Supabase en région UE

### 1.1 Le compte et l'organisation

1. [supabase.com](https://supabase.com) → **Start your project** / **Sign in**
   (connexion par GitHub ou par courriel).
2. À la première connexion, Supabase demande de créer une **organisation** —
   c'est le conteneur de facturation, distinct des « organisations » internes du
   produit SPC. Nommez-la d'après l'entité qui paie (`SPC`).
3. **Le plan.** Le plan gratuit convient pour essayer, **pas pour exploiter** :
   un projet gratuit est **mis en pause après 7 jours sans activité**, et il faut
   le réveiller à la main. Pour une instance qui porte de vraies sessions
   d'examens, prendre le plan **Pro** dès le départ évite une mise en pause au
   pire moment. Le plan se change plus tard ; la région, non.

### 1.2 Le formulaire de création

**New project**, puis, dans l'ordre :

| Champ | Valeur | Pourquoi |
|---|---|---|
| **Organization** | celle créée ci-dessus | — |
| **Project name** | `spc-production` | apparaît dans l'URL du tableau de bord |
| **Database Password** | mot de passe long, **immédiatement copié dans un gestionnaire** | 🔒 Supabase ne le réaffiche jamais. Il est réinitialisable, mais toute URL de connexion enregistrée ailleurs devient alors fausse. Le bouton **Generate a password** en produit un correct. |
| **Region** | 🔒 voir ci-dessous | **non modifiable après création** |

### 1.3 La région — le point irréversible

Le sélecteur **Region** liste les régions par continent. Choisir dans *Europe* :

| Région | Code | Verdict |
|---|---|---|
| **Central EU (Frankfurt)** | `eu-central-1` | ✅ recommandé — la plus courante, la mieux desservie |
| **West EU (Paris)** | `eu-west-3` | ✅ recommandé — latence la plus faible depuis l'Île-de-France |
| North EU (Ireland) | `eu-west-1` | ✅ acceptable |
| **West EU (London)** | `eu-west-2` | ⚠️ **à éviter** — le Royaume-Uni n'est plus dans l'Union européenne. Le transfert reste possible sous décision d'adéquation, mais cela ajoute une justification à tenir dans votre registre RGPD. Sans intérêt ici. |
| Toute région hors Europe | — | ❌ |

Pourquoi c'est sérieux : la base contiendra des **données personnelles** —
noms, courriels et téléphones de surveillants, et surtout des **aménagements de
tiers-temps**, qui touchent à la santé et relèvent des données sensibles au sens
du RGPD. Un projet créé hors UE ne se déplace pas : il faut le recréer et
rejouer toute la mise en service.

En cas de doute entre Francfort et Paris : **Francfort**.

### 1.4 Attendre, puis VÉRIFIER

La création prend 2 à 3 minutes. Ne pas passer à l'étape 2 avant d'avoir
confirmé la région — c'est le dernier moment où se tromper coûte cinq minutes
plutôt qu'une demi-journée.

**Project Settings → General** : la ligne *Region* doit afficher votre choix.

Second contrôle, indépendant du libellé affiché — le nom d'hôte porte la région :

```bash
# Doit contenir « eu-central-1 » (Francfort) ou « eu-west-3 » (Paris)
psql "$URL" -tAc "select inet_server_addr();"   # après l'étape 2
```

Plus simple encore : dans la chaîne de connexion du pooler, l'hôte s'écrit
`aws-0-eu-central-1.pooler.supabase.com`. Si vous y lisez `us-east-1`, le projet
est en Virginie — **le supprimer et le recréer maintenant**, avant d'y mettre la
moindre donnée.

> Les libellés du tableau de bord Supabase évoluent. Si l'un d'eux ne correspond
> plus exactement, l'invariant reste : un champ **Region**, à régler sur une
> région d'Europe continentale, et à vérifier après création.

---

## 2. Récupérer l'URL de connexion

**Project Settings → Database → Connection string → onglet URI.**

Prendre la connexion **directe (port 5432)**, pas le pooler : le pooler en mode
transaction refuse certaines instructions `alter table`, et la mise en place
échouerait en cours de route.

Remplacer `[YOUR-PASSWORD]` par le mot de passe de l'étape 1.

```bash
export URL="postgresql://postgres:VOTRE_MDP@db.xxxxxxxx.supabase.co:5432/postgres"
```

> Si la connexion est refusée : **Settings → Database → Network Restrictions**.
> Par défaut Supabase autorise tout ; si des restrictions ont été posées, il faut
> y ajouter votre adresse IP.

---

## 3. Appliquer le schéma

```bash
cd spc-cockpit
./supabase/mise-en-place/mise-en-place.sh --url "$URL"
```

Le script applique les 34 migrations, dans l'ordre. **Il ne supprime rien** — il
peut être relancé sans risque, y compris sur une instance déjà en service, ce qui
en fait aussi la commande de mise à jour du schéma.

Il refuse de tourner si `auth.uid()` est absent, c'est-à-dire si la cible n'est
pas une instance Supabase : sur un PostgreSQL nu, les policies RLS seraient
inertes et la base aurait l'air correcte **sans protéger quoi que ce soit**.

Attendu en fin de course :

```
 tables | policies | organisations | membres | comptes
--------+----------+---------------+---------+---------
     24 |       73 |             2 |       0 |       0
```

Les **2 organisations** sont des organisations de démonstration créées par la
migration 11. C'est normal à ce stade ; l'étape 5 s'en occupe.

---

## 4. Créer le premier compte

**Authentication → Users → Add user → Create new user.**

| Champ | Valeur |
|---|---|
| Email | l'adresse professionnelle de l'administrateur |
| Password | un mot de passe provisoire, à changer à la première connexion |
| **Auto Confirm User** | ✅ **à cocher** |

Sans « Auto Confirm User », Supabase attend la validation d'un courriel de
confirmation. Tant qu'elle n'a pas eu lieu, la connexion est refusée — avec un
message qui ressemble à un mot de passe erroné.

---

## 5. Créer l'organisation réelle et rattacher le compte

```bash
psql "$URL" \
  -v org="Nom de votre établissement" \
  -v email="administrateur@votre-etablissement.fr" \
  -f supabase/mise-en-place/01_organisation-reelle.sql
```

### Pourquoi cette étape n'est pas un confort

C'est **le** point où une mise en service se rate silencieusement.

La migration 28 pose une valeur par défaut sur `org_id` de chaque table métier,
en choisissant « la vraie organisation » parmi celles qui existent alors. Sur une
instance neuve, il n'y a que les deux organisations de démonstration : **le défaut
pointe donc sur une organisation de démo.**

Sans cette étape, ce qui se produit :

- vous créez une salle → elle part dans l'organisation de démo ;
- vous rechargez la page → la salle n'apparaît pas, parce que vous n'êtes pas
  membre de cette organisation et que la RLS la masque ;
- rien n'indique d'erreur, ni à l'écran ni dans les journaux.

Le script repointe les défauts, rattache les lignes orphelines, et inscrit votre
compte comme **administrateur** de l'organisation réelle.

### Lire le constat

La commande se termine par un tableau. Les trois lignes qui comptent :

| Ligne | Ce qu'elle doit dire |
|---|---|
| `organisation par défaut de salles.org_id` | **le nom de votre organisation** — s'il reste une organisation de démo, rien de ce que vous saisirez ne sera visible |
| `administrateur rattaché` | votre adresse suivie de `— administrateur` |
| `lignes sans organisation` | `0` |

---

## 6. Retirer le jeu de démonstration

**Une instance neuve n'est pas vide.** Les migrations sèment un jeu de
démonstration complet, rattaché aux organisations de démo :

| | |
|---|---|
| 5 salles | « Salle A21 », « Grand Amphithéâtre »… |
| 5 missions · 3 devis · 2 factures | références fictives |
| 8 surveillants | fiches nominatives fictives |
| 8 affectations · 7 créneaux · 4 aménagements · 1 incident | — |

Ces lignes sont **invisibles pour votre administrateur** — la RLS les masque,
puisqu'il n'est pas membre de ces organisations. Elles ne peuvent donc pas être
supprimées depuis l'application, mais elles occupent la base et sortiront dans
tout export.

```bash
# 1. Voir ce qui serait supprimé — ne supprime rien
psql "$URL" -f supabase/mise-en-place/02_menage-demonstration.sql

# 2. Supprimer pour de bon
psql "$URL" -v confirme=oui -f supabase/mise-en-place/02_menage-demonstration.sql
```

Le script refuse d'agir si une organisation de démonstration a un membre, ou si
de vraies données pointent vers ce jeu — dans les deux cas, « démo » ne suffit
plus à décider que les lignes sont jetables.

> **Alternative** : pour garder les 5 salles comme point de départ le temps de la
> prise en main, la commande de récupération est en bas de
> `01_organisation-reelle.sql`. Ce sont des salles fictives : à ne pas laisser en
> exploitation.

Attendu après suppression :

```
 APRÈS | organisations de démonstration restantes | (aucune)
 APRÈS | organisations en service                 | Votre établissement — 1 membre(s)
 APRÈS | lignes métier restantes                  | 0 salle(s) · 0 mission(s) · 0 surveillant(s)
```

---

## 7. Renseigner les variables d'environnement

**Project Settings → API** fournit les deux premières valeurs.

Dans Vercel, projet **`spc-cockpit`** → Settings → Environment Variables :

| Variable | Où la trouver | Portée |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon` `public` | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` `secret` | Production **uniquement** |

⚠️ La clé `service_role` **contourne la RLS**. Elle ne doit jamais être préfixée
`NEXT_PUBLIC_`, ni exposée côté navigateur. Elle n'est requise que pour inviter
des comptes surveillant.

La clé `anon` est publique par conception : la sécurité repose sur les policies
RLS, pas sur son secret.

Facultatif, selon les fonctions voulues : `ANTHROPIC_API_KEY` (aide à la
décision), `RESEND_API_KEY` (courriels), `VAPID_*` (notifications), `CRON_SECRET`.

Laisser `SPC_ENFORCE_ROLES=0` pour commencer : en mode transition, tout compte
authentifié est autorisé. Ne passer à `1` qu'une fois les rôles attribués, sous
peine de vous verrouiller dehors.

**Redéployer** après avoir ajouté les variables — Vercel ne les applique pas
rétroactivement à un déploiement existant.

---

## 8. Vérifier

1. Ouvrir l'application, se connecter avec le compte de l'étape 4.
2. Aller dans **Opérations → Salles**, créer une salle.
3. **Recharger la page.** La salle doit toujours être là.

Ce troisième point est le vrai test : il prouve que l'écriture a atteint la base
*et* que la RLS vous la redonne. C'est exactement ce que la recette automatisée
vérifie à chaque pull request (`supabase/recette/locale/recette-applicative.sh`).

---

## Si les écrans sont vides

Depuis la correction du repli mock, l'application **n'invente plus de données**
quand la base est absente ou muette : elle affiche un état vide ou une erreur.
Un écran vide est donc une information, pas un bug. Dans l'ordre de probabilité :

| Symptôme | Cause | Vérification |
|---|---|---|
| Tout est vide, aucune erreur | le compte n'est membre d'aucune organisation | `select * from organization_members;` doit contenir votre `user_id` |
| Ce que vous créez disparaît | le défaut `org_id` pointe sur une organisation de démo | rejouer l'étape 5 et lire la ligne `DÉFAUT` du constat |
| Connexion refusée, mot de passe pourtant bon | compte non confirmé | Authentication → Users : la colonne de confirmation doit être renseignée |
| Erreur de connexion à la base | variables absentes ou déploiement antérieur à leur ajout | redéployer après avoir ajouté les variables |

Pour une démonstration **sans base**, `SPC_DEMO=1` sert exactement à cela — et
l'écran indique alors clairement qu'il est en mode démonstration.
