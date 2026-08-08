---
projet: SPC
campagne: audit-qa-forensic-v2
agent: audit-saas
date: 2026-08-08
version: "1.0"
statut: validé
---

# AUDIT QA FORENSIC V2 — SPC COCKPIT (spc-cockpit)

Périmètre audité : application Next.js `spc-cockpit` (module Opérations + module
commercial), branche `claude/new-session-02clb5`, commit de base `ff9e87c`.

---

# SYNTHÈSE EXÉCUTIVE

| | |
|---|---|
| **Score global** | **49 / 100** — *prototype fragile / SaaS en consolidation* |
| **Taux de confiance de l'audit** | **45 %** |
| **Verdict** | 🔴 **NO-GO production** |
| Tests exécutés | **73** (33 routes crawlées, 13 recalculs indépendants, 7 scénarios d'interaction pilotés, 20 contrôles de code/schéma) |
| ✅ Validé | 21 |
| ❌ Échec | 25 |
| ⚠️ Partiellement validé | 9 |
| 🔍 Non vérifié | 18 |

## Ce qui est solide

Le **moteur financier** (`lib/operations/engine/financial-engine.ts`) est de
qualité professionnelle : durées en minutes entières, montants en centimes
entiers, **un seul point d'arrondi**, TVA calculée une seule fois sur le total
HT. Les 383 tests unitaires passent, le build, le typecheck et le lint sont
propres. Les 33 routes répondent 200 (404 correct sur route inexistante), sans
aucune erreur JavaScript ni fuite de `undefined` / `NaN` / `null` à l'écran.
L'invariant TTC = HT + TVA est vérifié sur les 5 devis. Le total d'heures
66,25 h est reproductible à la minute près.

## Ce qui bloque la mise en production

Le produit **ne se comporte pas comme un système métier unique**. Trois défauts
structurels le démontrent, chacun prouvé :

1. **Le SaaS fabrique des données opérationnelles.** Quand il n'y a rien à
   afficher (ou en cas d'erreur base), le cockpit et les 11 requêtes de lecture
   retombent sur des jeux de démonstration **sans le signaler** : 10 surveillants
   fictifs nommés, avec salles et horaires, 92 % de couverture, 12 544,40 € de CA.
2. **Quatre pages donnent quatre réponses à « combien de surveillants manquent ? »**
   14/10/manque 4 sur Dashboard, Cockpit, Planification et Missions ; 19/16/manque 3
   sur la page Salles ; et la page Salles se contredit elle-même (KPI « manque 3 »
   contre un tableau qui affiche −1/−2/−1 = 4).
3. **Le référentiel Salles et le planning ne partagent aucune clé.** 5 des
   8 salles du planning (C14, AMP, F11, F12, E32) n'existent pas dans le
   référentiel. Supprimer une salle ne change rien au planning.

---

# 1. MÉTHODE ET LIMITES DE L'AUDIT

## Ce qui a réellement été exécuté

L'application a été **construite et lancée** (`next build` + `next start`,
port 3999, `SPC_E2E=1`) et **pilotée dans Chromium** via Playwright.

| Moyen | Volume | Artefact |
|---|---|---|
| Crawl de routes (statut HTTP, erreurs console, texte rendu, capture) | 33 routes | `audit-artifacts/crawl.json`, `text_*.txt`, `shot_*.png` |
| Scénarios d'interaction pilotés | 7 | `audit-artifacts/evidence.txt` |
| Recalculs indépendants des chiffres affichés | 13 assertions | `spc-cockpit/__tests__/zz-audit-invariants.test.ts` |
| Suite de tests existante | 383 tests / 32 fichiers | `npm test` |
| Lecture de code et de schéma | 30 migrations SQL, 17 Server Actions, 25 modules `lib/operations` | — |

## Limite structurelle — à lire avant toute conclusion

**Aucune instance Supabase n'était disponible.** L'application a donc tourné sur
son chemin de lecture de repli (données de démonstration), et **le chemin
d'écriture n'était pas fonctionnel**.

Conséquence directe, et elle est importante :

- ✅ **Réellement testés** : lecture, calculs, rendu, navigation, cohérence
  inter-pages, filtres, invariants sur les données affichées, formulaires côté client.
- 🔍 **NON VÉRIFIÉS à l'exécution** : persistance (créer → sauvegarder → relire →
  actualiser), suppression en cascade réelle, import/export aller-retour, doublons
  réellement créés en base, rollback métier, stress multi-objets, non-régression
  après correction.

Tout ce qui relève de la persistance est donc audité **par lecture de code et de
schéma uniquement**, et signalé 🔍 **NON VÉRIFIÉ** ou « cause établie, effet non
observé ». C'est ce plafond qui limite le taux de confiance à **45 %** — pas une
appréciation défavorable du produit.

---

# 2. CARTOGRAPHIE FONCTIONNELLE

## 2.1 Routes (33 crawlées, 33 en HTTP 200 ou 404 attendu)

**Module Opérations** — `/operations` (dashboard), `/operations/cockpit`,
`/operations/missions`, `/operations/planification` (+ `/planning`, `/copilote`),
`/operations/surveillants`, `/operations/salles`, `/operations/devis` (+ `/[id]`),
`/operations/facturation`, `/operations/presence`, `/operations/incidents`,
`/operations/pmr`, `/operations/rapports`, `/operations/risques`,
`/operations/supervision`, `/operations/demandes-client`.

**Module commercial** — `/dashboard`, `/cockpit`, `/planning`, `/qualification`,
`/reporting`, `/livrables`, `/campagnes`, `/parametres`.

**Portail & divers** — `/moi`, `/onboarding`, `/login`, `/confidentialite`, `/offline`.

## 2.2 Matrice des modules

| Module | Fonction principale | Données produites | Données consommées | Dépendances |
|---|---|---|---|---|
| `engine/financial-engine` | Calcul HT/TVA/TTC, heures facturables | Montants, durées | Salles, taux, coefficient | *(aucune)* — **socle** |
| `engine/planning-validation` | Validation salles / session / conflits | Anomalies typées | Salles, affectations | financial-engine |
| `dashboard.ts` | Agrégat du tableau de bord | KPI, risques, actions, sessions | missions, affectations, devis, incidents | rentabilite, alertes, stats |
| `cockpit.ts` | Vue cockpit temps réel | KPI, frise, alertes | missions, affectations, surveillants | couverture |
| `planification-vue.ts` | Vue des 3 pages de planification | Lignes, alertes, santé, suggestions | missions, affectations, surveillants | couverture, rentabilite, sante-session, planning-validation |
| `salles-view.ts` | Vue du centre des capacités | KPI salles, alertes, niveaux | **salles uniquement** | couverture |
| `missions-dashboard.ts` | Vue du centre de pilotage missions | KPI, alertes, progression | missions, affectations, devis, incidents | mission-status |
| `queries.ts` | Accès Supabase + **repli mock** | Toutes les entités | Supabase | mock.ts |

## 2.3 Sources de vérité — classement

| Donnée | Source | Classement |
|---|---|---|
| Montants HT/TVA/TTC | `financial-engine` | ✅ **source unique claire** |
| Durées / heures planifiées | `planification-vue.minutesAffectation` | ✅ **source unique claire** |
| Statuts de mission | `mission-status.TRANSITIONS` | ❌ **source ambiguë** — matrice contournée par le formulaire |
| Couverture surveillants | `couverture.analyseCouverture` | ❌ **duplication dangereuse** — 2 périmètres d'entrée concurrents |
| Marge | `rentabilite.analyseRentabilite` | ❌ **duplication dangereuse** — 2 jeux d'entrées, 2 résultats |
| Notion de « surcharge » | *aucune* | ❌ **duplication dangereuse** — 3 définitions |
| Identité d'une salle | *aucune* | ❌ **duplication dangereuse** — texte libre côté planning, table côté référentiel |
| Nombre de candidats | *inexistante* | ❌ **absente du modèle** |

