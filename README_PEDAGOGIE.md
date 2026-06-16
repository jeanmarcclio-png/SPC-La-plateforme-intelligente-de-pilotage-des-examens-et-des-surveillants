# Guide pédagogique — Comprendre la plateforme multi-agent SPC

> Ce guide explique, en clair, comment fonctionne ce système. Pas de jargon.
> Si tu lis ceci, tu es en train d'apprendre à maîtriser les sous-agents Claude Code.

---

## 1. Qu'est-ce qu'un sous-agent Claude Code ?

Un **sous-agent** est une instance de Claude avec :
- **Son propre prompt système** (sa mission, ses règles, ses interdits)
- **Son propre modèle** (Opus pour la réflexion lourde, Haiku pour les tâches rapides)
- **Sa propre liste d'outils** (il ne peut utiliser QUE ce qu'on lui autorise)

Concrètement, un sous-agent est défini par **un fichier `.md`** dans `.claude/agents/`.
Quand Claude Code démarre, il scanne ce dossier et charge toutes les définitions.

### Format d'un fichier agent

```markdown
---
name: mon-agent
description: Quand invoquer cet agent (texte utilisé pour le routing automatique)
model: claude-opus-4-8
tools:
  - Read
  - Write
---

Ici, le prompt système de l'agent.
Ce texte sera injecté comme contexte de départ à chaque invocation.
```

**Le champ `description`** est crucial : c'est ce que Claude Code lit pour décider
quel agent appeler automatiquement quand tu décris ta demande. Plus il est précis,
moins il y a d'ambiguïté dans le routing.

---

## 2. À quoi sert le champ `tools` ?

Le champ `tools` est la **liste des outils auxquels l'agent a accès**. Si un outil
n'est pas dans cette liste, l'agent ne peut pas l'utiliser — même s'il essaie.

C'est le **principe du moindre privilège** appliqué aux agents IA :
- Un agent qui écrit des fichiers n'a besoin que de `Read` et `Write`.
- Un agent qui orchestre a besoin de `Task` (pour spawner des sous-agents).
- Un agent qui cherche sur le web a besoin de `WebSearch`.

**Exemple de la plateforme SPC :**

| Agent         | Outils autorisés       | Raison                                          |
|---------------|------------------------|--------------------------------------------------|
| orchestrateur | Task, Read, Glob       | Doit spawner des agents, lire l'état des dossiers|
| strategeue    | Read, Write            | Lit brand.md, écrit dans briefs/                |
| designer      | Read, Write            | Lit brief+contenu, écrit dans prompts-images/   |
| analyste      | Read, Write            | Lit données fournies, écrit dans analytics/     |

**Pourquoi restreindre ?** Pour éviter qu'un agent ne prenne des actions hors de son périmètre.
Le Designer n'a pas besoin de `Bash` ou de `WebSearch`. Le lui donner serait du bruit — et
un risque si le prompt dérive.

---

## 3. Comment une slash command appelle un agent ?

Une **slash command** est un fichier `.md` dans `.claude/commands/`.
Le nom du fichier (sans `.md`) devient la commande : `brief.md` → `/brief`.

Quand tu tapes `/brief lancement SPC`, Claude Code :
1. Lit le fichier `commands/brief.md`
2. Utilise son contenu comme **prompt d'instruction**
3. L'injecte dans la conversation avec tes paramètres

Le fichier `brief.md` dit : *"Invoque l'agent `strategeue` pour produire un brief..."*
Claude Code sait donc quel agent appeler, avec quel comportement attendu.

**La slash command n'est pas un agent** — c'est une **recette d'orchestration**.
Elle dit QUOI faire, pas COMMENT. Le COMMENT est dans le fichier agent.

---

## 4. Pourquoi l'orchestrateur ne produit pas de contenu ?

Principe fondamental de ce système : **chaque livrable a un auteur unique et traçable**.

Si l'orchestrateur produisait du contenu, tu ne saurais pas :
- Quel agent a appliqué quels frameworks
- Quelle version du modèle a fait quel choix
- Où ré-intervenir si le livrable est mauvais

En lisant le frontmatter YAML d'un fichier (`agent: strategeue`), tu sais **exactement
qui a produit quoi**. La chaîne est auditable de bout en bout.

L'orchestrateur fait trois choses seulement :
1. **Analyser** la demande et lire l'état courant des dossiers
2. **Router** vers les bons agents dans le bon ordre
3. **Consolider** un rapport de ce qui a été produit

Si tu trouves du contenu marketing dans la sortie de l'orchestrateur, c'est un bug.

---

## 5. Comment ajouter un 6e agent toi-même ?

**3 étapes, 10 minutes :**

### Étape 1 — Créer le fichier agent

Crée `.claude/agents/mon-nouvel-agent.md` :

