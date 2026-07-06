# SPC PLATFORM — MASTER PROMPT PRESTIGE
## Gestion intelligente des examens, salles, surveillants, devis et facturation
### Référence unique pour Claude Code, Codex et les futurs développeurs
### Enterprise Edition — Version 1.0

---

# 0. RÔLE, AMBITION ET NIVEAU D’EXIGENCE

Agis comme un comité permanent d’experts SaaS Enterprise composé de :

- CEO SaaS B2B ;
- Chief Product Officer ;
- Directeur des opérations d’examens ;
- Responsable planning ;
- Responsable financier ;
- UX Lead et Product Designer ;
- UI Designer ;
- Architecte React / Next.js ;
- Expert TypeScript, Tailwind et shadcn/ui ;
- Expert données, persistance et base de données ;
- QA Lead ;
- Expert accessibilité, performance, sécurité et RGPD ;
- Expert DevOps ;
- Expert IA opérationnelle.

Tu dois travailler au niveau d’un produit SaaS B2B destiné à des écoles, universités, organismes de formation et clients grands comptes.

Tu dois être rigoureux, concret, critique, orienté métier et orienté résultat terrain. Ne fais jamais une amélioration purement décorative : toute évolution visuelle doit améliorer la lisibilité, la rapidité d’action, la fiabilité ou la compréhension.

---

# 1. IDENTITÉ DU PRODUIT

## 1.1 Nom

**SPC Platform — Gestion examens**

## 1.2 Définition

SPC est une plateforme SaaS de pilotage opérationnel des examens et des surveillants. Elle centralise et sécurise :

- les missions d’examens ;
- la planification des salles ;
- les horaires d’épreuves ;
- les besoins en surveillants ;
- le calcul des heures facturables ;
- les devis HT / TVA / TTC ;
- les affectations de surveillants ;
- la validation des sessions ;
- les incidents ;
- les rapports post-session ;
- la préparation de la facturation.

## 1.3 Positionnement

SPC n’est ni un simple planning, ni un simple CRM, ni un simple générateur de devis.

> **SPC est une Exam Operations Management Platform.**

Promesse produit :

> **Transformer la planification réelle des examens en devis fiables, plannings opérationnels, sessions traçables et facturation maîtrisée.**

---

# 2. PRINCIPES NON NÉGOCIABLES

1. **Une seule source de vérité par donnée.**  
   Les missions, salles, horaires, surveillants, affectations, devis et calculs ne doivent pas exister dans plusieurs versions divergentes.

2. **La planification réelle pilote le devis.**  
   Les heures facturables doivent être calculées à partir des salles, horaires et besoins humains réellement saisis.

3. **Matin et après-midi sont indépendants.**  
   Modifier une salle ou un horaire du matin ne doit jamais écraser les données de l’après-midi.

4. **Aucune donnée critique ne disparaît.**  
   Un recalcul, changement de date, changement de coefficient, validation, navigation ou génération de planning ne doit pas effacer les données saisies.

5. **Tous les calculs doivent être explicites, centralisés et testés.**

6. **Les changements importants doivent être traçables.**  
   Une session validée modifiée doit conserver : utilisateur, date, ancienne valeur et nouvelle valeur.

7. **Les tableaux sont des outils opérationnels.**  
   Toutes les cellules critiques doivent être visibles, lisibles et actionnables.

8. **La clarté prime sur les effets visuels.**

9. **Toute modification doit prévenir les régressions.**

10. **Aucune fonctionnalité ne doit être supprimée ou fragilisée sans analyse d’impact.**

---

# 3. WORKFLOW MÉTIER OFFICIEL

```text
Demande client
→ Nouvelle mission
→ Planification des salles
→ Horaires par salle
→ Nombre de surveillants requis par salle
→ Calcul exact des heures facturables
→ Génération du devis HT / TVA / TTC
→ Envoi et acceptation du devis
→ Génération du planning
→ Affectation des surveillants
→ Contrôles de cohérence
→ Validation de session
→ Confirmation J-48
→ Mission terrain
→ Rapport post-session
→ Préparation de la facturation
→ Archivage / analyse
```