---

# 3. MATRICE DE TRAÇABILITÉ QA (extrait — tests exécutés)

| Test | Fonction | Action | Attendu | Observé | Preuve | Statut |
|---|---|---|---|---|---|---|
| QA-CRAWL-001 | Chargement des 33 routes | GET | 200, aucune erreur JS | 32×200 + 1×404 attendu, 0 `pageerror` | `crawl.json` | ✅ |
| QA-CRAWL-002 | Fuite de valeurs brutes | Scan `undefined`/`NaN`/`null`/`[object Object]` | aucune | aucune sur 33 pages | `crawl.json` | ✅ |
| QA-CRAWL-003 | Route inexistante | GET `/route-inexistante-xyz` | 404 propre | 404, page « 404 » | `text_route_inexistante_xyz.txt` | ✅ |
| QA-FILTRE-001 | Filtres du planning | Clic sur 5 filtres | badge = lignes | 2/2, 9/9, 6/6, 3/3, 5/5 | `evidence.txt` | ✅ |
| QA-HEURES-001 | Total d'heures session | Somme minutes | 66,25 h | 3 975 min = 66,25 h | test invariants | ✅ |
| QA-TVA-001 | INV-005 TTC = HT+TVA | 5 devis | TTC = HT×1,20 | conforme ×5 | test invariants | ✅ |
| QA-STATUT-001 | Transitions de statut | Modifier une mission « Terminée » | Facturée, Archivée | **11 statuts dont « Brouillon »** | `evidence.txt` | ❌ |
| QA-DBLCLICK-001 | Double soumission | 3 clics rapides sur « Créer la mission » | 1 POST | **3 POST**, bouton non désactivé | `evidence.txt` | ❌ |
| QA-FORM-001 | Valeurs limites | Saisie −5 / 0 | rejet | rejet **navigateur** (0 POST) ; aucun garde serveur | `evidence.txt` | ⚠️ |
| QA-CROISE-001 | Couverture inter-pages | Relevé sur 5 pages | valeur unique | **14/10/4 vs 19/16/3** | `text_*.txt` | ❌ |
| QA-SALLE-001 | Référentiel vs planning | Comparaison des noms | correspondance | **5 salles fantômes** | test invariants | ❌ |
| QA-SALLE-002 | KPI manque vs tableau | Somme par salle | 3 = 3 | **KPI 3 vs tableau 4** | test invariants | ❌ |
| QA-MARGE-001 | Marge session vs société | Recalcul | cohérent ou libellé distinct | **69 % vs 30 %**, même mot | test invariants | ❌ |
| QA-DEVIS-001 | Grille salles vs heures facturées | Recalcul moteur | égalité | **233,33 h vs 262,3 h** | test invariants | ❌ |
| QA-DEVIS-002 | Effectif du devis 4 | Relevé 3 emplacements | valeur unique | **6 / 10 / 4** | test invariants | ❌ |
| QA-TEMPS-001 | Session « en cours » datée | Comparaison à `now` | garde temporelle | **session J−9 affichée en direct** | test invariants | ❌ |
| QA-PERSIST-* | Créer → relire → actualiser | — | — | — | *pas de base* | 🔍 |
| QA-IMPORT-* / QA-EXPORT-* | Aller-retour CSV/Excel | — | — | — | *pas de base* | 🔍 |
| QA-CASCADE-* | Suppression en cascade réelle | — | — | — | *pas de base* | 🔍 |

---

# 4. RAPPORTS DE BUG

## BUG-001 — Le cockpit fabrique une session fictive

**Priorité :** P1 — CRITIQUE · 🔴 BLOQUANT
**Module :** Cockpit opérationnel
**Fonction :** `buildCockpitView` / rendu de `/operations/cockpit`
**Scénario QA :** QA-DEMO-001
**Préconditions :** aucune mission « En cours / Validée / Planifiée », **ou** aucune
affectation sur la mission active, **ou** exception lors de la récupération.

**Étapes :**
1. ouvrir `/operations/cockpit` dans une organisation sans mission active ;
2. observer les KPI, le tableau des surveillants et les alertes.

**Attendu :** un état vide explicite (« aucune session active »).
**Observé :** un cockpit complet et crédible, entièrement inventé — 10 surveillants
nommés (Marie Laroche, Fatma Benali, Amir Marc CLIO…) avec salles et horaires,
« 92 % de couverture », « 83 / 90 postes », « score IA 8,6 », « 10 / 176 salles »,
5 alertes horodatées.

**Preuve :** `lib/operations/cockpit.ts:122` (constante `DEMO_COCKPIT`),
`lib/operations/cockpit.ts:193` — `if (!active || actifs.length === 0) return DEMO_COCKPIT;`,
et `app/(ops-cockpit)/operations/cockpit/page.tsx:132` — `let view = DEMO_COCKPIT;`
(valeur initiale conservée si la récupération lève).
Le modèle porte un drapeau `demo: boolean` — **jamais lu par l'interface**
(`grep` : aucune occurrence de `.demo` dans `app/` ou `components/`).

**Reproductibilité :** systématique (déterministe, dépend uniquement des données).
**Impact :** un coordinateur peut piloter une journée d'examens sur des effectifs,
des salles et des alertes qui n'existent pas. Dans un métier de surveillance
d'examens, c'est le pire mode de défaillance possible : silencieux et crédible.
**Modules impactés :** cockpit, alertes, supervision live.
**Cause probable :** repli de démonstration introduit pour la preview visuelle,
jamais conditionné à un mode démo explicite.
**Correction recommandée :** conditionner `DEMO_COCKPIT` à
`process.env.SPC_DEMO === "1"` ; sinon rendre un état vide. Si le repli est
conservé, afficher un bandeau permanent « Données de démonstration ».
**Risque de régression :** faible — l'état vide doit être testé (§33).

---

## BUG-002 — Le repli mock masque les tables vides ET les erreurs

**Priorité :** P1 — CRITIQUE
**Module :** Accès aux données (`lib/operations/queries.ts`)
**Scénario QA :** QA-DEMO-002

**Étapes :**
1. une organisation dont les tables sont vides (ou dont la RLS refuse la lecture)
   ouvre `/operations` ;
2. observer le dashboard.

**Attendu :** état vide, ou message d'erreur exploitable.
**Observé :** 15 surveillants, 15 missions, 5 devis et un CA de 12 544,40 € — tous
fictifs, sans aucun signal.

**Preuve :** les **11 fonctions** de `lib/operations/queries.ts` appliquent le même
motif — `if (error || !data?.length) return mock…` (lignes 9, 36, 59, 108, 139,
160, 180, 197, 219, 238, 262, 285). Le `catch` retourne également le mock.
La condition confond trois situations distinctes : **erreur**, **table vide**,
**droits insuffisants**.

**Reproductibilité :** systématique.
**Impact :**
- l'état vide (§33) est **structurellement inatteignable en production** ;
- supprimer la dernière mission d'une organisation fait *réapparaître* 15 missions
  de démonstration — indiscernable d'un échec de suppression ;