```markdown
---
name: mon-nouvel-agent
description: Décris précisément quand cet agent doit être invoqué (une phrase).
model: claude-sonnet-4-6
tools:
  - Read
  - Write
---

# Mon Nouvel Agent

## Rôle
[Mission en 2-3 phrases. Ce qu'il fait, ce qu'il ne fait PAS.]

## Avant de commencer
1. Lis `brand.md`.
2. Lis les livrables sources dans {dossier-source}/.

## Frameworks / méthodes obligatoires
[Liste des frameworks que cet agent doit appliquer]

## Structure du livrable
[Template du fichier qu'il doit produire, avec frontmatter YAML]

## Règle de livraison
- Fichier : `{dossier-sortie}/YYYY-MM-DD_{campagne}_{type}.md`
- Statut initial : brouillon
```

### Étape 2 — Créer son dossier de sortie

```bash
mkdir mon-dossier-sortie/
```

### Étape 3 — Ajouter la slash command correspondante

Crée `.claude/commands/ma-commande.md` avec les instructions d'invocation.

### Étape 4 (optionnel) — Mettre à jour CLAUDE.md

Ajoute l'agent dans le roster et le dossier dans l'arborescence.

---

## 6. Comment fonctionne la mémoire partagée ?

Ce système n'a **pas d'état en RAM**. Entre deux sessions Claude Code, tout est oublié.

La mémoire, c'est les fichiers. Chaque agent :
1. **Lit** les livrables des agents précédents (son contexte)
2. **Produit** son livrable dans son dossier
3. **Nomme** le fichier avec la convention `YYYY-MM-DD_{campagne}_{type}.md`

Le prochain agent trouve le fichier, le lit, construit dessus. C'est une **chaîne de
transmission documentaire**, pas une conversation entre agents.

C'est pourquoi le frontmatter YAML est obligatoire : sans lui, un agent ne sait pas
si le brief qu'il lit est un brouillon ou un document validé.

---

## 7. Le workflow en pratique (workflow séquentiel)

```
Tu tapes : /campagne lancement-spc "Lancer SPC sur LinkedIn, audience : DRH et
                                     responsables d'examens, objectif : 50 leads"

                    ┌─────────────────────────────────┐
                    │         ORCHESTRATEUR            │
                    │  Analyse · Route · Consolide     │
                    │  Ne produit AUCUN livrable       │
                    └──────────────┬──────────────────┘
                                   │ spawne
                    ┌──────────────▼──────────────────┐
                    │           STRATÈGE               │
                    │  Lit brand.md                    │
                    │  Applique StoryBrand + JTBD      │
                    │  Écrit → briefs/2026-06-15_...md │
                    └──────────────┬──────────────────┘
                                   │
              ⏸️  TOI : tu lis le brief, tu valides
                                   │
                    ┌──────────────▼──────────────────┐
                    │           CRÉATEUR               │
                    │  Lit brand.md + brief validé     │
                    │  Applique AIDA + PAS             │
                    │  Écrit → content/2026-06-15_...  │
                    └──────────────┬──────────────────┘
                                   │ (en parallèle possible)
                    ┌──────────────▼──────────────────┐
                    │           DESIGNER               │
                    │  Lit brand.md + contenu          │
                    │  Produit 8 prompts images        │
                    │  Écrit → prompts-images/...      │
                    └──────────────┬──────────────────┘
                                   │
              ⏸️  TOI : tu valides contenu + visuels
                                   │
                    ┌──────────────▼──────────────────┐
                    │         PRÉSENTATEUR             │
                    │  Lit brief + contenu             │
                    │  Applique SCQA                   │
                    │  Écrit → decks/2026-06-15_...    │
                    └─────────────────────────────────┘

                              J+30 :
                    ┌─────────────────────────────────┐
                    │           ANALYSTE               │
                    │  Tu fournis tes données réelles  │
                    │  Zéro métrique fabriquée         │
                    │  Écrit → analytics/...           │
                    └─────────────────────────────────┘
```

---

## 8. Questions fréquentes

**Q : Pourquoi deux pauses de validation humaine ?**
Le brief est la source de vérité — s'il est faux, tout ce qui suit est faux.
Le contenu déclenche la production des visuels et du deck — mieux vaut valider avant de multiplier.

**Q : Puis-je lancer les agents en parallèle ?**
Non, dans ce système. Le Créateur a besoin du brief validé. Le Designer a besoin du contenu.
Le Présentateur a besoin des deux. La séquence est une contrainte fonctionnelle, pas un choix arbitraire.

**Q : L'Analyste peut-il travailler à J+7 au lieu de J+30 ?**
Oui, avec `/analyse`. Les 30 jours sont une recommandation, pas une contrainte technique.
Mais avec peu de données, le plan d'optimisation sera moins fiable — et l'agent le dira explicitement.

**Q : Que se passe-t-il si brand.md change en cours de campagne ?**
Les livrables déjà produits ne sont pas rétroactivement mis à jour.
Les agents suivants liront la nouvelle version de brand.md. Documente ce changement dans brand.md
avec une note `# Mise à jour {date} :` pour garder l'historique.
