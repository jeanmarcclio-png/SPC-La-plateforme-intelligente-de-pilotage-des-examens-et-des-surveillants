# SPC — Plateforme Multi-Agent de Contenu

## Rôle de ce fichier
Ce fichier est le contrat du projet. Claude Code le lit automatiquement à chaque
session. Il définit les règles, l'arborescence et le roster des agents.
Ne jamais modifier ce fichier sans mettre à jour le roster et les conventions.

---

## Arborescence

```
.claude/agents/       → définitions des sous-agents (lu au démarrage par Claude Code)
.claude/commands/     → slash commands (/brief /post /visuel /analyse /deck /campagne)
briefs/               → livrables du Stratège (brief de positionnement)
content/              → livrables du Créateur (posts LinkedIn, scripts vidéo)
prompts-images/       → livrables du Designer (prompts prêts à l'emploi)
analytics/            → livrables de l'Analyste (rapports + plans 30j)
decks/                → livrables du Présentateur (decks slide-par-slide)
brand.md              → garde-fou transverse (ton, vocabulaire banni, palette)
```

---

## Roster des agents

| Agent         | Fichier agent                     | Modèle                   | Dossier sortie  |
|---------------|-----------------------------------|--------------------------|-----------------|
| orchestrateur | .claude/agents/orchestrateur.md   | claude-sonnet-4-6        | (routing seul)  |
| strategeue    | .claude/agents/strategeue.md      | claude-opus-4-8          | briefs/         |
| createur      | .claude/agents/createur.md        | claude-sonnet-4-6        | content/        |
| designer      | .claude/agents/designer.md        | claude-haiku-4-5-20251001| prompts-images/ |
| analyste      | .claude/agents/analyste.md        | claude-opus-4-8          | analytics/      |
| presentateur  | .claude/agents/presentateur.md    | claude-sonnet-4-6        | decks/          |

---

## Règles transverses (non négociables)

1. **L'orchestrateur NE PRODUIT JAMAIS un livrable.** Il analyse la demande, route vers
   les agents dans l'ordre, et consolide un résumé final. Chaque fichier a un auteur unique.

2. **Frontmatter YAML obligatoire** en tête de chaque livrable :
   ```yaml
   ---
   projet: SPC
   campagne: <nom-campagne>
   agent: <nom-agent>
   date: <YYYY-MM-DD>
   version: "1.0"
   statut: brouillon | validé | archivé
   ---
   ```

3. **Chaque agent lit `brand.md` AVANT de produire.** Une violation (ton, vocab banni,
   palette) est bloquante : l'agent re-produit, ne livre pas.

4. **Workflow séquentiel** (jamais parallèle sans validation) :
   `brief → contenu → visuels → deck` puis `analytics à J+30`

5. **Validation humaine aux étapes critiques** : après le brief et avant le deck.

6. **Pas d'état en RAM.** La mémoire du système = les fichiers dans les dossiers de sortie.
   Chaque agent commence par lire les livrables précédents avant d'écrire le sien.

---

## Convention de nommage des fichiers

```
{YYYY-MM-DD}_{nom-campagne}_{type}.md
```

Exemples :
- `briefs/2026-06-15_lancement-spc_brief.md`
- `content/2026-06-15_lancement-spc_post-linkedin.md`
- `prompts-images/2026-06-15_lancement-spc_prompt-carre.md`
- `analytics/2026-06-15_lancement-spc_rapport-j30.md`
- `decks/2026-06-15_lancement-spc_deck.md`

---

## Modèles disponibles et leur usage

| Modèle                    | Usage recommandé                                      |
|---------------------------|-------------------------------------------------------|
| `claude-opus-4-8`         | Raisonnement lourd : stratégie, analyse de données    |
| `claude-sonnet-4-6`       | Production équilibrée : copy, orchestration, deck     |
| `claude-haiku-4-5-20251001` | Production rapide : prompts images, tâches répétitives |
