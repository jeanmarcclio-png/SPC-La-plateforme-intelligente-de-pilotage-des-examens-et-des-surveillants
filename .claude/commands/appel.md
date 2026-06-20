---
description: Préparer un script d'appel téléphonique pour contacter les directions des examens et proposer un RDV
argument-hint: <nom-campagne>
---

# /appel — Script d'appel téléphonique SPC

Invoque l'agent `appel` pour la campagne `$ARGUMENTS`.

Prérequis : `prospects/{date}_{campagne}_qualification.md` doit exister.

1. Lire brand.md
2. Lire la qualification
3. Produire script 5 phases (identification → accroche → qualification → objections → RDV)
4. Adapter par segment (Tier 1, 2, 4)
5. Ajouter fiche récapitulative post-appel
6. Produire `prospects/{date}_{campagne}_script-appel.md`
