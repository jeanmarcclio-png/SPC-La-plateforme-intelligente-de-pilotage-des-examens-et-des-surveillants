# Recette Supabase — ce qui reste 🔍 NON VÉRIFIÉ

Audit QA forensic V2, chantier 5.

Ce document existe pour une raison précise : **la couverture de test du produit
s'arrête là où commence la base de données.** Aucun point listé ici ne doit être
annoncé comme validé avant d'avoir été rejoué sur une instance de recette.

**État au 12 août 2026** — l'instance `spc-recette` (région UE) existe, les
32 migrations sont appliquées et les contrôles SQL ont tourné. Ce qui est
vérifiable en SQL est désormais tranché ; ce qui passe par l'application reste
🔍 NON VÉRIFIÉ. Les résultats sont plus bas, avec leur statut ligne par ligne.

## Pourquoi cette limite existe

L'environnement de développement et la CI ne disposent d'aucune instance
Supabase. Les tests unitaires (476, verts) portent sur des **fonctions pures** :
moteur financier, view-models, validations, rapprochement référentiel. Les tests
end-to-end (69, verts) pilotent l'application réelle mais avec
`SPC_DEMO=1` — les lectures retournent un jeu en mémoire, **aucune écriture
n'atteint une base**.

Conséquence directe : contraintes, cascades, index uniques, RLS et journal ne
sont couverts par **aucun test exécuté**.

## Prérequis

1. Une instance Supabase de recette, **région UE** (RGPD) — `eu-central-1` ou
   `eu-west-3`, choisie à la création et non modifiable ensuite.
2. `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` renseignés.
3. Les **32 migrations** appliquées dans l'ordre, `supabase/migrations/`.
4. Le jeu de recette : `supabase/recette/00_jeu-audit.sql`. Il reproduit le
   relevé de l'audit — mission à 14 postes requis pour 10 pourvus, 2 créneaux
   sans salle, 5 salles fantômes, 1 orpheline, et le devis dont la grille et
   les heures facturées divergent de 28,97 h.

## Démarrage

Dans le SQL Editor de l'instance de recette, dans cet ordre :

```
supabase/recette/migrations-par-lots/lot-01.sql … lot-07.sql   (dans l'ordre)
supabase/recette/00_jeu-audit.sql
supabase/recette/01_controles.sql     → tableau de verdicts
supabase/recette/02_organisation.sql  → organisation + sondes d'unicité
```

`02_organisation.sql` n'est pas optionnel dès qu'on veut vérifier autre chose que
la forme du schéma. Deux mécanismes du produit ne s'activent que si `org_id` est
renseigné : les index d'unicité de la migration 31, qui sont partiels
(`where org_id is not null`), et **toutes** les policies RLS, qui passent par
`spc_member_of(org_id)` — c'est-à-dire `... and org_id = target`, jamais vrai
quand `org_id` est NULL. Sur une recette sans organisation, un utilisateur
authentifié lit zéro ligne : l'application paraît cassée alors que c'est le jeu
d'essai qui l'est.

Les migrations sont livrées **en 7 lots de ~18 Ko**, et non en un seul fichier :
le SQL Editor passe par l'API du dashboard, qui échoue sur un envoi de 108 Ko
avec `Failed to fetch (api.supabase.com)` — ce n'est pas une erreur SQL.

Chaque lot est **sûr à rejouer** : les politiques RLS sont précédées de leur
`drop policy if exists`, le reste est en `if not exists` / `or replace`. Un lot
interrompu se relance depuis son début.

En cas de doute sur ce qui a réellement été appliqué, jouer
`supabase/recette/00_ou-en-suis-je.sql` : requête de diagnostic courte, qui dit
lot par lot ce qui existe en base.

`01_controles.sql` couvre ce qui est vérifiable en SQL : présence de la clé
étrangère et de son `on delete restrict`, index d'unicité, doublons bloquants,
salles non rapprochées, et les chiffres de BUG-016 recalculés côté base. Les
scénarios qui passent par l'application (refus de suppression, transitions,
messages métier) se rejouent à l'écran — ils sont listés ci-dessous.

## Défauts trouvés PENDANT la recette

La recette a commencé et a déjà rapporté, avant même d'être terminée. Deux
migrations échouaient sur une base Opérations neuve — donc pour quiconque
rejouerait le schéma depuis zéro, pas seulement pour la recette.