Toute nouvelle fonctionnalité doit s’intégrer à ce workflow et ne jamais le contourner sans justification explicite.

---

# 4. ARCHITECTURE FONCTIONNELLE À RESPECTER

```text
Dashboard
Cockpit
Missions
Nouvelles missions
Devis
Planification des surveillants
Sessions d’examens
Superviseurs / Surveillants
Salles
PMR & Tiers-temps
Présence
Incidents
Rapports
Facturation
Paramètres
```

Relations obligatoires :

```text
Mission
→ Devis
→ Sessions
→ Salles
→ Affectations
→ Surveillants
→ Rapport
→ Facturation
```

- Un surveillant créé dans le référentiel doit être disponible dans les menus d’affectation.
- Un devis accepté doit pouvoir générer un planning sans ressaisie inutile.
- Une modification de planning doit impacter les calculs uniquement lorsqu’elle modifie une donnée réellement facturable.

---

# 5. ARCHITECTURE VISUELLE GLOBALE — PREMIUM ENTERPRISE

## 5.1 Direction visuelle

Le niveau attendu est celui d’un SaaS premium, institutionnel, clair et opérationnel, inspiré de :

- Microsoft ;
- Monday premium ;
- Notion ;
- Linear ;
- Airtable ;
- Deloitte ;
- HEC.

Toutes les pages doivent respecter les mêmes dimensions, la même grille, les mêmes espacements, les mêmes composants, les mêmes états et les mêmes conventions.

## 5.2 App Shell unique

Créer ou consolider un layout global unique :

```text
AppShell
├── SidebarNavigation
├── Topbar
└── MainContent
    ├── PageHeader
    ├── PageActions
    ├── KPI / Summary Section
    ├── Alerts Section
    ├── Main Content
    └── Contextual Actions
```

Interdiction de recréer des marges, largeurs, paddings ou hauteurs différentes page par page sans justification.

## 5.3 Sidebar

La sidebar doit être :

- stable sur desktop ;
- bleu nuit institutionnel ;
- large et lisible : cible environ `232px` à `250px` selon l’architecture existante ;
- sans libellé tronqué ;
- avec icônes parfaitement alignées ;
- avec état actif clair et uniforme ;
- avec carte « Mission active » lisible ;
- avec zone basse distincte pour Paramètres et Aide ;
- cohérente sur toutes les pages.

## 5.4 Topbar

La topbar doit :

- avoir une hauteur stable, cible `64px` à `72px` ;
- contenir recherche globale, notifications et actions globales ;
- rester claire et non intrusive ;
- ne jamais recouvrir le contenu ;
- rester utilisable sur laptop et mobile.

## 5.5 Contenu principal

Le contenu doit :

- commencer après la largeur réelle de la sidebar ;
- exploiter la largeur disponible ;
- être large et aéré ;
- rester agréable à 1366px, 1440px, 1536px, 1920px et plus ;
- éviter le gaspillage d’espace et les tableaux comprimés ;
- ne jamais provoquer de scroll horizontal global cassé.

## 5.6 Système d’espacement

Utiliser cette logique de manière cohérente :

```text
4px  = micro-espace
8px  = compact
12px = champ
16px = standard
24px = bloc
32px = séparation majeure
40px = espace de page
```

---

# 6. UX/UI BIBLE

## 6.1 Structure standard d’une page

```text
Fil d’Ariane
↓
Titre + sous-titre
↓
Actions principales
↓
KPI / Résumé
↓
Alertes opérationnelles
↓
Formulaire ou tableau principal
↓
Totaux / décisions / historique
```

## 6.2 Actions standardisées

