# `deploiement-racine/` — pourquoi ce dossier existe

Ce dossier ne fait pas partie du produit. Il existe pour une seule raison :
donner à Vercel quelque chose de valide à servir quand un projet vise la
**racine** du dépôt.

## Le problème qu'il résout

Quatre projets Vercel sont branchés sur ce dépôt. Deux d'entre eux ont un
*Root Directory* défini sur `spc-cockpit` et se déploient correctement. Les deux
autres visent la racine — où il n'y a **ni `package.json`, ni application**.

L'un des deux (`spc-saas`) échouait donc à chaque commit :

```
Vercel – spc-saas   Deployment has failed
```

Ce rouge n'a jamais rien dit sur la qualité du code. C'était un projet mal
configuré qui tentait de construire une application absente — et un rouge
permanent dans la liste des contrôles finit par masquer les vrais.

## Ce que fait le correctif

Le `vercel.json` à la racine neutralise explicitement la construction et
publie ce dossier :

```json
{ "framework": null, "buildCommand": null, "installCommand": null,
  "outputDirectory": "deploiement-racine" }
```

`framework: null` est la clé : il annule le préréglage du projet, qui est ce
qui déclenchait un `next build` là où il n'y a pas de Next.

`outputDirectory` pointe ici, et **pas** sur `.` : publier la racine
exposerait sur une URL publique l'ensemble du dépôt — audit, briefs, fichiers
de prospection. Ce dossier ne contient qu'une page d'information.

## Ce qui reste à faire côté Vercel, et que le dépôt ne peut pas faire

Ce correctif rend le déploiement **vert**, il ne rend pas la configuration
**juste**. Deux gestes, dans le tableau de bord Vercel :

1. **`spc-saas`** — soit régler son *Root Directory* sur `spc-cockpit` s'il doit
   servir l'application, soit supprimer le projet s'il fait doublon avec
   `spc-cockpit`.
2. **`spc-la-plateforme-…`** — ce projet pointe déjà sur `spc-cockpit`, comme
   `spc-cockpit` lui-même. L'un des deux est redondant.

⚠️ **À vérifier avant de fusionner sur `main`.** Sur une branche, Vercel ne
produit que des déploiements de *prévisualisation*. Une fois sur `main`, un
déploiement réussi devient la production du projet : si un domaine de
`spc-saas` est encore utilisé par quelqu'un, il servira cette page
d'information à la place de son contenu actuel. Traiter le point 1 ci-dessus
avant la fusion lève la question.