| Migration | Défaut | Correction |
|---|---|---|
| `14_user-preferences.sql` | `alter table prospects …` : `prospects` appartient à la lignée COMMERCIALE (`supabase/commercial/schema.sql`) et n'existe pas sur une base Opérations. `add column if not exists` protège contre une colonne déjà là, **jamais contre une table absente** → `relation "prospects" does not exist`. Le commentaire de la ligne l'annonçait pourtant comme « optionnel ». | Encadré par `to_regclass('public.prospects')`. |
| `25_rgpd-purges.sql` | `create extension if not exists pg_cron;` puis `cron.schedule(…)` à nu. pg_cron n'est pas activé sur un projet Supabase neuf : toute la migration échouait. Le garde existant ne couvrait que le `unschedule`. | Extension et planification encadrées ; l'absence de pg_cron lève un `NOTICE` explicite au lieu de tout bloquer. La fonction `spc_purge_rgpd()` reste appelable à la main. |

Ces deux corrections sont **sans effet** là où `prospects` existe et où pg_cron
est activé : elles ne changent rien à la base de production.

## Résultats — passage du 12 août 2026, instance `spc-recette`

Les 32 migrations ont été appliquées, le jeu de recette posé, `01_controles.sql`
exécuté. **C'est la première fois que ce schéma existe sur un PostgreSQL réel.**

### Ce que le jeu de recette a produit

Requête de vérification de `00_jeu-audit.sql`, 9 lignes, conformes à l'attendu :

| salle_au_planning | affectations | etat |
|---|---|---|
| AMP · C14 · E32 · F11 · F12 | 1 chacune | FANTÔME — absente du référentiel |
| RECETTE A21 · A22 · E31 | 1 chacune | rattachée au référentiel |
| (sans salle) | 2 | sans salle |

Le rejeu du rapprochement `salle_id` après le seed (M-2b) fonctionne : sans lui,
les 8 salles seraient sorties en fantômes et M-3 aurait perdu tout sens.

### Ce que `01_controles.sql` a répondu

| Contrôle | Attendu | Observé | Statut |
|---|---|---|---|
| M-2 `affectations.salle_id` existe | colonne présente | `présente` | ✅ VALIDÉ |
| M-2b contrainte `on delete` | NO ACTION ou RESTRICT | `RESTRICT` | ✅ VALIDÉ — le garde de BUG-004 est réel en base, pas seulement applicatif |
| M-3 salles non rapprochées | 0 une fois les alias arbitrés | `5` | ⚠️ à arbitrer — attendu à ce stade |
| M-3b noms hors référentiel | liste à arbitrer | `AMP, C14, E32, F11, F12` | ✅ VALIDÉ — exactement le relevé de l'audit |
| V-1 couverture de la session | 10 / 14 → validation refusée | `10 / 14` | ✅ VALIDÉ (côté données) |
| I-1 affectations sans salle | 2 | `2` | ✅ VALIDÉ |
| I-3 salle orpheline disponible | au moins 1 | `2` | ✅ VALIDÉ — voir note ci-dessous |
| BUG-016 heures facturables (1 j) | 23,33 h | `23.33` | ✅ VALIDÉ — le SQL retrouve le chiffre du moteur TypeScript |
| BUG-016 heures facturées (équipe) | 262,30 h | `262.30` | ✅ VALIDÉ — écart de 28,97 h confirmé en base |
| BUG-016 effectifs | 6 / 10 / 4 | `6 / 10 / 4` | ✅ VALIDÉ |
| D-2 / D-3 / D-4 index d'unicité | présent | `présent` ×3 | ✅ VALIDÉ — et **sollicités** depuis le passage de `02_organisation.sql` |
| M-1 / M-1b doublons restants | 0 | `0` | 🔍 NON VÉRIFIÉ à la première mesure — voir ci-dessous |
| Sondes d'unicité (D-2, D-2b, D-3, D-4a, D-4b, R-3) | 6 refus/acceptations attendus | 4 conformes, **2 échecs** | Détail dans « Défauts du produit établis par la recette » |

`I-3 = 2` et non 1 : `RECETTE AMPHI` est structurellement orpheline elle aussi.
C'est voulu — c'est la fiche candidate à l'arbitrage « AMP ↔ AMPHI » (M-4). Une
seule des deux, `RECETTE B11`, est réellement à supprimer. L'en-tête du seed, qui
annonçait une orpheline unique, a été corrigé.

### Défaut trouvé dans les contrôles eux-mêmes

Les index de la migration 31 sont **partiels** : `where org_id is not null`. La
recette a été montée sans organisation, donc `org_id` est NULL partout.

