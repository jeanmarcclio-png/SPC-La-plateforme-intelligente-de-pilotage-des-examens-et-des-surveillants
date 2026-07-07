# SPC — Plateforme Multi-Agent B2B

## Rôle de ce fichier
Ce fichier est le contrat du projet. Claude Code le lit automatiquement à chaque
session. Il définit les règles, l'arborescence et le roster des agents.
Ne jamais modifier ce fichier sans mettre à jour le roster et les conventions.

---

## Contexte métier SPC

SPC est une société spécialisée dans la **surveillance d'examens** pour l'enseignement supérieur :
coordination de surveillants, sécurisation logistique des sessions, gestion des plannings,
présence en salle, tiers-temps, renforts, rapports post-session et appui opérationnel.

**Cible prioritaire** : Business schools, universités, grandes écoles, CFA post-bac,
centres d'examens et concours — principalement Paris, Île-de-France, Paris-Saclay.

**Interlocuteurs visés** : Responsable des examens, direction de la scolarité,
directeur des opérations académiques, responsable concours/admissions, directeur de campus.

---

## Arborescence

\`\`\`
.claude/agents/       → définitions des sous-agents (lu au démarrage)
.claude/commands/     → slash commands
briefs/               → livrables du Stratège
content/              → livrables du Créateur (posts LinkedIn, scripts)
prompts-images/       → livrables du Designer
analytics/            → livrables de l'Analyste
decks/                → livrables du Présentateur
prospects/            → livrables des agents commerciaux (ciblage, emails, scripts)
brand.md              → garde-fou transverse (ton, vocabulaire, palette, cible)
\`\`\`

---

## Roster des agents

### Agents éditoriaux (campagne de contenu)

| Agent | Fichier | Modèle | Dossier sortie |
|-------|---------|--------|----------------|
| orchestrateur | .claude/agents/orchestrateur.md | claude-sonnet-4-6 | (routing) |
| strategeue | .claude/agents/strategeue.md | claude-opus-4-8 | briefs/ |
| createur | .claude/agents/createur.md | claude-sonnet-4-6 | content/ |
| designer | .claude/agents/designer.md | claude-haiku-4-5-20251001 | prompts-images/ |
| analyste | .claude/agents/analyste.md | claude-opus-4-8 | analytics/ |
| presentateur | .claude/agents/presentateur.md | claude-sonnet-4-6 | decks/ |

### Agents produit SaaS (spc-cockpit)

| Agent | Fichier | Modèle | Rôle |
|-------|---------|--------|------|
| audit-saas | .claude/agents/audit-saas.md | claude-opus-4-8 | Audit lecture seule vs Master Prompt / Product Bible |
| dev-saas | .claude/agents/dev-saas.md | claude-sonnet-5 | Implémentation de chantiers scopés (moteur central, shell) |
| qa-saas | .claude/agents/qa-saas.md | claude-sonnet-5 | Tests, build, lint, cas de référence métier |

Workflow SaaS : `audit-saas → dev-saas → qa-saas` puis commit/push par l'orchestrateur.

### Agents commerciaux B2B (prospection)

| Agent | Fichier | Modèle | Dossier sortie |
|-------|---------|--------|----------------|
| ciblage-commercial | .claude/agents/ciblage-commercial.md | claude-opus-4-8 | prospects/ |
| qualification | .claude/agents/qualification.md | claude-sonnet-4-6 | prospects/ |
| prospection-email | .claude/agents/prospection-email.md | claude-sonnet-4-6 | prospects/ |
| linkedin | .claude/agents/linkedin.md | claude-sonnet-4-6 | prospects/ |
| appel | .claude/agents/appel.md | claude-sonnet-4-6 | prospects/ |
| relance | .claude/agents/relance.md | claude-sonnet-4-6 | prospects/ |

---

## Règles transverses (non négociables)

1. **L'orchestrateur NE PRODUIT JAMAIS un livrable.** Il route et consolide uniquement.

2. **Frontmatter YAML obligatoire** en tête de chaque livrable :
   \`\`\`yaml
   ---
   projet: SPC
   campagne: <nom>
   agent: <nom-agent>
   date: <YYYY-MM-DD>
   version: "1.0"
   statut: brouillon | validé | archivé
   ---
   \`\`\`

3. **Chaque agent lit \`brand.md\` AVANT de produire.**
   Violation (ton, vocab banni, mauvaise cible) = re-production obligatoire.

4. **Workflow éditorial séquentiel** :
   \`brief → contenu → visuels → deck\` puis \`analytics à J+30\`

5. **Workflow commercial séquentiel** :
   \`ciblage → qualification → email/LinkedIn/appel → relance\`

6. **Validation humaine aux étapes critiques** : après le brief et avant le deck.

7. **Pas d'état en RAM.** La mémoire = les fichiers dans les dossiers de sortie.

---

## Convention de nommage

\`\`\`
{YYYY-MM-DD}_{nom-campagne}_{type}.md
\`\`\`

Exemples :
- \`briefs/2026-06-17_lancement-spc_brief.md\`
- \`prospects/2026-06-17_lancement-spc_ciblage.md\`
- \`prospects/2026-06-17_lancement-spc_email-prospection.md\`
- \`decks/2026-06-17_lancement-spc_deck.md\`

---

## Slash commands disponibles

### Éditorial
| Commande | Agent invoqué |
|----------|--------------|
| \`/brief\` | Stratège |
| \`/post\` | Créateur |
| \`/visuel\` | Designer |
| \`/deck\` | Présentateur |
| \`/analyse\` | Analyste |
| \`/campagne\` | Orchestrateur (chaîne complète) |

### Commercial B2B
| Commande | Agent invoqué |
|----------|--------------|
| \`/cibler\` | Ciblage commercial |
| \`/qualifier\` | Qualification prospect |
| \`/email\` | Prospection email |
| \`/linkedin\` | Message LinkedIn |
| \`/appel\` | Script d'appel |
| \`/relance\` | Relances J+3/J+7/J+15 |
| \`/prospecter\` | Orchestrateur commercial (chaîne complète) |
