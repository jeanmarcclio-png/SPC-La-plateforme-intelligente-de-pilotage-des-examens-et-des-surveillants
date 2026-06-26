# Guide Utilisateur — SPC Cockpit

**Version** : 1.0 · Juin 2026  
**Audience** : Directeur commercial, SDR, responsables de campagne, managers

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Connexion et accès](#2-connexion-et-accès)
3. [Navigation](#3-navigation)
4. [Dashboard — Vue quotidienne](#4-dashboard--vue-quotidienne)
5. [Cockpit Dirigeant](#5-cockpit-dirigeant)
6. [Campagnes](#6-campagnes)
7. [Qualification BANT](#7-qualification-bant)
8. [Planning](#8-planning)
9. [Reporting](#9-reporting)
10. [Livrables](#10-livrables)
11. [Paramètres](#11-paramètres)
12. [Copilote IA](#12-copilote-ia)
13. [Application mobile (PWA)](#13-application-mobile-pwa)
14. [Glossaire](#14-glossaire)

---

## 1. Introduction

**SPC Cockpit** est la plateforme de pilotage commercial de SPC, spécialiste de la surveillance d'examens pour l'enseignement supérieur. Elle centralise :

- Le **suivi des prospects** (business schools, universités, grandes écoles, CFA, CPGE)
- La **gestion des campagnes** de prospection B2B
- Les **recommandations IA** en temps réel
- Le **planning opérationnel** des échéances
- Un **copilote IA** disponible à tout moment

La plateforme fonctionne sur ordinateur et sur mobile (mode PWA installable).

---

## 2. Connexion et accès

### Se connecter

1. Ouvrez **cockpit.vercel.app** dans votre navigateur
2. Saisissez votre **adresse email** et votre **mot de passe**
3. Cliquez sur **Se connecter**

Vous êtes redirigé automatiquement vers le Dashboard.

### Se déconnecter

- **Desktop** : Cliquez sur l'icône de déconnexion (→) en haut à droite de la Topbar
- **Mobile** : Allez dans **Paramètres** → section Compte → **Déconnexion**

### Mot de passe oublié

Contactez votre administrateur SPC pour réinitialisation.

---

## 3. Navigation

### Desktop (ordinateur)

La **barre latérale gauche** (Sidebar) donne accès à toutes les sections :

| Icône | Page | Description |
|-------|------|-------------|
| 🏠 | Accueil / Dashboard | Vue quotidienne |
| 📊 | Cockpit Dirigeant | Résumé exécutif IA |
| 👥 | Prospects / Qualification | Pipeline BANT |
| 📁 | Campagnes | Gestion des campagnes |
| 📅 | Planning | Calendrier des échéances |
| 📈 | Reporting | Performance commerciale |
| 📋 | Livrables | Suivi des livrables |
| ⚙️ | Paramètres | Compte et préférences |

En bas de la Sidebar, vous trouverez :
- **Campagne active** : nom, nombre de prospects, countdown J-X
- **Bouton de déconnexion**

### Mobile

La **barre de navigation inférieure** donne accès aux 7 sections principales. La section active est indiquée par un indicateur bleu au-dessus de l'icône.

Deux boutons flottants sont disponibles sur toutes les pages :
- **🤖 Copilote IA** (gauche, en haut) — ouvre l'assistant IA
- **🔍 Recherche** (gauche, en bas) — recherche globale

---

## 4. Dashboard — Vue quotidienne

**Accès** : Icône Accueil · Route `/dashboard`

Le Dashboard est le point d'entrée quotidien. Il affiche l'état du pipeline en temps réel.

### Banneau IA Proactive

En haut de page, le banneau IA génère automatiquement :
- Un **titre d'action** (ex : "Fenêtre d'opportunité ouverte")
- Une **prévision** sur la semaine (prospects à contacter, RDV probables)
- **3 actions prioritaires** à effectuer aujourd'hui

### KPI principaux (4 chiffres clés)

| Métrique | Description |
|----------|-------------|
| Établissements ciblés | Total des prospects dans le pipeline |
| Prospects très chaud | Avec niveau "Très chaud" (score BANT ≥ 8.5) |
| Score BANT moyen | Qualité moyenne du pipeline (/10) |
| Actions urgentes | Alertes et relances à traiter aujourd'hui |

### Contact du Jour

La recommandation IA prioritaire du jour : prospect + confiance (%), action conseillée, timing. Utilisez les boutons **Mode Décision** pour lancer directement un appel, un email ou ouvrir la fiche.

### File d'action

Liste des prospects dont la date de relance est aujourd'hui ou dépassée, triés par score BANT décroissant. Cliquez sur un prospect pour ouvrir sa fiche complète.

### Alertes et échéances

- **Alertes critiques** : prospects sans contact depuis trop longtemps, scores en baisse, deadlines approchantes
- **Échéances à venir** : actions planifiées dans les 7 prochains jours

---

## 5. Cockpit Dirigeant

**Accès** : Icône Cockpit · Route `/cockpit`

Vue synthétique pour le pilotage stratégique.

### Résumé exécutif IA

Généré automatiquement à partir des données temps réel :
- **Headline** : diagnostic de l'état du pipeline
- **Subline** : détail et contexte
- **Prévision** : estimation de conversions sur la période
- **3-4 actions** à prioriser cette semaine

### Santé des campagnes

Pour chaque campagne active, un score de santé (/100) est calculé à partir de :
- Taux de prospects "Très chaud"
- Score BANT moyen
- Jours restants avant deadline
- Statut de la campagne

**Niveaux** : Excellent (≥80) · Bon (60-79) · À surveiller (40-59) · Critique (<40)

### Recommandations IA

Les 3 prospects les plus prioritaires avec :
- **Niveau d'urgence** (badge coloré)
- **Confiance** en pourcentage
- **Raisons** de la recommandation (BANT, niveau, priorité)
- **Impact timing** : action aujourd'hui vs J+3

### Risques détectés

5 signaux de risque analysés en permanence :
- Taux de contact pipeline
- Score BANT moyen
- Alertes actives
- Échéances urgentes
- Diversification des segments

Chaque signal est **vert** (ok), **orange** (warning) ou **rouge** (critical).

---

## 6. Campagnes

**Accès** : Icône Campagnes · Route `/campagnes`

### Voir les campagnes

Chaque carte affiche :
- **Nom** et périmètre géographique
- **3 KPI** : cibles (total prospects), très chaud, score /10
- **Deadline** et countdown J-X
- **Avancement** (%) avec barre de progression
- **Santé campagne** : Excellent / Bon / À surveiller / Critique

### Changer le statut d'une campagne

Cliquez sur le sélecteur de statut en haut à droite de la carte (Actif / En cours / Terminé / Archivé).

### Ajouter une campagne

Cliquez sur **+ Nouvelle campagne** en haut de la page.

### Section Livrables

La section Livrables affiche les étapes de production de la campagne active :

| Icône | Statut |
|-------|--------|
| ✓ | Validé |
| ⟳ | En cours |
| ⚠ | À renforcer |
| ○ | À rédiger |

La barre **Avancement XX%** indique le taux de complétion global.

### Section "À renforcer" (desktop)

Bloc d'alertes identifiant les lacunes de la campagne (analytics manquants, contacts sans interlocuteur nominatif, vagues non planifiées).

### Gauge de conformité (desktop)

Indicateur visuel en demi-cercle du taux de conformité global (livrables produits, contacts identifiés, planning complet).

---

## 7. Qualification BANT

**Accès** : Icône Prospects · Route `/qualification`

La qualification BANT évalue chaque prospect selon 4 critères (chacun noté sur 2,5 points, total /10) :

| Critère | Description |
|---------|-------------|
| **B**udget | Capacité financière de l'établissement |
| **A**utorité | Accès au décideur (responsable examens) |
| **B**esoin | Alignement avec l'offre SPC |
| **T**iming | Urgence et maturité du projet |

### Hero Prospect (prospect prioritaire)

La fiche du prospect n°1 (Priorité A, Vague 1) s'affiche en avant :

- **Cercle BANT** : score total /10 avec barre circulaire
- **Grille 2×2** : sous-scores Budget / Autorité / Besoin / Timing
  - Si renseignés en base : score affiché en teal
  - Si non renseignés : "—" avec message "à compléter dans la fiche prospect"
- **Mode Décision IA** : 4 boutons d'action rapide

### Mode Décision IA

| Bouton | Action |
|--------|--------|
| 📞 Appel | Ouvre le Copilote avec script d'appel pré-rempli |
| 📧 Email | Génère un email de prospection personnalisé |
| 💼 LinkedIn | Prépare un message LinkedIn |
| 📅 RDV | Propose un créneau d'audit gratuit 30 min |

### Lancer le script d'appel

Le bouton **"Lancer le script d'appel →"** ouvre le Copilote IA avec un script personnalisé intégrant le nom, segment, score BANT, statut et canal recommandé du prospect.

### Fiche Prospect (Drawer)

Cliquez sur un prospect pour ouvrir sa fiche complète :

- **En-tête** : nom, segment, cluster, niveau, score BANT, complétude
- **Informations de contact** : téléphone, nom du contact, fonction
- **Qualification commerciale** : valeur potentielle, prochaine relance, nb étudiants, sessions/an
- **Notes** : champ libre
- **Timeline d'interactions** : historique des échanges (format journal)
- **Navigation** : flèches ← → pour passer d'un prospect à l'autre

Pour sauvegarder : cliquez sur **Enregistrer**.

### Table des prospects (desktop)

Tableau filtrable avec colonnes : nom, segment, cluster, niveau, score BANT, statut, canal, actions.

**Filtrer** : utilisez les menus déroulants en haut du tableau (segment, niveau, statut).

### Ajouter un prospect

Cliquez sur **+ Ajouter un prospect** → renseignez nom, segment, cluster, score BANT, niveau, priorité et campagne.

---

## 8. Planning

**Accès** : Icône Planning · Route `/planning`

Calendrier opérationnel des actions à mener.

### Groupes temporels

Les échéances sont automatiquement groupées par slot :

| Slot | Couleur |
|------|---------|
| Aujourd'hui | Rouge |
| Demain | Orange |
| Cette semaine | Bleu |
| Semaine prochaine | Teal |
| Plus tard | Gris |
| Passé | Gris désaturé |

Chaque slot affiche un **conseil IA contextuel** en italique (ex : "3 prospects en pic d'activité — fenêtre idéale").

### Échéances URGENT

Les échéances critiques sont marquées d'un badge **URGENT** rouge.

### Ajouter une échéance

Cliquez sur **+ Ajouter échéance** en haut de la page.

### Modifier / Supprimer

Cliquez sur le menu **⋯** à droite de l'échéance → Modifier ou Supprimer.

---

## 9. Reporting

**Accès** : Icône Reporting · Route `/reporting`

Tableau de bord analytique de la performance commerciale.

### KPI de performance

- **Total prospects** : volume global du pipeline
- **Très chaud** : pourcentage de prospects à fort potentiel
- **Score BANT moyen** : qualité du pipeline (/10)
- **RDV fixés** : prospects en discussion avancée

### Répartition par segments

Donut chart affichant la distribution des prospects par segment (Commerce, Santé, CPGE, etc.) avec légende colorée et compteurs.

### Statuts du pipeline

Barre empilée visualisant la progression des prospects : Non contacté → En cours → RDV fixé → Converti.

### Scores BANT par cluster géographique

Barres comparatives des scores moyens par cluster (Paris IDF, Lyon/RA, Lille/HdF, etc.).

### Livrables de campagne

Progression des livrables de la campagne active avec statut par étape.

---

## 10. Livrables

**Accès** : Icône Livrables · Route `/livrables`

Suivi des livrables de production commerciale (briefs, contenus, decks, scripts, emails).

### Statuts disponibles

| Statut | Description |
|--------|-------------|
| ✓ Validé | Livrable approuvé et finalisé |
| ⟳ En cours | Production en cours |
| ⚠ À renforcer | Nécessite des modifications |
| ○ À rédiger | Pas encore commencé |

### Changer un statut

Cliquez sur le menu déroulant dans la colonne **Statut** du tableau.

### Ouvrir un fichier

Si un fichier est attaché, cliquez sur **Ouvrir →** pour le consulter.

---

## 11. Paramètres

**Accès** : Icône Réglages · Route `/parametres`

### Compte utilisateur

- **Email** : adresse de connexion (non modifiable)
- **Nom d'affichage** : prénom affiché dans l'application

### Notifications

Activez ou désactivez les notifications pour :
- Alertes critiques pipeline
- Rappels de relance quotidiens
- Nouvelles échéances urgentes
- Rapport hebdomadaire

**Sur mobile (PWA)** : autorisez les notifications push pour recevoir les alertes directement sur votre téléphone.

### Campagne active

Informations de la campagne en cours : nom, deadline, nombre de prospects, score BANT cible.

### Équipe

Liste des membres actifs avec leurs rôles. Ajoutez des collaborateurs via **+ Ajouter un membre**.

### Intégrations

Statut des connexions aux services externes (Supabase, Claude IA, Analytics).

---

## 12. Copilote IA

Le **Copilote IA** est un assistant commercial alimenté par Claude (Anthropic). Il est accessible depuis toutes les pages.

### Ouvrir le Copilote

- **Desktop** : cliquez sur le bouton 🤖 en bas à droite
- **Mobile** : cliquez sur le bouton 🤖 en bas à gauche
- **Depuis une page** : certains boutons ouvrent le Copilote avec un contexte pré-rempli (script d'appel, méthode BANT, alertes du jour, aide)

### Fonctionnalités

Le Copilote connaît en temps réel :
- Le nombre de prospects et leurs statuts
- Les campagnes actives
- Le score BANT moyen
- Les prospects "Très chaud"
- La date du jour

**Il peut vous aider à :**

| Demande | Exemple |
|---------|---------|
| Analyser le pipeline | "Quels sont mes prospects prioritaires cette semaine ?" |
| Prioriser | "Quel prospect dois-je appeler en premier aujourd'hui ?" |
| Rédiger | "Génère un email pour IFSI CHU Lyon, segment Santé" |
| Expliquer | "Explique-moi la méthode BANT" |
| Alertes | "Quelles sont mes actions urgentes du jour ?" |
| Script | "Prépare un script d'appel pour EM Lyon, score BANT 9/10" |
| Simuler | "Et si j'ajoute 5 prospects Commerce ? Quel impact ?" |

### Suggestions rapides

4 boutons de suggestions sont disponibles à l'ouverture :
1. Pipeline de la semaine
2. Alertes et priorités
3. Recommandation d'action
4. Score BANT et analyses

### Effacer la conversation

Cliquez sur **Effacer** en haut à droite du drawer pour repartir de zéro.

### Limites

- Réponses en français, max 200 mots par message
- Le Copilote ne modifie pas directement les données — il conseille, vous agissez

---

## 13. Application mobile (PWA)

SPC Cockpit est installable sur iOS et Android comme une application native.

### Installer sur iPhone / iPad

1. Ouvrez **cockpit.vercel.app** dans Safari
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Sélectionnez **Sur l'écran d'accueil**
4. Confirmez avec **Ajouter**

L'application apparaît sur votre écran d'accueil avec l'icône SPC.

### Installer sur Android

1. Ouvrez **cockpit.vercel.app** dans Chrome
2. Appuyez sur le menu **⋮** → **Ajouter à l'écran d'accueil**
3. Confirmez

### Fonctionnalités mobiles spécifiques

- **Pull-to-refresh** : tirez vers le bas pour actualiser les données
- **Notifications push** : activez-les dans Paramètres pour recevoir les alertes
- **Navigation par swipe** : glissez entre les fiches prospects
- **Mode hors ligne** : les données récentes restent consultables sans connexion

### Notifications push

Une notification push est envoyée chaque matin (lundi–vendredi) avec :
- Le nombre d'actions urgentes du jour
- Les prospects prioritaires à contacter

---

## 14. Glossaire

| Terme | Définition |
|-------|-----------|
| **BANT** | Budget · Autorité · Besoin · Timing — méthode de qualification prospect |
| **Cluster** | Zone géographique de prospection (Paris IDF, Lyon/RA, Lille/HdF…) |
| **Segment** | Type d'établissement (Commerce, Santé, CPGE, Université, CFA…) |
| **Niveau** | Chaleur du prospect : Très chaud / Chaud / Tiède / Froid |
| **Priorité** | A (stratégique) / B (fort potentiel) / C (à qualifier) |
| **Vague** | Séquence de prospection (Vague 1 = premiers contacts, Vague 2 = relance) |
| **Score BANT** | Note /10 calculée à partir des 4 sous-scores (2,5 pts chacun) |
| **Health Score** | Score de santé d'une campagne /100 (calculé par le moteur IA) |
| **SDR** | Sales Development Representative — en charge de la prospection |
| **RDV fixé** | Rendez-vous ou audit gratuit 30 min planifié avec le prospect |
| **Converti** | Prospect ayant signé un contrat SPC |
| **Tiers-temps** | Aménagement d'examen pour étudiants à besoins particuliers (PMR, RQTH…) |
| **PWA** | Progressive Web App — application web installable sur mobile |
| **Copilote** | Assistant IA intégré alimenté par Claude (Anthropic) |

---

*Guide rédigé pour SPC Cockpit v1.0 — Juin 2026*  
*Pour toute question : jeanmarcclio@gmail.com*
