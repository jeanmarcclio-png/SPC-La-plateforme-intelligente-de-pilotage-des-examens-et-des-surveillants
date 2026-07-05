# SPC Product Bible

## Enterprise Edition v1.0

> Référence unique de développement, d'architecture, d'UX/UI et de
> gouvernance du SaaS **SPC -- Plateforme intelligente de pilotage des
> examens et des surveillants**.

------------------------------------------------------------------------

# Table des matières

1.  Vision du produit
2.  ADN du produit
3.  Personas
4.  Architecture fonctionnelle
5.  Workflows métier
6.  Règles métier
7.  Règles de calcul
8.  UX/UI & Design System
9.  Composants
10. Persistance des données
11. Qualité & Tests
12. Sécurité
13. Intelligence Artificielle
14. Roadmap
15. Gouvernance produit
16. Comité d'experts virtuel
17. Philosophie produit
18. Annexes

------------------------------------------------------------------------

# 1. Vision du produit

## Mission

SPC est une plateforme SaaS destinée à piloter l'ensemble du cycle de
vie des missions de surveillance d'examens.

## Objectifs

-   Planifier les examens
-   Organiser les salles
-   Calculer automatiquement les heures facturables
-   Générer les devis
-   Planifier les surveillants
-   Piloter les missions
-   Produire les rapports
-   Préparer la facturation

------------------------------------------------------------------------

# 2. ADN du produit

## SPC n'est pas :

-   un simple logiciel de planning
-   un simple CRM
-   un simple générateur de devis

## SPC est :

Une plateforme complète de pilotage opérationnel.

Principes :

-   simplicité
-   fiabilité
-   automatisation
-   traçabilité
-   cohérence métier

------------------------------------------------------------------------

# 3. Personas

-   Responsable examens
-   Coordinateur pédagogique
-   Responsable planning
-   Responsable financier
-   Chef de centre
-   Surveillant
-   Administrateur
-   Client

Pour chaque persona :

-   objectifs
-   irritants
-   besoins
-   KPI

------------------------------------------------------------------------

# 4. Architecture fonctionnelle

``` text
Dashboard
│
├── Devis
├── Nouvelle mission
├── Planification
├── Sessions
├── Superviseurs
├── Rapports
├── Facturation
└── Paramètres
```

Toutes les pages doivent être interconnectées.

------------------------------------------------------------------------

# 5. Workflow métier

``` text
Nouvelle mission
↓
Planification des salles
↓
Horaires d'examens
↓
Nombre de surveillants
↓
Calcul des heures
↓
Devis HT/TTC
↓
Acceptation
↓
Planning
↓
Affectation
↓
Validation
↓
Mission
↓
Rapport
↓
Facturation
```

------------------------------------------------------------------------

# 6. Règles métier

Chaque salle possède :

-   un identifiant
-   un horaire
-   un nombre d'étudiants
-   un nombre de surveillants
-   PMR
-   tiers-temps
-   observations

Deux tableaux indépendants :

-   Session matin
-   Session après-midi

------------------------------------------------------------------------

# 7. Règles de calcul

Heures facturables :

``` text
(fin - début) × nombre de surveillants
```

Puis :

-   Total matin
-   Total après-midi
-   Total mission

Calcul financier :

-   HT
-   coefficient
-   TVA
-   TTC

Toutes les formules doivent être centralisées.

------------------------------------------------------------------------

# 8. UX/UI & Design System

Inspirations :

-   Microsoft
-   Monday
-   Deloitte
-   Notion
-   HEC

Règles :

-   tableaux pleine largeur
-   visibilité complète des cellules
-   responsive
-   hiérarchie visuelle claire
-   badges cohérents
-   composants réutilisables

------------------------------------------------------------------------

# 9. Composants

-   Dashboard
-   Cartes KPI
-   Tableau Devis
-   Tableau Planification
-   Tableau Salles
-   Tableau Surveillants
-   Modales
-   Alertes
-   Timeline
-   Boutons standardisés

------------------------------------------------------------------------

# 10. Persistance des données

Aucune donnée ne doit être perdue après :

-   recalcul
-   changement de date
-   changement de page
-   validation
-   modification
-   génération du planning

------------------------------------------------------------------------

# 11. Qualité & Tests

Avant chaque livraison :

-   calculs
-   workflow
-   responsive
-   accessibilité
-   performance
-   non-régression
-   cohérence métier

------------------------------------------------------------------------

# 12. Sécurité

-   rôles
-   permissions
-   historique
-   journal d'audit
-   RGPD
-   sauvegardes

------------------------------------------------------------------------

# 13. Intelligence Artificielle

Prévoir :

-   affectation intelligente
-   détection des conflits
-   optimisation des salles
-   prévision des besoins
-   copilote SPC
-   recommandations

------------------------------------------------------------------------

# 14. Roadmap

-   MVP
-   V1
-   Enterprise
-   IA
-   Mobile
-   Multi-clients

------------------------------------------------------------------------

# 15. Gouvernance produit

Toute évolution doit :

1.  analyser les impacts
2.  respecter les workflows
3.  éviter les régressions
4.  conserver la cohérence globale

------------------------------------------------------------------------

# 16. Comité d'experts virtuel

Avant toute modification, considérer le point de vue de :

-   CEO SaaS
-   CTO
-   CPO
-   UX Lead
-   UI Designer
-   Architecte
-   QA Lead
-   Expert métier examens
-   Expert sécurité
-   Expert performance
-   Expert accessibilité
-   Expert IA

------------------------------------------------------------------------

# 17. Philosophie produit

-   Une seule source de vérité.
-   Les calculs doivent être explicites.
-   Les workflows doivent refléter la réalité terrain.
-   Les interfaces doivent privilégier la clarté.
-   Toute action doit être traçable.

------------------------------------------------------------------------

# 18. Annexes

À compléter progressivement :

-   dictionnaire métier
-   modèles de données
-   API
-   conventions de code
-   check-lists QA
-   règles UX
-   règles UI
-   scénarios de tests
-   critères d'acceptation
-   roadmap détaillée