| | |
|---|---|
| **Cause** | `M-1`/`M-1b` comptaient les doublons en filtrant `org_id is not null`, sans dire sur combien de fiches. |
| **Source** | `supabase/recette/01_controles.sql` — formulation d'origine du contrôle. |
| **Conséquence** | Sur ce jeu, la requête ne PEUT renvoyer que `0`, doublons ou pas. Quatre lignes affichaient un résultat rassurant qui ne prouvait rien : D-2/D-3/D-4 confirment que l'index *existe*, M-1/M-1b qu'aucun doublon n'existe *dans un périmètre vide*. |
| **Correction** | `M-1`/`M-1b` publient désormais les deux nombres (`n doublon(s) · n fiche(s) examinée(s)`), un contrôle `D-1b` publie le périmètre réel, et le verdict bascule en 🔍 NON VÉRIFIÉ dès que le périmètre est vide. |
| **Reste à faire** | Créer une organisation en recette et rattacher les données à son `org_id` : sans cela D-2, D-3, D-4 et R-3 restent 🔍 NON VÉRIFIÉ. |

### Ce qui reste hors de portée du SQL

Tout ce qui passe par l'application — refus de suppression, transitions de
statut, appels directs aux Server Actions, messages métier, RLS vue d'un
utilisateur — exige de pointer l'application sur cette instance
(`NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` de `spc-recette`). Ces scénarios restent
🔍 NON VÉRIFIÉ et sont marqués comme tels ci-dessous.

## Scénarios à rejouer

### Migrations

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| M-1 | Appliquer `31_unicite-salles-surveillants.sql` sur une base **contenant déjà des doublons** | La création d'index ÉCHOUE ; dédoublonner d'abord. À traiter avant mise en production. | 🔍 NON VÉRIFIÉ — périmètre vide (`org_id` NULL) |
| M-2 | Appliquer `32_integrite-salles-planning.sql` | `affectations.salle_id` créée, rapprochement effectué sur les noms normalisés. | ✅ VALIDÉ — colonne présente, `on delete RESTRICT` |
| M-2b | Le rapprochement `salle_id` est rejoué APRÈS le jeu de recette | La migration 32 rapproche au moment où elle passe, donc sur une table vide en recette. `00_jeu-audit.sql` rejoue la requête à la fin — sans quoi M-3 listerait les 8 salles au lieu des 5 fantômes. | ✅ VALIDÉ — 3 rattachées, 5 fantômes, 2 sans salle |
| M-3 | `select * from salles_non_rapprochees;` | Doit lister `AMP`, `C14`, `E32`, `F11`, `F12`. Non vide ⇒ INV-004 pas encore rétabli. | ✅ VALIDÉ — les 5 noms, exactement |
| M-4 | Arbitrer les alias (« AMP » = « Grand Amphithéâtre » ?) puis rejouer M-3 | Vue vide. `salle_id` peut alors passer `not null` dans une migration ultérieure. | 🔴 EN ATTENTE — décision humaine, non automatisable |
| M-5 | Appliquer `33_unicite-telephone-normalise.sql` (lot 7) | `select spc_tel_cle('+33 6 12 00 00 01'), spc_tel_cle('06 12 00 00 01');` → **deux fois `0612000001`**. Puis `select * from surveillants_tel_doublons;` → vide, et `surveillants_org_tel_cle_uniq` présent. Si la vue n'est pas vide, l'index n'est **pas** créé : c'est voulu, fusionner d'abord. | 🔍 NON VÉRIFIÉ |
| M-5b | Rejouer la sonde D-4b après M-5 | `02_organisation.sql` → `D-4b` doit passer de ❌ ACCEPTÉ à ✅ **refusé**. C'est le seul contrôle qui prouve la correction. | 🔍 NON VÉRIFIÉ |

### Intégrité référentielle (BUG-004)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| I-1 | Supprimer une salle utilisée au planning | **Refus** applicatif nommant le nombre d'affectations. | 🔍 NON VÉRIFIÉ — exige l'application branchée sur la recette |
| I-2 | Même suppression via un appel direct au Server Action | Même refus — le garde n'est pas dans le formulaire. | 🔍 NON VÉRIFIÉ |
| I-3 | Supprimer une salle orpheline (B11) | Suppression acceptée, ligne de journal écrite. | 🔍 NON VÉRIFIÉ — la salle orpheline existe bien (contrôle SQL ✅) |
| I-4 | `delete from salles` en SQL sur une salle rattachée par `salle_id` | **Erreur de contrainte** (`on delete restrict`). | ⚠️ PARTIELLEMENT VALIDÉ — la contrainte est en `RESTRICT` (M-2b), le refus lui-même n'a pas été provoqué |
| I-5 | Renommer une salle référencée au planning | Journal explicite « le planning référence encore l'ancien nom ». | 🔍 NON VÉRIFIÉ |

