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

## Les quatre projets Vercel branchés sur ce dépôt

| Projet | *Root Directory* | Ce qu'il déploie |
|---|---|---|
| `spc-cockpit` | `spc-cockpit` | l'application |
| `spc-la-plateforme-…` | `spc-cockpit` | l'application — doublon du précédent (créé par v0) |
| `spc-la-plateforme-…-aywb` | *(vide)* | **la racine — donc cette page** |
| `spc-saas` | *(vide)* | **la racine — donc cette page** |

Quatre projets pour une seule application, dont deux qui construisent la même
chose à chaque commit.

## Ce qui reste à faire côté Vercel, et que le dépôt ne peut pas faire

Ce correctif rend le déploiement **vert**, il ne rend pas la configuration
**juste**. Dans le tableau de bord :

1. **`spc-saas`** — régler son *Root Directory* sur `spc-cockpit` s'il doit
   servir l'application, ou supprimer le projet s'il fait doublon.
2. **`spc-la-plateforme-…`** — pointe déjà sur `spc-cockpit`, comme
   `spc-cockpit` lui-même. L'un des deux est redondant.
3. **`spc-la-plateforme-…-aywb`** — vise la racine, sans raison apparente.

Avant toute suppression : vérifier **Settings → Domains** du projet concerné.
Un projet qui ne porte que son domaine `*.vercel.app` automatique n'est utilisé
par personne ; un projet qui porte un domaine communiqué à un tiers ne se
supprime pas sans l'avoir basculé d'abord.

### ⚠️ Ne pas supprimer ce dossier trop vite

Tant qu'**un seul** projet vise la racine, le `vercel.json` racine et ce dossier
restent nécessaires — sans eux, ce projet retente un `next build` là où il n'y a
pas d'application, et repasse au rouge.

Le tableau ci-dessus est donc à relire avant tout ménage : corriger `spc-saas`
ne suffit pas à rendre ce dossier inutile, puisque `…-aywb` vise toujours la
racine. Ce dossier ne peut disparaître que lorsque **plus aucun** projet n'a un
*Root Directory* vide.

### ⚠️ À vérifier avant de fusionner sur `main`

Sur une branche, Vercel ne produit que des déploiements de *prévisualisation*.
Une fois sur `main`, un déploiement réussi devient la production du projet : si
un domaine d'un projet visant la racine est encore utilisé par quelqu'un, il
servira cette page d'information à la place de son contenu actuel.

### Si vous réglez un projet sur `spc-cockpit`

Il construira alors la vraie application, et lui faudra **les mêmes variables
d'environnement** que `spc-cockpit` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, et `SUPABASE_SERVICE_ROLE_KEY` en production).
Sans elles, la construction peut réussir mais l'application échouera à
l'exécution — voir `spc-cockpit/supabase/mise-en-place/PREMIER-COMPTE.md`.