- une erreur RLS est indiscernable de données réelles.
**Modules impactés :** tous les écrans Opérations.
**Correction recommandée :** dissocier les trois cas — erreur → `{error}` remonté à
l'UI ; tableau vide → état vide ; repli mock uniquement sous `SPC_DEMO=1`.
**Risque de régression :** moyen — impose de traiter les états vides sur ~15 écrans.

---

## BUG-003 — Suppression en cascade silencieuse d'un surveillant planifié

**Priorité :** P1 — CRITIQUE (perte de données)
**Module :** Surveillants / Missions
**Scénario QA :** QA-CASCADE-001 — 🔍 cause établie par le schéma, effet non observé (pas de base)

**Étapes :**
1. ouvrir `/operations/surveillants` ;
2. supprimer un surveillant déjà affecté à une session planifiée ;
3. ouvrir `/operations/planification/planning`.

**Attendu (prompt §19) :** le système gère les dépendances — refus, ou avertissement
chiffré (« ce surveillant porte 3 affectations »), ou anonymisation.
**Observé (code + schéma) :** `deleteSurveillant` exécute un `delete().eq("id", id)`
nu — **aucun contrôle de dépendance, aucun décompte, aucune écriture au journal**.
Le schéma porte `surveillant_id integer references surveillants(id) **on delete
cascade**` (`supabase/migrations/01_operations-base.sql:38`) : **toutes les
affectations du surveillant sont détruites en base, sans trace**.

**Preuve :** `app/actions/surveillants.ts` (`deleteSurveillant`) ;
`supabase/migrations/01_operations-base.sql:37-38`.
Même situation pour `deleteMission` (`app/actions/missions.ts`) : cascade sur
`affectations` et `journal_sessions`, sans journalisation.

**Impact :** perte de planning irréversible sur un simple clic, sans confirmation
chiffrée ni piste d'audit. 🔴 **P1 — RISQUE DE PERTE DE DONNÉES** (§14).
**Modules impactés :** planification, cockpit, présence, rapports, facturation.
**Correction recommandée :** avant suppression, compter les dépendances et les
présenter ; proposer la **désactivation** (statut « Indisponible ») comme action par
défaut ; journaliser systématiquement les suppressions.
**Risque de régression :** faible.

---

## BUG-004 — Le référentiel Salles et le planning ne partagent aucune clé

**Priorité :** P1 — CRITIQUE (intégrité référentielle)
**Module :** Salles / Planification
**Scénario QA :** QA-SALLE-001

**Attendu (INV-004) :** une salle supprimée ne doit plus apparaître dans le planning.
**Observé :** l'invariant est **inapplicable par construction**.

**Preuve (recalcul indépendant, test `INV-SALLE`) :**
```
référentiel (table salles) : A21, A22, E31, Grand Amphithéâtre, B11
salles du planning         : A21, C14, E31, AMP, A22, F11, F12, E32
salles fantômes            : C14, AMP, F11, F12, E32   ← 5 salles inexistantes
salle orpheline            : B11 (référencée, utilisée par aucune affectation)
```
`affectations.salle` est une **colonne texte libre**, sans clé étrangère vers
`salles`. La table `salles` ne porte **ni `mission_id` ni `session_id`**
(`supabase/migrations/04_salles.sql`) : c'est un référentiel global, sans lien
avec la session. « AMP » et « Grand Amphithéâtre » désignent vraisemblablement la
même salle sous deux identités.

**Impact :** supprimer, renommer ou recapacité une salle n'a **aucun effet** sur le
planning, le cockpit ou la présence. Le contrôle du prompt §18 (« somme candidats
dans les salles = total candidats mission ») est impossible.
**Correction recommandée :** introduire `affectations.salle_id → salles(id)`
(`on delete restrict`) et rattacher les salles à une session.
**Risque de régression :** élevé — migration de données requise.

---

## BUG-005 — Quatre pages, deux réponses à « combien de surveillants ? »

**Priorité :** P1 — CRITIQUE (cohérence inter-pages)
**Module :** transverse
**Scénario QA :** QA-CROISE-001

**Preuve — relevé sur les pages réellement rendues :**

| Page | Requis | Pourvus / affectés | Manque | Source du calcul |
|---|---|---|---|---|
| `/operations` (dashboard) | 14 | 10 | **4** | `mission.nbSurveillants` vs affectations |
| `/operations/cockpit` | 14 | 10 | **4** | idem |
| `/operations/planification` | 14 | 10 | **4** | idem |
| `/operations/missions` | 14 | 10 | **4** | idem |
| **`/operations/salles`** | **19** | **16** | **3** | **`Σ ceil(étudiants/30)` vs `Σ salles.nb_surveillants`** |

**Cause :** `construireVueSalles(salles: Salle[])` (`lib/operations/salles-view.ts:259`)
ne reçoit **ni mission, ni session, ni affectation**. Elle réinvente la couverture
à partir du seul référentiel de salles et de la constante
`RATIO_ETUDIANTS_PAR_SURVEILLANT = 30`.

**Impact :** un responsable qui ouvre la page Salles conclut qu'il manque
3 surveillants ; toutes les autres pages en annoncent 4. Aucun écran n'explique
l'écart.
**Correction recommandée :** la page Salles doit consommer la couverture de la
session (source unique) et ne présenter son ratio théorique que comme une
**estimation explicitement libellée**, jamais comme un « manque ».

---

## BUG-006 — Le KPI « manque » de la page Salles contredit son propre tableau

**Priorité :** P2 — MAJEUR
**Module :** Salles
**Scénario QA :** QA-SALLE-002

**Observé :** le bandeau KPI affiche « **manque 3** » ; le tableau de la même page
affiche, salle par salle, `2 (−1)`, `8 (−2)`, `2 (−1)` — soit **4 postes à pourvoir**.

**Preuve (test `BUG — le « manque » global des Salles (3) contredit la somme par salle (4)`) :**
`construireVueSalles` calcule le KPI par
`analyseCouverture({ requis: Σrequis, affectes: Σaffectés })`
(`salles-view.ts:271`), c'est-à-dire `19 − 16 = 3`, tandis que le tableau applique
`Math.max(0, requis − affectés)` **par salle** (`salles-view.ts:145`).
Le surplus de la salle E31 (2 surveillants pour 1 requis) **compense silencieusement**
le déficit de A21 et A22.

**Impact :** sous-estimation du besoin de recrutement. Un surveillant affecté en
E31 ne peut pas couvrir A21 : la compensation est arithmétique, pas opérationnelle.
**Correction recommandée :** le KPI doit sommer les manques par salle
(`Σ max(0, requis − affectés)`), jamais la différence des totaux.

---

## BUG-007 — Le « −56,2 % » n'est pas la variation du CA affiché

**Priorité :** P2 — MAJEUR (bug silencieux)
**Module :** Dashboard
**Scénario QA :** QA-FIN-001

**Observé :** la tuile affiche
`CA CONFIRMÉ HT · 12 544,40 € · −56,2 % vs mois précédent`.

**Preuve :** les deux nombres proviennent de **séries différentes**
(`lib/operations/dashboard.ts:196-244`) :
- `caConfirmeHT` = somme des **devis acceptés** (12 544,40 €), sans notion de mois ;
- `variationCA` = variation mensuelle du **CA réalisé des missions**
  (juillet 13 986,40 € → août 6 125,00 € = **−56,2 %**, recalculé et confirmé).

Second défaut superposé : la comparaison oppose un **mois partiel** (1–8 août) à un
**mois complet** (juillet). Elle est donc structurellement négative en début de mois.