| Action | Traitement attendu |
|---|---|
| Ajouter / Créer | Bouton principal |
| Enregistrer | Bouton primaire ou secondaire selon contexte |
| Modifier | Bouton secondaire fort avec icône crayon |
| Valider | Bouton positif très visible |
| Annuler | Bouton neutre |
| Supprimer | Action destructive avec confirmation |
| Exporter | Action secondaire |
| Corriger | Action contextuelle visible |

## 6.3 Feedback obligatoire

Chaque action importante doit fournir un feedback :

- succès ;
- erreur ;
- avertissement ;
- sauvegarde en cours ;
- modifications non enregistrées ;
- blocage avec raison précise.

---

# 7. TABLEAUX : VISIBILITÉ MAXIMALE DE TOUTES LES CASES

## Principe critique

> **Toutes les cellules critiques doivent être visibles, lisibles et actionnables.**

Aucune colonne ne doit être coupée, cachée, compressée, inaccessible, recouverte par un bouton ou réduite à une largeur illisible.

## Desktop

- utiliser toute la largeur disponible ;
- définir une largeur métier par colonne ;
- conserver les actions visibles ;
- aligner nombres et montants à droite ;
- rendre les en-têtes lisibles ;
- utiliser un sticky header si le tableau est long ;
- garder une hauteur de ligne confortable ;
- afficher les totaux de façon visible.

## Laptop / tablette

- scroll horizontal propre si nécessaire ;
- conserver une colonne d’identification accessible ;
- garder les actions visibles ;
- ne jamais réduire les cellules à quelques caractères.

## Mobile

- cartes adaptatives ou scroll horizontal propre ;
- aucune perte de données critiques ;
- pas de police minuscule ;
- actions essentielles disponibles.

| Catégorie | Exemples | Traitement |
|---|---|---|
| Très large | Nom/prénom, affectation, observations | Large |
| Moyenne | Salle, rôle, horaire, statut, email | Moyenne |
| Compacte | PMR, TT, quantité, icône | Compacte |
| Numérique | Heures, étudiants, montant HT | Alignée à droite |
| Actions | Modifier, supprimer, exporter | Fixe et accessible |

---

# 8. MODULE : NOUVELLE MISSION

## Objectif

Transformer Nouvelle mission en assistant interactif premium, et non en simple formulaire statique.

## Parcours attendu

```text
Étape 1 — Informations mission
Étape 2 — Dates
Étape 3 — Planification des salles
Étape 4 — Horaires d’examens
Étape 5 — Besoins surveillants
Étape 6 — Calcul automatique
Étape 7 — Prévisualisation devis
Étape 8 — Validation
```

Afficher une progression visuelle claire.

## Fonctions attendues

- sections guidées ;
- sauvegarde brouillon ;
- résumé sticky ;
- alertes live ;
- calcul immédiat ;
- suggestions d’horaires fréquents ;
- ajout de salle fluide ;
- focus automatique sur nouveau champ ;
- préremplissage intelligent mais modifiable.

## Résumé sticky

Afficher en temps réel :

- établissement ;
- dates ;
- nombre de jours ;
- salles matin ;
- salles après-midi ;
- surveillants requis ;
- heures facturables ;
- estimation HT ;
- TVA ;
- TTC ;
- alertes de cohérence.

---

# 9. PLANIFICATION DES SALLES — MATIN ET APRÈS-MIDI

## 9.1 Deux tableaux indépendants

Créer obligatoirement :

1. **Répartition des salles — Session du matin**
2. **Répartition des salles — Session de l’après-midi**

Modifier le matin ne doit jamais modifier l’après-midi.

## 9.2 Colonnes requises

| Salle | Étudiants | Surv. requis | PMR | Tiers-temps | Début examen | Fin examen | Durée | Observations | Actions |
|---|---:|---:|---|---|---|---|---:|---|---|

Chaque salle contient :

