# Recette Supabase — ce qui reste 🔍 NON VÉRIFIÉ

Audit QA forensic V2, chantier 5.

Ce document existe pour une raison précise : **la couverture de test du produit
s'arrête là où commence la base de données.** Tout ce qui est listé ici est
écrit, relu et compilé, mais **n'a jamais été exécuté contre un PostgreSQL**.
Aucun de ces points ne doit être annoncé comme validé avant d'avoir été rejoué
sur une instance de recette.

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
supabase/recette/01_controles.sql   → tableau de verdicts
```

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

## Scénarios à rejouer

### Migrations

| # | Contrôle | Attendu |
|---|---|---|
| M-1 | Appliquer `31_unicite-salles-surveillants.sql` sur une base **contenant déjà des doublons** | La création d'index ÉCHOUE ; dédoublonner d'abord. À traiter avant mise en production. |
| M-2 | Appliquer `32_integrite-salles-planning.sql` | `affectations.salle_id` créée, rapprochement effectué sur les noms normalisés. |
| M-3 | `select * from salles_non_rapprochees;` | Doit lister `AMP`, `C14`, `E32`, `F11`, `F12`. Non vide ⇒ INV-004 pas encore rétabli. |
| M-4 | Arbitrer les alias (« AMP » = « Grand Amphithéâtre » ?) puis rejouer M-3 | Vue vide. `salle_id` peut alors passer `not null` dans une migration ultérieure. |

### Intégrité référentielle (BUG-004)

| # | Contrôle | Attendu |
|---|---|---|
| I-1 | Supprimer une salle utilisée au planning | **Refus** applicatif nommant le nombre d'affectations. |
| I-2 | Même suppression via un appel direct au Server Action | Même refus — le garde n'est pas dans le formulaire. |
| I-3 | Supprimer une salle orpheline (B11) | Suppression acceptée, ligne de journal écrite. |
| I-4 | `delete from salles` en SQL sur une salle rattachée par `salle_id` | **Erreur de contrainte** (`on delete restrict`). |
| I-5 | Renommer une salle référencée au planning | Journal explicite « le planning référence encore l'ancien nom ». |

### Suppressions protégées et journal (BUG-003, BUG-023)

| # | Contrôle | Attendu |
|---|---|---|
| J-1 | Supprimer une mission portant 3 affectations, sans confirmer | Refus détaillant affectations / incidents / devis. |
| J-2 | Confirmer la suppression | Cascade effective, **et** ligne de journal écrite AVANT la suppression. |
| J-3 | Supprimer un surveillant planifié | Refus, avec proposition de désactivation. |
| J-4 | Modifier une mission 10 fois puis lire `journal_sessions` | 10 lignes, ancien et nouveau statut renseignés. |

### Doublons (BUG-012, BUG-013)

| # | Contrôle | Attendu |
|---|---|---|
| D-1 | Trois clics dans le même tick sur « Ajouter la salle » | **1 seule ligne** créée. Le verrou client est mesuré (1 POST) ; reste à vérifier qu'aucune ligne en double n'atteint la base. |
| D-2 | Deux requêtes concurrentes hors navigateur, même nom de salle | La seconde échoue sur `salles_org_nom_uniq`, message métier affiché. |
| D-3 | Même e-mail de surveillant, casse différente | Refus sur `surveillants_org_email_uniq`. |
| D-4 | Même téléphone, formats différents (`06 12 34 56 78` / `+33612345678`) | Refus sur `surveillants_org_tel_uniq`. |

### Validation de session (BUG-015)

| # | Contrôle | Attendu |
|---|---|---|
| V-1 | Valider une session à 10/14 depuis l'écran | Refus. **Vérifié au navigateur** — mais le garde client s'arrête sur les alertes de ligne avant d'atteindre la sous-couverture. |
| V-2 | Appeler `validerSession` **directement**, sans passer par l'écran | Refus par le moteur central. **C'est le contrôle qui compte** : un Server Action est un point d'entrée réseau. Non rejoué. |
| V-3 | Couper la base puis valider | « le planning n'a pas pu être relu » — jamais une validation sur données vides. |
| V-4 | Vérifier `journal_sessions` après un refus | Une ligne « Validation refusée » avec les motifs. |

### Transitions de statut (BUG-011)

| # | Contrôle | Attendu |
|---|---|---|
| T-1 | Les 11 statuts, via le formulaire | Seules les transitions légales sont proposées. **Vérifié au navigateur.** |
| T-2 | `updateMission` appelé directement avec « Terminée → Brouillon » | Refus serveur. Non rejoué. |

### RLS et multi-organisation

| # | Contrôle | Attendu |
|---|---|---|
| R-1 | Lire les salles d'une autre organisation | 0 ligne, jamais une erreur technique brute. |
| R-2 | Écrire dans une autre organisation | Refus RLS traduit en « vos droits ne permettent pas cette action ». |
| R-3 | Les index uniques de la migration 31 sont bien **par organisation** | Deux organisations peuvent avoir une salle « A21 ». |

### Import / export et volumétrie

| # | Contrôle | Attendu |
|---|---|---|
| P-1 | Import d'un fichier de 500 salles | Aucune ligne partiellement écrite en cas d'échec. |
| P-2 | Export puis réimport | Aller-retour sans perte ni doublon. |
| P-3 | Session à 2 000 affectations | Les écrans restent exploitables ; relever les temps de rendu. |

## Ce que ce document ne dit pas

Il ne liste que les contrôles **dépendant de la base**. Les corrections des
chantiers 1 à 4 portant sur des fonctions pures ou sur le rendu sont couvertes
par les 476 tests unitaires et les 69 tests end-to-end, verts.