### Suppressions protégées et journal (BUG-003, BUG-023)

| # | Contrôle | Attendu |
|---|---|---|
| J-1 | Supprimer une mission portant 3 affectations, sans confirmer | Refus détaillant affectations / incidents / devis. |
| J-2 | Confirmer la suppression | Cascade effective, **et** ligne de journal écrite AVANT la suppression. |
| J-3 | Supprimer un surveillant planifié | Refus, avec proposition de désactivation. |
| J-4 | Modifier une mission 10 fois puis lire `journal_sessions` | 10 lignes, ancien et nouveau statut renseignés. |

### Doublons (BUG-012, BUG-013)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| D-1 | Trois clics dans le même tick sur « Ajouter la salle » | **1 seule ligne** créée. Le verrou client est mesuré (1 POST) ; reste à vérifier qu'aucune ligne en double n'atteint la base. | 🔍 NON VÉRIFIÉ — passe par le navigateur |
| D-1b | Périmètre couvert par les index partiels | Non vide | ✅ VALIDÉ — `11 salles · 26 surveillants` portent un `org_id`, les index partiels s'appliquent |
| D-2 | Deux requêtes concurrentes hors navigateur, même nom de salle | La seconde échoue sur `salles_org_nom_uniq`. | ✅ **VALIDÉ** — sonde `recette a21` contre `RECETTE A21`, même organisation : **refusée**. La normalisation de casse fonctionne. |
| D-2b | Même nom, **espacement interne** différent (`RECETTE  A21`) | — | ❌ **ÉCHEC** — **acceptée**. Voir « Défauts du produit établis par la recette » ci-dessous. |
| D-3 | Même e-mail de surveillant, casse différente | Refus sur `surveillants_org_email_uniq`. | ✅ **VALIDÉ** — `UN@Recette.SPC.Test` contre `un@recette.spc.test` : **refusée**. |
| D-4a | Même téléphone, **séparateurs** différents (`06 12 00 00 01`) | Refus sur `surveillants_org_tel_uniq`. | ✅ **VALIDÉ** — **refusée**. L'index compare bien les seuls chiffres. |
| D-4b | Même numéro, **forme internationale** (`+33 6 12 00 00 01`) | Refus. | ❌ **ÉCHEC** — **acceptée**. Voir ci-dessous. |
| R-3 | Le même nom de salle dans une autre organisation | Accepté. | ✅ **VALIDÉ** — l'unicité est bien **par organisation**, jamais globale. |

## Défauts du produit établis par la recette

Deux sondes ont été acceptées là où elles devaient être refusées. Ce ne sont pas
des défauts du jeu d'essai : ce sont des trous d'unicité du schéma, exécutés et
observés sur PostgreSQL.

### D-4b — un même numéro de téléphone passe deux fois

| | |
|---|---|
| **Cause** | `31_unicite-salles-surveillants.sql:28` — `regexp_replace(telephone, '\D', '', 'g')` ne retire que les caractères non numériques. |
| **Source** | `+33 6 12 00 00 01` donne la clé `33612000001` ; `0612000001` donne `0612000001`. **Deux clés pour un seul numéro.** L'index ne peut pas les rapprocher. |
| **Preuve** | Sonde D-4b insérée puis acceptée par la base, sur la même organisation que la fiche existante. |
| **Modules impactés** | Référentiel surveillants, planification, couverture de session, paie, purge RGPD. Deux fiches pour une même personne : elle peut être affectée deux fois au même créneau, comptée deux fois dans la couverture, payée deux fois — et l'anonymisation RGPD n'en traiterait qu'une. |
| **Risque de régression** | Corriger l'index suppose de normaliser les numéros existants **et** d'arbitrer l'indicatif retenu. Sur une base contenant déjà les deux formes du même numéro, la création de l'index échouera tant que les doublons ne sont pas fusionnés — c'est le scénario M-1. |
| **Correction** | `33_unicite-telephone-normalise.sql` + `lib/operations/telephone.ts`. **Indicatif retenu : +33**, écrit aux deux mêmes endroits. La migration ne fusionne rien : elle expose la vue `surveillants_tel_doublons` (qui fusionner, avec les affectations et heures de chaque fiche pour arbitrer) et **ne crée l'index que si plus aucun doublon ne subsiste** — sinon elle s'abstient et le dit par un `NOTICE`, plutôt que de faire tomber la migration. L'ancien index n'est retiré qu'après le succès du nouveau. |
| **Statut** | ⚠️ **CORRIGÉ, NON REJOUÉ** — 7 tests unitaires verts sur la normalisation TypeScript ; la migration elle-même n'a pas encore été appliquée sur `spc-recette`, et la sonde D-4b n'a pas été rejouée. Ne pas annoncer résolu avant. |

