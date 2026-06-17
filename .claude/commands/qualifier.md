---
description: Qualifier les prospects SPC selon le volume d'examens, les besoins tiers-temps et la maturité à l'externalisation
argument-hint: <nom-campagne>
---

# /qualifier — Qualification commerciale SPC

Invoque l'agent `qualification` pour la campagne `$ARGUMENTS`.

Prérequis : `prospects/{date}_{campagne}_ciblage.md` doit exister.

1. Lire brand.md
2. Lire le fichier de ciblage
3. Appliquer grille BANT adaptée SPC
4. Attribuer score 0-10 et niveau Froid/Tiède/Chaud/Très chaud
5. Définir la prochaine action pour chaque prospect
6. Produire `prospects/{date}_{campagne}_qualification.md`
