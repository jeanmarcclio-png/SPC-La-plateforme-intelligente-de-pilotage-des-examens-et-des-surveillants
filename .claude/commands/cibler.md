---
description: Identifier et segmenter les établissements post-bac à fort potentiel pour SPC
argument-hint: <nom-campagne>
---

# /cibler — Ciblage commercial SPC

Invoque l'agent `ciblage-commercial` pour la campagne `$ARGUMENTS`.

1. Lire brand.md
2. Segmenter par Tier (1=business schools, 2=universités, 3=grandes écoles, 4=CFA/RNCP)
3. Attribuer priorité A/B/C à chaque cible
4. Identifier l'interlocuteur probable
5. Exclure lycées, collèges, rectorats
6. Produire `prospects/{date}_{campagne}_ciblage.md`