**Impact :** un décideur lit « notre CA confirmé chute de 56 % » — affirmation que
la donnée ne porte pas.
**Correction recommandée :** afficher la variation de la série effectivement
mesurée, et comparer à période équivalente (J1–J8 vs J1–J8).

---

## BUG-008 — « Charge critique / surcharge détectée » pour un surveillant sans salle

**Priorité :** P2 — MAJEUR (alerte factuellement fausse)
**Module :** Cockpit
**Scénario QA :** QA-ALERTE-001

**Observé sur `/operations/cockpit` :**
> CRITIQUE — Charge critique — Jean-Pierre Moreau
> *Surcharge détectée — seuil de surcharge dépassé*
> CRITIQUE — Charge critique — Léa Fontaine

**Preuve :** `lib/operations/cockpit.ts:229` —
`else if (sansSalle) { statut = "Charge critique"; statutClass = "cr"; }`
puis ligne 246, un libellé **codé en dur** : `"Surcharge détectée — seuil de
surcharge dépassé"`.
Or les deux surveillants concernés portent **61 h** et **38 h**, alors que le seuil
de surcharge du produit est de **100 h** (`SEUIL_SURCHARGE_H`). Le seul surveillant
réellement en surcharge — **Fatima Benali, 108 h**, signalée « Surcharge » sur le
dashboard — n'apparaît dans aucune alerte du cockpit.

Le **même fait** (affectation sans salle) reçoit **trois libellés contradictoires** :

| Écran | Libellé |
|---|---|
| Dashboard | « 2 **conflits** détectés » |
| Cockpit | « Charge critique — **surcharge** détectée » |
| Planification | « Jean-Pierre Moreau : **aucune salle affectée** » ← le seul exact |

**Impact :** le cockpit envoie le coordinateur traiter une surcharge inexistante et
tait la vraie ; le détail affiche en outre « Salle — » (valeur vide).
**Correction recommandée :** libellé unique « Aucune salle affectée », dérivé de
`planification-vue` ; réserver « surcharge » au dépassement de `SEUIL_SURCHARGE_H`.

---

## BUG-009 — Trois seuils concurrents pour le mot « surcharge »

**Priorité :** P2 — MAJEUR (§9 doublon fonctionnel)

| Définition | Valeur | Emplacement | Écran |
|---|---|---|---|
| Heures cumulées du surveillant | **≥ 100 h** | `constants.ts` `SEUIL_SURCHARGE_H` | Dashboard — charge |
| Heures d'une journée | **> 9 h** | `planification-vue.ts` `SEUIL_CHARGE_JOUR_H` | Planification — alertes |
| Absence de salle | *(sans seuil)* | `cockpit.ts:229` | Cockpit — alertes |

**Impact :** Thomas Girard (9,50 h) est « Disponibilité insuffisante » en
Planification, « Conforme » au Cockpit, et absent des surcharges du Dashboard.
**Décision :** **À CENTRALISER** — une seule notion, un seul seuil paramétrable.

---

## BUG-010 — Deux moteurs de marge sous le même mot

**Priorité :** P2 — MAJEUR
**Scénario QA :** QA-MARGE-001

| Écran | Valeur affichée | Formule (recalculée et confirmée) |
|---|---|---|
| `/operations/planification` | « Marge estimée **69 %** » — 2 792,00 € sur 4 042,00 € | heures **réellement planifiées** × taux horaire **de chaque** surveillant, périmètre **session** |
| `/operations` | « MARGE HT **30 %** » — 3 791,52 € | heures de **l'équipe chiffrée du devis** × taux horaire **moyen de tout l'effectif**, périmètre **société** |

**Preuve :** test `MARGE — deux moteurs concurrents pour le même mot` ;
`dashboard.ts:209-218` (taux moyen sur `surveillants.length`) vs
`planification-vue` → `rentabilite.analyseRentabilite` alimenté par les heures réelles.

**Impact :** 69 % et 30 % pour la même entreprise le même jour, sans libellé de
périmètre. Le taux moyen du dashboard mélange en outre des surveillants qui ne
travaillent pas sur les devis concernés.
**Décision :** **À CENTRALISER** + libellés explicites (« marge session » /
« marge portefeuille »).

---

## BUG-011 — Le formulaire d'édition ignore la matrice de transitions

**Priorité :** P2 — MAJEUR (§25 transition métier incohérente)
**Scénario QA :** QA-STATUT-001 — **prouvé en pilotage réel**

**Étapes :**
1. ouvrir `/operations/missions` ;
2. cliquer « Modifier » sur la mission `EX-2026-043` (ICP Reims, statut **Terminée**) ;
3. ouvrir le sélecteur « statut ».

**Attendu :** `Terminée → Facturée | Archivée` (matrice `TRANSITIONS`).
**Observé (preuve `evidence.txt`, QA-STATUT-001) :**
```
Statut courant du select : Terminée
Options proposées (11) : Brouillon | À chiffrer | Devis envoyé | Acceptée |
Planifiée | Validée | En cours | Terminée | Facturée | Archivée | Annulée
```
Une mission terminée peut être ramenée à **« Brouillon »** — exactement le cas
interdit cité au §25 du référentiel.

**Cause :** deux contrôles concurrents sur le même champ —
`MissionForm.tsx:76` utilise `MISSION_STATUTS` (liste complète), tandis que
`MissionActionsMenu.tsx:45` utilise `allowedTransitions(mission.statut)` (matrice).
Le Server Action `updateMission` n'effectue **aucun contrôle de transition**.