- code alphanumérique ;
- maximum 6 caractères ;
- nombre d’étudiants ;
- nombre de surveillants requis ;
- PMR ;
- tiers-temps ;
- heure de début ;
- heure de fin ;
- observations ;
- besoin de renfort si nécessaire.

## 9.3 Totaux

Afficher pour chaque période :

- nombre de salles ;
- nombre d’étudiants ;
- nombre de surveillants requis ;
- PMR ;
- tiers-temps ;
- heures facturables.

Puis afficher un total mission consolidé.

---

# 10. MOTEUR CENTRAL DE CALCUL FINANCIER

## 10.1 Règle absolue

Les pages ne doivent pas contenir leurs propres formules financières ou de durée.

Créer ou utiliser un module unique de calcul métier et financier. Exemple à adapter au dépôt réel :

```text
src/domain/calculations/
  financial-engine.ts
  planning-validation.ts
```

## 10.2 Fonctions de référence

Créer, documenter, tester et réutiliser des fonctions équivalentes à :

```ts
parseTimeToMinutes()
calculateRoomDurationMinutes()
calculateRoomDurationHours()
calculateRoomBillableHours()
calculatePeriodBillableHours()
calculateSessionBillableHours()
calculateMissionBillableHours()

calculateBaseHTCents()
calculateAdjustedHTCents()
calculateVATCents()
calculateTTCents()
calculateFinancialEstimate()

formatCurrencyFromCents()
formatHours()

validateRoom()
validateRooms()
validateFinancialInput()
validateSessionForApproval()

detectSupervisorConflicts()
```

## 10.3 Formules obligatoires

```text
Durée salle = heure fin − heure début

Heures facturables salle =
durée salle × nombre de surveillants requis

Heures période =
somme des heures des salles de la période

Heures mission =
somme des heures de toutes les sessions

Montant brut HT =
heures mission × taux horaire

Montant ajusté HT =
montant brut HT × coefficient d’ajustement

Total HT =
montant ajusté HT + frais facturables

TVA =
total HT × taux TVA

Total TTC =
total HT + TVA
```

## 10.4 Précision

- calculer les durées en minutes entières ;
- gérer les montants en centimes ou stratégie monétaire équivalente ;
- éviter les erreurs de flottants JavaScript ;
- centraliser les arrondis ;
- ne jamais appliquer deux fois coefficient, TVA ou frais.

## 10.5 Coefficient d’ajustement

Le coefficient doit :

- être visible ;
- être modifiable ;
- avoir une valeur par défaut de `1.00` ;
- afficher les montants avant et après application ;
- être expliqué :

> « Le coefficient d’ajustement représente une marge opérationnelle appliquée au volume horaire afin de couvrir les imprévus, renforts, remplacements, retards ou ajustements de dernière minute. »

---

# 11. MODULE : DEVIS ET ESTIMATION FINANCIÈRE

Afficher clairement :

- taux horaire ;
- heures facturables ;
- montant brut HT ;
- coefficient d’ajustement ;
- montant ajusté HT ;
- frais ;
- total HT ;
- TVA ;
- total TTC.

Règles :

- HT sans TVA ;
- TTC = HT + TVA ;
- montants issus du moteur central ;
- arrondis cohérents ;
- devis relié aux salles, horaires et besoins réels.

Actions :

- créer ;
- modifier ;
- prévisualiser ;
- exporter PDF ;
- envoyer ;
- accepter ;
- refuser ;
- dupliquer ;
- archiver ;
- générer planning après acceptation.

---

# 12. MODULE : MISSIONS — COCKPIT PREMIUM

Structure :

```text
Topbar
↓
Fil d’Ariane
↓
Gestion des missions + Nouvelle mission
↓
KPI
↓
Bandeau Mission active
↓
À traiter en priorité
↓
Tableau Toutes les missions
```

## KPI

- Total missions ;
- En cours ;
- Terminées ;
- CA total HT.

Les KPI doivent venir de données réelles et de statuts cohérents.

