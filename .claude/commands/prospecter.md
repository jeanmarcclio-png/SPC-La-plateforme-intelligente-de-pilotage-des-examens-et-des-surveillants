---
description: Lancer le workflow commercial complet SPC — ciblage → qualification → emails → LinkedIn → appel → relance
argument-hint: <nom-campagne>
---

# /prospecter — Workflow commercial complet SPC

Lance le workflow de prospection B2B complet pour la campagne `$ARGUMENTS`.

## Séquence
1. `ciblage-commercial` → `prospects/{date}_{campagne}_ciblage.md`
   **Validation humaine requise avant étape 2.**
2. `qualification` → `prospects/{date}_{campagne}_qualification.md`
3. `prospection-email` → `prospects/{date}_{campagne}_emails.md`
4. `linkedin` → `prospects/{date}_{campagne}_linkedin.md`
5. `appel` → `prospects/{date}_{campagne}_script-appel.md`
6. `relance` → `prospects/{date}_{campagne}_relances.md`

## Règle absolue
L'orchestrateur NE PRODUIT JAMAIS les livrables lui-même. Il route et consolide.
