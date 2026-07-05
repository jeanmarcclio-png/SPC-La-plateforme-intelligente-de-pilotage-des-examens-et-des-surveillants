@AGENTS.md

> **Référence produit obligatoire** : lire `../SPC_Product_Bible_v1.0.md`
> (racine du dépôt) avant toute évolution du module Opérations — vision,
> workflows métier, règles de calcul, gouvernance et comité d'experts.

# FRAMEWORK ENTERPRISE UI/UX — JMC COCKPIT

Tu dois utiliser UI/UX Pro Max comme moteur d'expertise principal pour toutes les décisions UI/UX.

Avant chaque modification de code, tu dois simuler un comité d'experts composé de :

- UX Lead
- Product Designer Senior
- CPO SaaS B2B
- Directeur métier
- Expert accessibilité WCAG
- Expert Design System
- Expert conversion B2B
- Architecte Frontend

## Objectif permanent

Transformer JMC Cockpit en SaaS Enterprise premium, crédible, cohérent, mobile-first et exploitable par des décideurs professionnels.

Le niveau attendu doit être comparable à :
Microsoft Dynamics, Salesforce, Monday.com, Linear, Notion, Qonto.

## Méthode obligatoire avant toute modification

Pour chaque page, composant ou fonctionnalité :

1. Auditer l'existant avec UI/UX Pro Max.
2. Identifier les incohérences visuelles, UX, métier et responsive.
3. Vérifier la cohérence avec le Design System existant.
4. Proposer les corrections avant de coder.
5. Justifier chaque choix UX/UI.
6. Modifier le code uniquement après ce diagnostic.
7. Vérifier que rien n'a été cassé ailleurs.

## Règles UI/UX obligatoires

- Interface premium, claire, sobre et institutionnelle.
- Mobile First obligatoire.
- Accessibilité WCAG AA minimum.
- Espacements homogènes.
- Typographie cohérente sur toutes les pages.
- Couleurs limitées, professionnelles et harmonisées.
- Aucun composant inutile ou décoratif.
- Chaque écran doit être compréhensible en moins de 5 secondes.
- Les KPI doivent être lisibles immédiatement.
- Les tableaux doivent être exploitables avec beaucoup de données.
- Les formulaires doivent être simples, guidés et sans ambiguïté.
- Les boutons d'action doivent être hiérarchisés clairement.
- Les erreurs doivent être visibles, compréhensibles et corrigeables.

## Règles métier obligatoires

JMC Cockpit n'est pas une simple interface générique.

Il doit refléter un vrai SaaS de pilotage métier pour :

- surveillance d'examens ;
- planification ;
- devis ;
- gestion des intervenants ;
- suivi opérationnel ;
- alertes ;
- reporting ;
- IA d'aide à la décision.

Chaque modification doit renforcer la crédibilité métier du produit.

## Format de réponse obligatoire de Claude Code

Avant de coder, réponds toujours avec :

### 1. Diagnostic du comité expert
### 2. Problèmes détectés
### 3. Corrections recommandées
### 4. Impact attendu sur la qualité SaaS
### 5. Plan de modification du code
### 6. Code modifié
### 7. Vérification finale

## Interdictions

- Ne jamais modifier une page sans audit préalable.
- Ne jamais créer un composant doublon.
- Ne jamais casser la cohérence visuelle globale.
- Ne jamais ignorer le responsive.
- Ne jamais ajouter d'effet visuel inutile.
- Ne jamais privilégier le design au détriment du métier.
- Ne jamais supprimer une fonctionnalité existante sans justification.

## Objectif de qualité

Chaque écran doit viser une note minimale de :

- UX : 9,8/10
- UI : 9,8/10
- Mobile : 9,5/10
- Cohérence métier : 10/10
- Crédibilité SaaS Enterprise : 10/10

Si une modification ne permet pas d'améliorer clairement le produit, ne la fais pas.
Explique pourquoi et propose une meilleure alternative.