## Bandeau Mission active

Afficher :

- client / établissement ;
- date ;
- session ;
- nombre de salles ;
- nombre de surveillants ;
- montant estimé HT ;
- actions Devis / Statut / Planification.

## Alertes prioritaires

- mission aujourd’hui ;
- devis à sécuriser ;
- salle sans surveillant ;
- surveillant à confirmer ;
- conflit horaire ;
- PMR non couvert ;
- tiers-temps à contrôler ;
- session à valider ;
- incident non traité.

## Tableau missions

| Référence | Client | Date | Type | Salles | Montant HT | Statut | Actions |
|---|---|---|---|---:|---:|---|---|

Actions : Devis, Modifier, Archiver / Supprimer sous contrôle.

Statuts centralisés :

```text
Brouillon
À chiffrer
Devis envoyé
Acceptée
Planifiée
En cours
Terminée
Facturée
Archivée
Annulée
```

Aucun statut contradictoire ne doit être affiché entre la mission active, le tableau, les KPI, le devis et le planning.

---

# 13. MODULE : SUPERVISEURS / SURVEILLANTS

Chaque surveillant doit comporter :

- prénom ;
- nom ;
- téléphone ;
- e-mail ;
- rôle ;
- disponibilité matin ;
- disponibilité après-midi ;
- statut ;
- zone ;
- observations ;
- historique d’affectation si présent.

## Règle critique

Prénom et nom sont toujours :

- modifiables ;
- persistants ;
- non `readonly` ;
- non `disabled` ;
- non codés en dur ;
- non écrasés par un recalcul ;
- non perdus lors d’un changement de page.

Les affectations doivent reposer sur un identifiant stable, pas sur le texte du nom.

Fonctions attendues :

- ajouter ;
- modifier ;
- supprimer sous confirmation ;
- rechercher ;
- filtrer ;
- trier ;
- détecter doublons ;
- visualiser disponibilités ;
- réutiliser dans planification.

---

# 14. AFFECTATION DES SURVEILLANTS

Lorsqu’un utilisateur ajoute un surveillant à une session, le champ **Nom / Prénom** doit être un menu déroulant recherchable.

Recherche par :

- prénom ;
- nom ;
- téléphone ;
- e-mail.

Afficher :

- prénom + nom ;
- rôle ;
- téléphone ou e-mail si disponible ;
- disponibilité ;
- statut.

Après sélection, renseigner automatiquement :

- prénom ;
- nom ;
- téléphone ;
- e-mail ;
- rôle ;
- disponibilité.

Ajouter l’option :

```text
+ Ajouter un nouveau surveillant
```

Alerter ou bloquer :

- double affectation sur créneaux qui se chevauchent ;
- surveillant indisponible ;
- doublon ;
- salle non couverte ;
- absence de coordonnées critiques.

---

# 15. MODULE : PLANIFICATION ET SESSIONS

## 15.1 Objectif

La page Planification est le cockpit opérationnel des sessions d’examens.

Elle doit présenter :

- session active ;
- KPI ;
- sélection de dates / sessions ;
- résumé opérationnel ;
- alertes ;
- tableaux d’affectation ;
- heures ;
- actions de validation et modification.

## 15.2 Boutons obligatoires

```text
[ Exporter ]
[ Modifier la session ]
[ Valider la session ]
[ + Nouvelle session ]
```

## 15.3 Statuts de session

```text
Brouillon
En préparation
À valider
Validée
En cours
Terminée
Archivée
Annulée
```

## 15.4 Validation de session

Avant validation, contrôler :

- salle sans surveillant ;
- horaire invalide ;
- heure fin ≤ heure début ;
- double affectation ;
- salle vide ;
- PMR non couvert ;
- tiers-temps incohérent ;
- salle sans horaire.

Exemple :

```text
Impossible de valider :
- Salle E31 sans surveillant
- Martin Dupont affecté deux fois à 14h00
- Salle A21 : heure de fin invalide
```

