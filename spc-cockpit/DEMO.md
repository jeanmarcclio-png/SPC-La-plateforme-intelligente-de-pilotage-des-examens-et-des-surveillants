# Instance de démonstration

Une instance publique de Survéo, **sans base de données, sans compte et sans
connexion**, destinée à être montrée à un prospect ou laissée en accès libre
depuis un site vitrine.

Ce n'est pas une maquette : c'est l'application réelle, avec ses écrans réels et
ses calculs réels, alimentée par un jeu de données fictif.

---

## 1. Ce qui change, et ce qui ne change pas

| | Instance réelle | Instance de démonstration |
|---|---|---|
| Base de données | Supabase | **aucune** |
| Connexion | mot de passe / lien magique | **aucune** — `/login` renvoie au cockpit |
| Données | votre base | jeu fictif (`lib/operations/mock.ts`) |
| Écritures | enregistrées | **refusées, avec un message explicite** |
| Bandeau jaune | absent | permanent sur chaque écran |
| Narration | absente | panneau d'explications, avec lecture vocale |

La seule variable qui distingue les deux est `SPC_DEMO`.

---

## 2. Déployer la démonstration

Elle doit vivre dans un **projet Vercel distinct**. Ne réglez jamais `SPC_DEMO`
sur le projet qui sert vos vrais utilisateurs : ils verraient des données
fictives sans que rien ne le trahisse côté serveur.

1. Vercel → **Add New → Project** → même dépôt GitHub.
2. **Root Directory** : `spc-cockpit`.
3. **Environment Variables** — une seule, sur tous les environnements :

   ```
   SPC_DEMO = 1
   ```

   **N'ajoutez aucune variable Supabase.** Pas d'URL, pas de clé anonyme, et
   surtout pas `SUPABASE_SERVICE_ROLE_KEY` : une instance publique n'a aucune
   raison de porter un passe-partout de base de données.
4. Déployer, puis **Settings → Domains** → `demo.votre-domaine.fr`.

Un domaine propre n'est pas cosmétique ici : sur `*.vercel.app`, Chrome affiche
un avertissement « Dangereux » hérité du domaine partagé, et vous ne pouvez pas
envoyer à une direction de la scolarité un lien que son navigateur signale.

---

## 3. Vérifier après déploiement

```bash
# Les écrans doivent tous répondre 200 sans aucune variable Supabase
for p in /operations /operations/cockpit /operations/missions \
         /operations/planification /operations/devis /operations/facturation; do
  printf '%-32s ' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' -L "https://demo.votre-domaine.fr$p"
done

# /login ne doit PAS afficher de formulaire
curl -s -o /dev/null -w '%{http_code} → %{redirect_url}\n' \
     "https://demo.votre-domaine.fr/login"     # attendu : 307 → /operations/cockpit
```

À l'écran, trois signes doivent être présents :

1. le bandeau jaune **« Données de démonstration »** en tête de chaque écran ;
2. le panneau **« Démonstration »** en bas à droite, avec un bouton *Écouter* ;
3. toute tentative d'enregistrement répond **« Mode démonstration : cette
   modification n'est pas enregistrée. »**

Si l'un des trois manque, la variable n'a pas été prise en compte — vérifiez
qu'un **redéploiement** a bien eu lieu après son ajout : les variables ne
s'appliquent pas rétroactivement.

---

## 4. La narration

Le panneau commente l'écran courant, étape par étape. Le texte est **toujours
affiché** ; la lecture à voix haute est un confort ajouté par-dessus.

- La voix est celle du **navigateur du visiteur** (`speechSynthesis`) : aucun
  fichier audio, aucun service externe, aucune clé d'API, aucun coût.
- Rien n'est lu sans clic. Aucune lecture automatique.
- Si le navigateur ne propose aucune voix, le panneau l'indique et le texte
  reste intégralement lisible.

**Réserve honnête** : la qualité de la voix française dépend entièrement du
système du visiteur. Elle est bonne sur macOS, iOS et Windows 11, correcte sur
Chrome/Android, et parfois absente sur des Linux de bureau minimalistes. Si
cette variabilité n'est pas acceptable pour un usage commercial, la voie
suivante est d'enregistrer les mêmes textes en fichiers audio et de les servir
depuis `public/` — les textes sont déjà rédigés et découpés dans
`lib/demo/narration.ts`.

### Modifier les textes

Tout est dans `lib/demo/narration.ts`, un script par écran. Les tests de
`lib/demo/__tests__/narration.test.ts` vérifient qu'aucune étape n'est vide et
que le caractère fictif des données est bien annoncé sur les écrans d'entrée.

---

## 5. Comment c'est construit

Un seul point de substitution : `lib/supabase/server.ts` retourne, sous
`SPC_DEMO=1`, un **client de démonstration** (`lib/demo/client-demo.ts`) au lieu
d'un client Supabase. Les gardes d'authentification (`lib/auth/org.ts`,
`lib/auth/session.ts`) n'ont **pas été modifiées** : elles s'exécutent
normalement et obtiennent des réponses cohérentes.

Deux invariants sont tenus par ce client, et couverts par des tests :

1. **Aucun accès réseau.** Rien n'est jamais émis vers un serveur.
2. **Aucune écriture silencieuse.** `insert`, `update`, `upsert`, `delete` et
   les procédures stockées retournent une erreur explicite — jamais un succès
   simulé. Une démonstration qui laisse croire qu'un enregistrement a eu lieu
   est un mensonge coûteux, et c'est exactement le défaut corrigé par l'audit
   sous BUG-002.

Le client navigateur (`lib/supabase/client.ts`) dégrade de la même façon, mais
sur une condition différente : **l'absence d'URL et de clé**, et non le drapeau
de démonstration — `SPC_DEMO` est une variable serveur, invisible du navigateur.
Exiger une seconde variable préfixée `NEXT_PUBLIC_` aurait surtout créé une
occasion de n'en régler qu'une.
