# Langage « Centre de pilotage » — référence de design

> Grammaire de design **de référence** du SaaS SPC, validée sur `/dashboard/apercu`
> et extraite dans `@/components/pilot`. Toute nouvelle page ou refonte doit
> adopter ce langage (information design), pas le pattern « carte blanche à filet
> coloré » qui l'a précédé.

## Pourquoi
Le pattern précédent (cartes blanches arrondies + filet coloré + puce d'icône
pleine) est le cliché d'UI générée : joli mais peu informatif, il empile des
aplats et fait porter le sens par la couleur décorative. Le langage pilot
inverse la logique : **la hiérarchie vient de la typo et des filets fins**, la
couleur ne sert qu'au sens.

## Les 6 non-négociables
1. **Chiffres en encre**, `tabular-nums` partout ; police mono pour les
   métriques secondaires (`.num`, `--mono`). Jamais un chiffre clé en couleur
   décorative.
2. **Un seul accent** : le teal de marque (`--brand`). Tout le reste du décor
   est encre/gris (`--ink`, `--ink2`, `--ink3`, `--line`).
3. **La couleur = le sens, jamais la déco** : `--good` (positif), `--warn`
   (attention), `--crit` (critique), `--amber` (énergie/RDV), `--ia` (violet,
   réservé à l'IA). Une pastille rouge veut dire « critique », pas « joli ».
4. **Zéro carte à filet coloré**, zéro aplat navy, zéro dégradé décoratif. Les
   séparateurs sont des filets 1px (`--line`). Les seules cartes sont le rail
   (copilote IA + signaux).
5. **Densité assumée** : listes denses à filets, pas des tuiles espacées. Un
   décideur doit lire beaucoup d'un coup d'œil.
6. **Papier chaud + serif d'accent** : fond `--paper`, eyebrow en serif italique
   (`.eyebrow`). C'est la signature qui distingue le produit d'un template.

## Tokens (définis sur `.pilot`)
| Token | Rôle |
|-------|------|
| `--paper` / `--surface` | fond page / fond carte |
| `--ink` / `--ink2` / `--ink3` | texte principal / secondaire / tertiaire |
| `--line` / `--line2` | filet / filet plus clair |
| `--brand` / `--brand2` | teal de marque (accent unique) |
| `--amber` | énergie (RDV, tendance douce) |
| `--good` / `--warn` / `--crit` | sémantique positif / attention / critique |
| `--ia` | violet — **exclusivement** l'IA (copilote, prévisions) |
| `--mono` / `--serif` | métriques secondaires / eyebrow |

## Primitives (`@/components/pilot`)
Server-component safe (aucun hook). CSS injecté une fois par `<PilotStyles/>`.

- `PilotMain` — conteneur de page (`<main class="pilot"> + styles + .wrap`).
- `PilotStyles` — injecte le CSS `.pilot` (id unique, pas de doublon).
- `SectionHead` — titre de section + lien « voir tout ».
- `Pill` — pastille d'état, prop `tone` (`hot|warm|rdv|brand|neutral`).
- `ScoreBar` — barre de score compacte + valeur mono.
- `SignalRow` — ligne de signal (alerte / échéance) pour le rail.
- `fr1(n)` — nombre à 1 décimale à la française (virgule).

Classes composables directement disponibles sur `.pilot` : `.phead`, `.hero`,
`.metric`, `.trend`, `.story`, `.mini`, `.chart`/`.line`/`.area`, `.funnel`/
`.track`/`.keys`, `.grid2`, `.block`, `.row`, `.camp`, `.card`/`.rec`/`.sig`,
`.foot`. Voir le CSS source dans `components/pilot/index.tsx`.

## Squelette de page type
```tsx
import { PilotMain, SectionHead, Pill, ScoreBar, SignalRow, fr1 } from "@/components/pilot";

export default async function MaPage() {
  const data = await getData();
  return (
    <PilotMain>
      <header className="phead">
        <div>
          <div className="eyebrow">Contexte de la page</div>
          <h1>Titre</h1>
          <div className="sub">sous-titre / date</div>
        </div>
      </header>
      {/* sections composées avec .row / .camp / .card … */}
    </PilotMain>
  );
}
```

## Déploiement (généralisation)
Référence établie sur `/dashboard/apercu`. Rollout **page par page**, chaque
page revue en preview avant merge, en préservant les fonctionnalités existantes
(pas de suppression de features au nom du design). Ordre proposé :
`dashboard → reporting → cockpit → campagnes/qualification/livrables → paramètres`,
puis alignement des pages Opérations sur les mêmes tokens sémantiques.

## Rappel couleur (aligné brand.md / grammaire existante)
- **teal** = marque (accent unique) · **vert/ambre/rouge** = sémantique
- **violet** = IA uniquement · **chiffres en encre** · **zéro aplat navy**