**Aggravant :** le test end-to-end existant
(`tests/e2e/operations.spec.ts` — « le formulaire d'édition propose les 11 statuts »)
**verrouille le comportement fautif** par `expect(options).toHaveCount(11)`.
Une correction fera échouer ce test : il devra être repris en même temps.

**Correction recommandée :** `MissionForm` → `statutOptions(statutCourant)` ;
`updateMission` → refuser toute transition hors matrice.

---

## BUG-012 — Le double clic déclenche autant de soumissions que de clics

**Priorité :** P2 — MAJEUR
**Scénario QA :** QA-DBLCLICK-001 — **prouvé en pilotage réel**

**Preuve (`evidence.txt`) :**
```
Requêtes POST déclenchées par 3 clics rapides : 3
  POST http://localhost:3999/operations/missions
  POST http://localhost:3999/operations/missions
  POST http://localhost:3999/operations/missions
Bouton désactivé pendant traitement : false
```
Le garde `disabled={pending}` existe (`MissionForm.tsx:101`) mais `pending`
(`useTransition`) ne bascule qu'au rendu suivant : trois clics dans le même tick
passent tous.

**Atténuation partielle :** `missions.reference` et `devis.reference` sont
`unique not null` → les doublons sont bloqués **en base**… au prix d'un message
d'erreur PostgreSQL brut renvoyé à l'utilisateur (voir BUG-024).

**Non atténué :** `salles` et `surveillants` **ne portent aucune contrainte
d'unicité** (vérifié sur les 30 migrations). Le même enchaînement y produit de
**vrais doublons**. 🔍 Effet non observé faute de base — cause établie.

**Correction recommandée :** verrouiller le formulaire par un état local
synchrone (`useRef` posé avant l'appel) ; ajouter des index uniques métier sur
`salles(org_id, nom)` et `surveillants(org_id, email)`.

---

## BUG-013 — Deux politiques anti-doublon pour la même entité

**Priorité :** P2 — MAJEUR (§10)

L'**import CSV** (`importSurveillants`) déduplique correctement : normalisation
NFD sans accents, casse ignorée, e-mail, téléphone réduit aux chiffres, et
protection contre les doublons internes au fichier. Cela couvre les variantes
demandées au §10 (`Jean Dupont` / `JEAN DUPONT` / `jean dupont`).

La **création manuelle** (`createSurveillant`) n'effectue **aucun contrôle** :
seule la présence d'un nom est exigée. Saisir deux fois « Jean Dupont » crée deux
fiches.

**Décision :** **À CENTRALISER** — extraire la détection de doublon de
`importSurveillants` et l'appliquer aux deux points d'entrée.
*Non traité* : `Jean-Dupont` et `Jean  Dupont` (double espace) ne sont pas
normalisés — même l'import les considérerait comme distincts.

---

## BUG-014 — Le cockpit affiche une session passée comme « en direct »

**Priorité :** P2 — MAJEUR
**Scénario QA :** QA-TEMPS-001

**Observé le 8 août 2026 à 13:48 sur `/operations/cockpit` :**
> ICP Paris — 2026-07-30 · **PRISES DE POSTE À VENIR : 2** — *dans les 2 prochaines heures*
> FRISE HORAIRE — VUE DU JOUR · curseur « 13:48 » · MATIN 08:00–14:00 « En cours »

La session est datée du **30 juillet**, soit **9 jours plus tôt**.

**Preuve :** `buildCockpitView` ne compare **jamais** `active.dateMission` à `now`
(`lib/operations/cockpit.ts:180-302`). Les « prises de poste » comparent l'heure
murale du jour aux horaires de créneaux (ligne 208-215), et `nowPct` place un
curseur « maintenant » sur une frise (ligne 278), quelle que soit la date.

**Impact :** l'écran de pilotage temps réel présente comme « en cours » une session
close, avec des prises de poste imminentes fictives.
**Correction recommandée :** si `dateMission !== aujourd'hui`, masquer le curseur
temps réel et les « prises de poste », et afficher l'état réel (« session du
30 juillet — clôturée » / « à venir dans N jours »).

---

## BUG-015 — Le moteur central de validation de session n'est jamais appelé

**Priorité :** P2 — MAJEUR (Master Prompt : moteur central = source unique)

**Preuve :** `validateSessionForApproval` (`engine/planning-validation.ts:117`)
n'a **aucun appelant applicatif** — les seules occurrences du dépôt sont sa
définition et deux fichiers de tests. Même constat pour
`calculateSessionBillableHours`, `calculateMissionBillableHours`,
`calculatePeriodBillableHours`, `calculateFinancialEstimate`, `validateRooms`
et `validateFinancialInput` : **testés, jamais branchés**.

Le commentaire de `app/actions/missions.ts:67-68` — « les contrôles bloquants sont
exécutés côté client via le moteur central » — **est inexact**.

Ce qui existe réellement (`SessionEnTete.tsx:80-84`) est un garde client
**parallèle**, et **plus faible** :
```
if (etat.nbLignes === 0)     → bloque
if (etat.nbModifiees > 0)    → bloque
if (etat.nbAlertes > 0)      → bloque
```
La **sous-couverture n'y figure pas**. Une session à **10/14 (71 %)** peut donc
être validée dès que les alertes de ligne sont corrigées, alors que
`validateSessionForApproval` la refuserait (`ROOM_UNDERSTAFFED`).

Enfin, le Server Action `validerSession` n'effectue **aucun contrôle** : le garde
est purement côté client, et les Server Actions sont des points d'entrée réseau.

**Correction recommandée :** brancher `validateSessionForApproval` et le
rappeler **côté serveur** dans `validerSession`.

---

## BUG-016 — Le devis ne réconcilie pas sa grille de salles avec ses heures facturées

**Priorité :** P2 — MAJEUR (§15 audit des calculs)
**Scénario QA :** QA-DEVIS-001

**Devis SPC-20260728-001 (ICP Reims), recalcul indépendant via le moteur du produit :**

| | Valeur |
|---|---|
| Heures facturables recalculées depuis la grille (`calculateRoomBillableHours`) | **23,33 h / jour** |
| × 10 « jours retenus » affichés sur le devis | **233,33 h** |
| Heures effectivement facturées (affichées et facturées) | **262,30 h** |
| **Écart** | **28,97 h ≈ 811 € HT** |

**Cause :** les heures facturées proviennent de `devis_equipe.heuresPers` — une
**saisie manuelle** (5 × 23,64 h + 5 × 28,82 h) — et non de l'application du moteur
à la grille de salles. Les deux blocs sont affichés l'un sous l'autre sur la même
page, sans lien de calcul ni note de réconciliation.

**Second constat, même devis — trois effectifs pour la même prestation :**

| Emplacement | Effectif |
|---|---|
| Colonne « surv. » de la liste des devis | **6** |
| Bloc « ÉQUIPE & VOLUME HORAIRE » | **10** |
| Total de la grille « salles — session du matin » | **4** |

**Impact :** le document contractuel envoyé au client porte des chiffres qui ne se
recoupent pas. Un client qui additionne la grille n'obtient pas le total facturé.
**Correction recommandée :** dériver les heures de la grille via le moteur ;
si une saisie manuelle reste permise, afficher explicitement l'écart.
*Nuance de bonne foi :* la grille est probablement un gabarit d'une journée type
(les désignations mentionnent 74 créneaux sur 10 jours), mais la page ne le dit
nulle part — c'est précisément ce qui rend l'écart indétectable.

---

## BUG-017 à BUG-025 — Anomalies P3

| ID | Module | Constat | Preuve |
|---|---|---|---|
| **BUG-017** | Dashboard | Le graphique « **ÉVOLUTION SUR 7 JOURS** » porte les libellés `14/04 · 20/05 · 18/06 · 03/07 · 10/07 · 16/07 · 30/07` — soit **3,5 mois**. `buildCoverage.trend` retourne les **7 dernières sessions datées**, pas 7 jours. | `text_operations.txt` ; `dashboard.ts:261-270` |
| **BUG-018** | Dashboard | Le tableau « PROCHAINES SESSIONS », sous une colonne **DATE**, affiche `30 juil · 12 août · 24 août · 01 août · 01 août · 31 juil`. `buildSessions` concatène active + à venir + passées sans tri final. | `text_operations.txt` ; `dashboard.ts:458-462` |
| **BUG-019** | Cockpit | Date au format ISO brut — « ICP Paris — **2026-07-30** » — alors que tous les autres écrans affichent « 30 juillet 2026 ». | `cockpit.ts:283` |
| **BUG-020** | Cockpit | « **CONFIRMATIONS 100 % · 10 / 10 confirmés** » alors que 4 des 14 postes ne sont pas pourvus : le dénominateur est le nombre d'affectations, pas de postes requis. | `cockpit.ts:203-205` |
| **BUG-021** | Cockpit / Missions | « **8 / 6 salles** » affiché sans anomalie ; la page Missions présente « Salles **8/6** — terminé » et l'intègre à un avancement de **93 %**. Un ratio > 100 % compte comme objectif atteint. | `text_operations_cockpit.txt`, `text_operations_missions.txt` |
| **BUG-022** | Formulaires | La validation numérique est **exclusivement côté client** : `min="1"` bloque bien la saisie (vérifié — **0 POST** avec −5). Mais `parseForm` applique `Number(x) \|\| repli` : `0 → 1` (salles, surveillants), saisie non numérique → `0 €` ou `18 €/h`, négatifs acceptés. Les Server Actions étant des points d'entrée réseau, aucun garde ne subsiste hors navigateur. | `evidence.txt` QA-FORM-001 ; `missions.ts:16-28`, `salles.ts:16-25`, `surveillants.ts:31-32` |
| **BUG-023** | Journal | Seul `validerSession` écrit au journal. `updateMission`, `deleteMission`, `deleteSurveillant`, `deleteSalle`, `createSalle`… ne laissent **aucune trace**. Le contrôle §43 (« modifier 10 fois, contrôler l'historique ») ne remonterait rien. | `app/actions/*.ts` |
| **BUG-024** | Erreurs | Les messages base sont exposés bruts : `Création échouée : ${error.message}` → texte PostgreSQL (violation d'unicité, violation de clé étrangère). Ne répond pas aux trois questions du §39. | `missions.ts:41`, et 16 autres Server Actions |
| **BUG-025** | Transverse | Cinq décomptes d'alertes pour le même état : Dashboard **4 tuiles de risque** · Cockpit **2** · Planification **5** · Missions **9** · Salles **3**. Chaque écran compte une population différente sans le dire. | `text_*.txt` |

---

# 5. MATRICE DES INVARIANTS

| ID | Règle | Test | Résultat | Statut |
|---|---|---|---|---|
| INV-001 | Candidats mission = Σ candidats des salles | Inspection du modèle | **Le modèle `Mission` ne porte aucun compteur de candidats** (`nbSalles`, `nbSurveillants`, `montantHT`, mais aucun candidat) | ❌ **invérifiable — lacune de modèle** |
| INV-002 | Un surveillant ne peut être sur deux missions simultanées | `detectSupervisorConflicts` + `conflitsSession` | Moteur correct (chevauchement par `sessionId = date+période`), et branché dans `planification-vue` | ✅ |
| INV-003 | Une mission annulée ne reste pas active au cockpit | `buildCockpitView` filtre `En cours / Validée / Planifiée` | « Annulée » exclue ✅ — **mais aucune garde de date** : une session passée reste « en direct » (BUG-014) | ⚠️ |
| INV-004 | Une salle supprimée ne doit plus apparaître au planning | Comparaison référentiel / planning | **5 salles du planning n'existent pas au référentiel** ; aucune clé partagée | ❌ |
| INV-005 | TTC = HT + TVA | Recalcul sur les 5 devis | Conforme au centime sur 5/5 | ✅ |
| INV-006 | Heures = Σ minutes exactes, une seule conversion | Recalcul indépendant | 3 975 min = **66,25 h**, identique à l'affichage | ✅ |
| INV-007 | Σ manques par salle = manque global | Page Salles | **4 ≠ 3** | ❌ |
| INV-008 | Un chiffre = une définition sur toutes les pages | Relevé croisé | Couverture, marge, surcharge, alertes : définitions multiples | ❌ |
| INV-009 | Salles affectées ≤ salles déclarées | Cockpit | **8 / 6** sans anomalie | ❌ |
| INV-010 | Statut : seules les transitions de la matrice | Pilotage réel | **11 statuts proposés depuis « Terminée »** | ❌ |

---

# 6. MATRICE INTER-PAGES (objet : mission active ICP Paris — EX-2026-041)

| Donnée | Dashboard | Cockpit | Planification | Missions | Salles | Cohérente |
|---|---|---|---|---|---|---|
| Client | ICP Paris | ICP Paris | ICP Paris | ICP Paris | — | ✅ |
| Date | 30 juillet 2026 | **2026-07-30** *(ISO brut)* | 30 juillet 2026 | 30 juillet 2026 | — | ⚠️ format |
| Couverture | 71 % — 10/14 | 71 % — 10/14 | 71 % — 10/14 | 71 % — 10/14 | **manque 3 sur 19** | ❌ |
| Postes manquants | 4 | 4 *(non affiché)* | 4 | 4 | **3** | ❌ |
| Salles | 6 | **8 / 6** | **8** | **8/6** | **5 configurées** | ❌ |
| Heures | — | — | 66,25 h | 66h15 | — | ✅ |
| Montant HT | — | — | 4 042,00 € | 4 042,00 € | — | ✅ |
| Marge | **30 %** *(société)* | — | **69 %** *(session)* | — | — | ❌ |
| Alertes | 4 tuiles | 2 | 5 | 9 | 3 | ❌ |
| Score de santé | — | **5,9 / 10** « À surveiller » | **54 / 100** « À risque » | 93 % « préparé » | — | ❌ |

**Trois scores de santé, trois échelles, trois verdicts pour la même session.**

---

# 7. MATRICE DES DOUBLONS

| Élément | Localisation A | Localisation B | Type | Impact | Décision |
|---|---|---|---|---|---|
| Calcul de couverture | `couverture.analyseCouverture` via mission | `salles-view.ts:271` via référentiel | Fonctionnel | Chiffres contradictoires | **À CENTRALISER** |
| Calcul de marge | `dashboard.ts:209` (taux moyen) | `planification-vue` (taux réels) | Fonctionnel | 30 % vs 69 % | **À CENTRALISER** |
| Notion de surcharge | `SEUIL_SURCHARGE_H`=100 · `SEUIL_CHARGE_JOUR_H`=9 | `cockpit.ts:229` (sans salle) | Fonctionnel | Alertes fausses | **À CENTRALISER** |
| Contrôle du statut | `MissionForm` (11 statuts) | `MissionActionsMenu` (matrice) | Fonctionnel | Transitions illégales | **À FUSIONNER** |
| Validation de session | `validateSessionForApproval` *(non branché)* | `SessionEnTete.valider()` | Fonctionnel | Garde plus faible que le moteur | **À FUSIONNER** |
| Anti-doublon surveillant | `importSurveillants` (complet) | `createSurveillant` (absent) | Fonctionnel | Doublons manuels | **À CENTRALISER** |
| Identité de salle | `salles.nom` | `affectations.salle` (texte libre) | Donnée | Salles fantômes | **À FUSIONNER** |
| « AMP » / « Grand Amphithéâtre » | Planning | Référentiel | Donnée | Même salle, deux identités | **À FUSIONNER** |
| Jeux de démonstration | `mock.ts` (11 requêtes) | `DEMO_COCKPIT` (cockpit) | Donnée | Données fabriquées | **À SUPPRIMER** hors mode démo |
| Mission active (sélection) | `dashboard.missionActive` | `cockpit.buildCockpitView` (inline) | Fonctionnel | Logique dupliquée, aujourd'hui alignée | **À FUSIONNER** *(préventif)* |
| KPI couverture | Dashboard, Cockpit, Planification, Missions | — | Information | **Répétition contextuelle utile** | **CONSERVER** |
| CA confirmé | Tuile KPI + bloc « Performance financière » | — | Information | **Répétition contextuelle utile** | **CONSERVER** |

---

# 8. AUDIT UX / UI (évalué séparément de la robustesse — §64)

**Points forts.** Design institutionnel homogène et crédible ; hiérarchie
typographique cohérente ; navigation latérale stable ; boutons d'action nommés
accessibles (`aria-label` présents sur les actions en icône, vérifié par sélecteur
de rôle) ; états `loading.tsx` et `error.tsx` présents sur 7 routes ; `prefers-reduced-motion`
respecté ; en-têtes de sécurité et CSP configurés.

**Anomalies, classées selon la grille §32 :**

| Type | Constat |
|---|---|
| **BUG** | Graphique « 7 jours » couvrant 3,5 mois (BUG-017) |
| **BUG** | Tableau sous colonne DATE non trié par date (BUG-018) |
| **UX** | « CONFIRMATIONS 100 % » rassurant alors que 4 postes manquent (BUG-020) |
| **UX** | « 8 / 6 salles » présenté comme un objectif atteint (BUG-021) |
| **UX** | Erreurs base brutes exposées à l'utilisateur (BUG-024) |
| **UI** | Date ISO brute au cockpit, formatée ailleurs (BUG-019) |
| **UI** | Détail d'alerte « Salle — » (valeur vide affichée telle quelle) |
| **OPTIMISATION** | Cinq décomptes d'alertes concurrents à unifier (BUG-025) |

🔍 **Non vérifié :** responsive réel sur mobile, contrastes mesurés (WCAG AA),
parcours clavier complet, lecteur d'écran. L'audit s'est tenu à une seule
résolution de bureau.

---

# 9. TABLEAU DE SYNTHÈSE DES ANOMALIES

| Niveau | Nombre |
|---|---|
| **P0 — Bloquant (produit inutilisable)** | **0** |
| **P1 — Critique (perte, corruption, calcul faux)** | **5** |
| **P2 — Majeur (fonction incorrecte, contournement possible)** | **11** |
| **P3 — Mineur** | **9** |
| **P4 — Optimisation** | **3** |

Aucun P0 : le produit se charge, navigue et calcule. Les P1 relèvent tous de la
**véracité** de l'information affichée, pas de la disponibilité.

---

# 10. SCORE QA

| Axe | Note | Justification |
|---|---|---|
| **Fonctionnel** | **12 / 20** | Tous les écrans répondent et calculent ; mais le moteur de validation de session n'est pas branché et la matrice de statuts est contournable. |
| **Cohérence inter-pages** | **6 / 20** | Axe le plus dégradé : deux réponses à la couverture, deux marges, trois scores de santé, cinq décomptes d'alertes, salles fantômes. |
| **Intégrité et persistance** | **6 / 15** | Moteur financier exemplaire ; mais cascades silencieuses, journal quasi absent, repli mock masquant erreurs et tables vides. *Note partiellement provisoire (pas de base).* |
| **Workflow métier** | **7 / 15** | Cycle de vie à 11 statuts bien pensé mais non appliqué ; pas de modèle de candidats ; garde de validation plus faible que le moteur. |
| **Robustesse / stress** | **5 / 10** | 33 routes stables, aucune erreur JS, 404 correct. *Scénarios destructifs et stress non exécutables — note provisoire.* |
| **UX / UI** | **7 / 10** | Rendu premium et homogène, mais plusieurs KPI mal libellés ou trompeurs. |
| **Architecture fonctionnelle** | **2,5 / 5** | Excellente séparation en fonctions pures ; mais le moteur central est partiellement débranché et dupliqué. |
| **Qualité de production** | **3,5 / 5** | Build, typecheck, lint et 383 tests au vert ; CSP, RLS, migrations versionnées. Pénalisé par un test e2e qui verrouille un comportement fautif. |

# SCORE GLOBAL : 49 / 100

**Interprétation (§70) : < 60 → prototype fragile.**

Cette note demande une lecture nuancée. Le produit n'est pas « mal fait » : ses
fondations de calcul sont de qualité supérieure à la moyenne du marché. Ce qui
l'écrase, c'est que **plusieurs modules ont été développés comme des îlots
autonomes** qui recalculent chacun leur vérité. La note est basse parce que
l'audit mesure le **système**, pas les pages prises isolément — et c'est la
question posée par la directive finale du référentiel.

Environ **8 points** de la note sont par ailleurs plafonnés par l'impossibilité de
tester la persistance : un audit refait sur une instance Supabase réelle pourrait
faire remonter la note sans aucune correction de code — ou révéler des défauts
supplémentaires.

> ## TAUX DE CONFIANCE DE L'AUDIT : 45 %

Lecture, calculs, rendu, navigation et cohérence inter-pages sont couverts avec un
niveau de preuve élevé (~85 %). Persistance, CRUD, import/export, cascades réelles,
stress et non-régression sont couverts à ~5 % (lecture de code seule).

---

# 11. CHECKLIST DE COUVERTURE

- [x] pages testées — 33 routes crawlées, statut + console + texte + capture
- [x] navigation testée — menu, liens profonds, route inexistante (404)
- [x] formulaires testés — mission (valeurs limites, double soumission, statuts)
- [ ] CRUD testé — **impossible sans base** 🔍
- [x] boutons testés — actions nommées, filtres, soumission
- [x] filtres testés — 5 filtres du planning, badges vs lignes réelles
- [x] tableaux testés — contenu, cohérence, tri (défaut trouvé)
- [ ] persistance testée — **impossible sans base** 🔍
- [~] doublons testés — *fonctionnels et d'information : oui ; de données : code seul* 🔍
- [x] calculs testés — 13 recalculs indépendants
- [~] dates testées — *cohérence et format : oui ; changement après planification : non* 🔍
- [x] horaires testés — chevauchements, fin < début, matin/après-midi
- [x] conflits testés — moteur de détection audité et recalculé
- [ ] imports testés — **impossible sans base** 🔍
- [ ] exports testés — **impossible sans base** 🔍
- [ ] suppression cascade testée — *schéma audité, exécution non observée* 🔍
- [x] propagation inter-pages testée — matrice inter-pages complète
- [~] Golden Path testé — *parcours parcouru en lecture ; sans écriture, non bouclé* 🔍
- [ ] audit destructif effectué — **impossible sans base** 🔍
- [ ] stress métier effectué — **impossible sans base** 🔍
- [ ] non-régression effectuée — *sans correction appliquée, sans objet*

**11 cases sur 21 réellement cochées.** Aucune case n'a été cochée sans exécution.

---

# 12. DÉCISION DE MISE EN PRODUCTION

# 🔴 NO-GO

**Motifs, dans l'ordre :**

1. **Le produit peut afficher des données opérationnelles fabriquées sans le
   signaler** (BUG-001, BUG-002). Pour un SaaS de surveillance d'examens, dont la
   valeur est la fiabilité du dispositif humain le jour J, c'est rédhibitoire.
2. **Le système n'a pas une seule vérité sur son indicateur le plus critique** —
   le nombre de surveillants manquants (BUG-005, BUG-006). Quatre pages, deux
   réponses, et une page qui se contredit elle-même.
3. **L'intégrité référentielle des salles n'existe pas** (BUG-004) : 5 des 8 salles
   du planning ne sont dans aucun référentiel.
4. **Les gardes métier ne sont pas appliqués** : matrice de statuts contournable
   (BUG-011, prouvé), moteur de validation de session non branché (BUG-015),
   validations numériques côté client uniquement (BUG-022).
5. **La persistance n'a pas pu être vérifiée du tout.** Aucun verdict GO ne peut
   être rendu sur un SaaS métier dont le cycle créer → sauvegarder → relire →
   modifier → supprimer n'a jamais été exécuté une seule fois.

**Ce qui ferait basculer en 🟠 GO SOUS CONDITIONS :** corriger les 5 P1, puis
refaire cet audit **sur une instance Supabase réelle** en exécutant les lots 1 à 4
du plan de retest. Le socle de calcul étant sain, le chemin est court : la majorité
des correctifs relèvent du branchement et de l'unification, pas de la réécriture.

---

# 13. TOP 5 DES CORRECTIONS PRIORITAIRES

### 1. Supprimer les données fabriquées des chemins de production
- **Problème :** `DEMO_COCKPIT` et le repli `mock.ts` s'activent sur table vide, sur erreur et sur exception, sans aucun signal.
- **Impact :** décisions opérationnelles prises sur des surveillants, salles et montants inexistants.
- **Priorité :** P1
- **Correction :** conditionner tout repli à `SPC_DEMO === "1"` ; distinguer *erreur* / *vide* / *données* dans les 11 fonctions de `queries.ts` ; implémenter les états vides réels.
- **Validation attendue :** avec une base vide, chaque écran affiche un état vide ; avec une erreur RLS, un message d'erreur ; aucun nom fictif nulle part.

### 2. Une seule vérité pour la couverture surveillants
- **Problème :** page Salles à 19/16/manque 3 contre 14/10/manque 4 partout ailleurs, et KPI « manque 3 » contre un tableau à 4.
- **Impact :** sous-estimation du besoin de mobilisation avant une session.
- **Priorité :** P1
- **Correction :** `construireVueSalles` reçoit la session et ses affectations ; le manque global devient `Σ max(0, requis − affectés)` par salle ; le ratio théorique est libellé « estimation », jamais « manque ».
- **Validation attendue :** un seul couple (requis, manquants) sur les 5 pages ; KPI = somme du tableau.

### 3. Rattacher les salles au planning par une clé
- **Problème :** `affectations.salle` est du texte libre ; 5 salles du planning n'existent pas au référentiel ; « AMP » ≠ « Grand Amphithéâtre ».
- **Impact :** INV-004 inapplicable ; suppression et renommage sans effet ; contrôle des candidats impossible.
- **Priorité :** P1
- **Correction :** migration `affectations.salle_id → salles(id)` (`on delete restrict`), rattachement des salles à une session, réconciliation des libellés existants.
- **Validation attendue :** supprimer une salle utilisée est refusé avec un message explicite ; toute salle du planning existe au référentiel.

### 4. Protéger les suppressions et rétablir la piste d'audit
- **Problème :** `deleteSurveillant` / `deleteMission` déclenchent des cascades SQL silencieuses ; seul `validerSession` journalise.
- **Impact :** perte de planning irréversible et intraçable.
- **Priorité :** P1
- **Correction :** compter et présenter les dépendances avant suppression ; proposer la désactivation par défaut ; journaliser création, modification et suppression sur toutes les entités.
- **Validation attendue :** supprimer un surveillant planifié affiche « 3 affectations seront supprimées » et exige confirmation ; le journal porte l'opération.

### 5. Appliquer réellement les gardes métier
- **Problème :** 11 statuts proposés depuis « Terminée » (prouvé) ; `validateSessionForApproval` jamais appelé ; aucune validation serveur.
- **Impact :** transitions illégales (Terminée → Brouillon), sessions validées en sous-couverture.
- **Priorité :** P2 (élevé)
- **Correction :** `MissionForm` → `statutOptions(statutCourant)` ; contrôle de transition dans `updateMission` ; brancher `validateSessionForApproval` et le rappeler dans `validerSession` ; reprendre le test e2e qui fige les 11 statuts.
- **Validation attendue :** une mission « Terminée » ne propose que Facturée et Archivée ; un appel direct au Server Action avec une transition illégale est refusé ; valider une session à 71 % est bloqué.

---

# 14. PLAN DE RETEST

> **Prérequis à tout le plan :** une **instance Supabase de recette** avec les
> 30 migrations appliquées et un jeu de données réaliste. Sans elle, les lots 1, 2
> et 4 restent partiellement inexécutables — c'est la première action à mener.

### LOT 1 — P0 / P1 (immédiat)
1. Base vide → chaque écran affiche un état vide, aucun nom fictif (BUG-001, BUG-002).
2. Erreur RLS simulée → message d'erreur, jamais de données de démonstration.
3. Couverture relevée sur les 5 pages → valeur unique (BUG-005) ; KPI Salles = somme du tableau (BUG-006).
4. Suppression d'un surveillant portant 3 affectations → dépendances annoncées, journal alimenté (BUG-003).
5. Suppression d'une salle utilisée au planning → refus explicite (BUG-004).

### LOT 2 — P2 (fonctionnel)
6. **Persistance** — créer → sauvegarder → relire → changer de page → revenir → actualiser, sur mission, salle, surveillant, devis, affectation.
7. Transitions de statut sur les 11 statuts, via le formulaire **et** via appel direct au Server Action (BUG-011).
8. Validation d'une session à 71 % de couverture → refus attendu (BUG-015).
9. Double clic sur création de salle et de surveillant → une seule ligne créée (BUG-012, BUG-013).
10. Réconciliation grille de salles / heures facturées sur un devis (BUG-016).
11. Marge session vs marge société : libellés de périmètre distincts (BUG-010).
12. Cockpit sur session datée d'hier et de demain → aucun curseur temps réel (BUG-014).

### LOT 3 — P3 / UX
13. Libellé et période réelle du graphique de couverture (BUG-017).
14. Tri par date du tableau des sessions (BUG-018).
15. Format de date homogène sur tous les écrans (BUG-019).
16. Dénominateur du KPI Confirmations (BUG-020) ; ratio salles > 100 % (BUG-021).
17. Messages d'erreur reformulés selon les trois questions du §39 (BUG-024).
18. Décomptes d'alertes unifiés sur les 5 écrans (BUG-025).
19. Responsive mobile, contrastes WCAG AA, parcours clavier — **non couverts par cet audit**.

### LOT 4 — NON-RÉGRESSION
20. **Golden Path complet** : demande → devis → validation → mission → sessions → salles → surveillants → planification → confirmation → cockpit → exécution → rapport → facturation → archivage.
21. Les 10 invariants de la matrice §5.
22. Scénarios destructifs D-001 à D-010 du référentiel (mission complète modifiée en chaîne, suppression en cascade, 10 modifications successives, rafraîchissement pendant écriture, conflits massifs, valeurs zéro, valeurs extrêmes, navigation agressive, actions contradictoires, import répété).
23. Stress métier : plusieurs clients, missions, jours, salles, surveillants et superviseurs en simultané.
24. Rejeu intégral de `npm test` (383 tests) + de la suite e2e — **avec reprise du test qui verrouille aujourd'hui les 11 statuts**.

---

# 15. ARTEFACTS DE PREUVE

| Chemin | Contenu |
|---|---|
| `audit-artifacts/crawl.json` | Statut HTTP, erreurs console, `h1`, marqueurs suspects par route |
| `audit-artifacts/text_*.txt` | Texte intégral rendu de chaque page (33 fichiers) |
| `audit-artifacts/shot_*.png` | Captures pleine page (33 fichiers) |
| `audit-artifacts/evidence.txt` | Preuves des scénarios pilotés (statuts, double clic, valeurs limites, filtres) |
| `spc-cockpit/__tests__/zz-audit-invariants.test.ts` | 13 recalculs indépendants — **rejouables via `npm test`** |
| `spc-cockpit/tests/e2e/zz-audit-crawl.spec.ts` | Harnais de crawl |
| `spc-cockpit/tests/e2e/zz-audit-interact.spec.ts` | Harnais de scénarios |

Les recalculs indépendants sont **exécutables** : ils constituent une base de
non-régression pour les corrections à venir. Ils décrivent l'état **constaté**,
et devront donc être mis à jour au fur et à mesure des corrections.

---

*Audit conduit sans accès à une base de données. Chaque constat porte sa preuve
ou son statut de non-vérification. Aucune fonction n'a été déclarée validée sans
exécution.*