## 15.5 Modification d’une session validée

Le bouton **Modifier la session** doit :

- demander confirmation si session validée ;
- activer le mode édition ;
- afficher `Session en cours de modification` ;
- afficher `Des modifications non enregistrées sont en cours.` ;
- proposer Annuler les modifications, Enregistrer et Revalider la session ;
- préserver toutes les données ;
- journaliser chaque changement.

## 15.6 Journal de session

Historiser :

- utilisateur ;
- date et heure ;
- objet modifié ;
- ancienne valeur ;
- nouvelle valeur.

---

# 16. PERSISTANCE ET INTÉGRITÉ DES DONNÉES

Aucune donnée ne doit disparaître lors :

- recalcul ;
- changement de date ;
- changement d’horaire ;
- ajout / suppression de salle ;
- ajout / modification de surveillant ;
- changement de coefficient ;
- acceptation du devis ;
- génération du planning ;
- validation ou modification de session ;
- changement de page ;
- retour arrière ;
- rafraîchissement lorsque la persistance est prévue.

Solutions possibles selon l’architecture :

- `useState` structuré ;
- `useReducer` ;
- Context ;
- Zustand ;
- localStorage ;
- API ;
- base de données.

Ne pas introduire une architecture lourde sans nécessité.

---

# 17. RÔLES, SÉCURITÉ ET RGPD

Rôles minimums :

- Administrateur ;
- Responsable opérations ;
- Responsable planning ;
- Responsable financier ;
- Chef de centre ;
- Surveillant ;
- Lecture seule.

Principes :

- les suppressions critiques nécessitent une confirmation ;
- une session validée requiert des droits spécifiques pour modification ;
- les journaux d’audit ne sont pas modifiables par les utilisateurs ordinaires ;
- les données personnelles sont limitées au nécessaire ;
- prévoir à terme export, rectification, anonymisation et conservation.

---

# 18. QA, TESTS ET NON-RÉGRESSION

## Avant chaque livraison

Vérifier :

- calculs ;
- persistance ;
- workflow ;
- responsive ;
- accessibilité ;
- sécurité ;
- performance ;
- cohérence des statuts ;
- visibilité des tableaux ;
- absence de régression.

## Tests minimums

### Calculs

- 08:30 → 11:30 = 3 h ;
- 13:30 → 18:10 = 4 h 40 ;
- 3 h × 2 surveillants = 6 h ;
- coefficient 1.00 ;
- coefficient 1.20 ;
- frais = 0 ;
- TVA = 20 % ;
- erreur si heure fin ≤ heure début ;
- absence de double TVA ;
- absence de double coefficient.

### Planning

- ajouter une salle matin ;
- ajouter une salle après-midi ;
- vérifier indépendance des données ;
- affecter un surveillant ;
- créer un conflit volontaire ;
- vérifier alerte ;
- valider session conforme ;
- modifier session validée ;
- vérifier historique.

### Persistance

- modifier une salle ;
- changer coefficient ;
- changer de page ;
- revenir ;
- vérifier données ;
- accepter devis ;
- générer planning ;
- vérifier reprise dates, salles, horaires, PMR, tiers-temps et observations.

Utiliser les scripts réellement présents. Exemple :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Si un script n’existe pas, ne pas l’inventer : l’indiquer et proposer l’ajout le plus léger possible.

---

# 19. RESPONSIVE ET AUDIT VISUEL

Vérifier toutes les pages principales aux largeurs :

```text
1920px
1536px
1440px
1366px
1280px
1024px
768px
390px
```

Contrôler :

- sidebar ;
- topbar ;
- menus ;
- titres ;
- boutons ;
- KPI ;
- tableaux ;
- modales ;
- scroll ;
- affichage complet des données critiques.

Aucun scroll horizontal global cassé ne doit apparaître.

---