### D-2b — la base est plus permissive que l'application sur les noms de salles

| | |
|---|---|
| **Cause** | L'index normalise par `lower(btrim(nom))` : `btrim` ne retire que les espaces **de bord**. |
| **Source** | `normaliserNomSalle()` (`lib/operations/referentiel-salles.ts`) retire, elle, **tous** les caractères non alphanumériques. `RECETTE  A21` et `RECETTE A21` sont un doublon pour l'application, deux fiches distinctes pour la base. |
| **Preuve** | Sonde D-2b insérée puis acceptée. |
| **Modules impactés** | Référentiel salles et rapprochement salles ↔ planning. L'écran signale le doublon, la base l'accepte : deux fiches pour une même salle, avec des capacités, PMR et tiers-temps potentiellement divergents. |
| **Risque de régression** | Aligner l'index sur `normaliserNomSalle` rendrait l'unicité plus stricte — donc susceptible d'échouer sur des données existantes légitimement distinctes. À traiter avec le même soin que M-1. |
| **Statut** | ❌ ÉCHEC — non corrigé, pour la même raison. |

### Validation de session (BUG-015)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| V-1 | Valider une session à 10/14 depuis l'écran | Refus. **Vérifié au navigateur** — mais le garde client s'arrête sur les alertes de ligne avant d'atteindre la sous-couverture. | ⚠️ PARTIELLEMENT VALIDÉ — la sous-dotation `10 / 14` est confirmée en base ; le refus n'a pas été rejoué sur cette instance |
| V-2 | Appeler `validerSession` **directement**, sans passer par l'écran | Refus par le moteur central. **C'est le contrôle qui compte** : un Server Action est un point d'entrée réseau. | 🔍 NON VÉRIFIÉ |
| V-3 | Couper la base puis valider | « le planning n'a pas pu être relu » — jamais une validation sur données vides. | 🔍 NON VÉRIFIÉ |
| V-4 | Vérifier `journal_sessions` après un refus | Une ligne « Validation refusée » avec les motifs. | 🔍 NON VÉRIFIÉ |

### Transitions de statut (BUG-011)

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| T-1 | Les 11 statuts, via le formulaire | Seules les transitions légales sont proposées. | ✅ VALIDÉ au navigateur (hors base) |
| T-2 | `updateMission` appelé directement avec « Terminée → Brouillon » | Refus serveur. | 🔍 NON VÉRIFIÉ |

### RLS et multi-organisation

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| R-1 | Lire les salles d'une autre organisation | 0 ligne, jamais une erreur technique brute. | 🔍 NON VÉRIFIÉ — exige deux organisations et deux comptes |
| R-2 | Écrire dans une autre organisation | Refus RLS traduit en « vos droits ne permettent pas cette action ». | 🔍 NON VÉRIFIÉ |
| R-3 | Les index uniques de la migration 31 sont bien **par organisation** | Deux organisations peuvent avoir une salle « A21 ». | 🔍 NON VÉRIFIÉ |

### Import / export et volumétrie

| # | Contrôle | Attendu | Statut |
|---|---|---|---|
| P-1 | Import d'un fichier de 500 salles | Aucune ligne partiellement écrite en cas d'échec. | 🔍 NON VÉRIFIÉ |
| P-2 | Export puis réimport | Aller-retour sans perte ni doublon. | 🔍 NON VÉRIFIÉ |
| P-3 | Session à 2 000 affectations | Les écrans restent exploitables ; relever les temps de rendu. | 🔍 NON VÉRIFIÉ |

## Ce que ce document ne dit pas

Il ne liste que les contrôles **dépendant de la base**. Les corrections des
chantiers 1 à 4 portant sur des fonctions pures ou sur le rendu sont couvertes
par les 476 tests unitaires et les 69 tests end-to-end, verts.