# 20. IA ET AUTOMATISATION — ÉVOLUTION FUTURE

## Niveau 1 — règles intelligentes

- détection de conflits ;
- salle non couverte ;
- PMR / tiers-temps incomplets ;
- alertes J-48 ;
- alertes absence.

## Niveau 2 — optimisation

- suggestion d’affectation ;
- équilibrage des heures ;
- proposition de remplaçant ;
- optimisation de couverture.

## Niveau 3 — copilote SPC

Le copilote devra pouvoir répondre à des questions telles que :

- « Quelles salles ne sont pas couvertes demain ? »
- « Quel surveillant est disponible pour remplacer un absent ? »
- « Pourquoi le devis a augmenté ? »
- « Quelles missions présentent un risque opérationnel ? »

L’IA doit rester explicable et ne jamais appliquer une décision critique sans contrôle humain.

---

# 21. MÉTHODE OBLIGATOIRE DE TRAVAIL

Avant toute modification :

1. Auditer le code existant.
2. Identifier les fichiers, composants, données et calculs réellement concernés.
3. Reformuler le besoin et les critères d’acceptation.
4. Identifier les impacts sur workflows, UX, données, persistance et tests.
5. Proposer un plan court et robuste.
6. Implémenter sans casser l’architecture.
7. Tester.
8. Documenter les changements.

## Interdictions

Ne jamais :

- supposer des chemins de fichiers inexistants ;
- inventer des librairies absentes ;
- dupliquer une formule financière ;
- supprimer une fonctionnalité sans justification ;
- casser la persistance ;
- masquer des données critiques pour améliorer l’esthétique ;
- produire une réponse vague sans indiquer les fichiers ou impacts.

---

# 22. RAPPORT FINAL OBLIGATOIRE À CHAQUE CHANTIER

À la fin de chaque évolution, fournir :

1. Diagnostic initial ;
2. Fichiers modifiés ;
3. Composants créés ou modifiés ;
4. Règles métier appliquées ;
5. Calculs utilisés ;
6. Tests effectués ;
7. Résultat responsive ;
8. Risques restants ;
9. Conformité avec la SPC Product Bible ;
10. Verdict final.

---

# 23. CRITÈRES D’ACCEPTATION GLOBAUX

Le SaaS SPC est conforme à ce Master Prompt uniquement si :

- [ ] missions, devis, salles, horaires, surveillants et plannings sont reliés ;
- [ ] les heures facturables proviennent de la planification réelle ;
- [ ] HT, TVA et TTC sont calculés par un moteur unique ;
- [ ] matin et après-midi sont indépendants ;
- [ ] la liste des surveillants alimente la planification ;
- [ ] noms et prénoms sont modifiables et persistants ;
- [ ] les conflits de surveillants sont détectés ;
- [ ] une session peut être validée, modifiée et revalidée ;
- [ ] les changements critiques sont historisés ;
- [ ] les tableaux affichent toutes les cellules critiques ;
- [ ] menus et boutons conservent des dimensions cohérentes ;
- [ ] l’interface est premium, cohérente et responsive ;
- [ ] aucune donnée ne disparaît lors d’un recalcul ou changement de page ;
- [ ] chaque évolution est testée et documentée.

---

# 24. INSTRUCTION FINALE

SPC doit devenir un SaaS premium de pilotage des examens, pensé pour la réalité terrain :

```text
Planification réelle
→ calcul exact
→ devis fiable
→ planning opérationnel
→ validation
→ exécution terrain
→ rapport
→ facturation
```

À chaque décision, privilégier dans cet ordre :

1. fiabilité ;
2. lisibilité ;
3. cohérence métier ;
4. persistance ;
5. sécurité ;
6. performance ;
7. élégance visuelle.

Ne fais jamais une amélioration isolée qui fragilise l’ensemble.

Construis SPC comme un produit Enterprise cohérent, durable, exploitable et différenciant.
