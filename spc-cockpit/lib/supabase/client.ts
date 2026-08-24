import { createBrowserClient } from "@supabase/ssr";
import { clientDemo } from "@/lib/demo/client-demo";

function clientReel(url: string, cle: string) {
  return createBrowserClient(url, cle);
}

type ClientNavigateur = ReturnType<typeof clientReel>;

/**
 * Client Supabase côté navigateur.
 *
 * DÉGRADATION PLUTÔT QU'EXCEPTION
 * -------------------------------
 * Sans URL ni clé, `createBrowserClient` LÈVE. Comme il est appelé pendant le
 * rendu de composants clients (`RealtimeRefresh`, `Topbar`, `Sidebar`), cette
 * exception ne tombait pas dans un coin de l'interface : elle emportait l'écran
 * entier en 500.
 *
 * On retourne donc un client inerte. La condition n'est volontairement PAS
 * « mode démonstration » mais « aucune instance configurée » : `SPC_DEMO` est
 * une variable serveur, invisible du navigateur, et il aurait fallu en exiger
 * une seconde préfixée NEXT_PUBLIC_ — donc une occasion de plus de n'en régler
 * qu'une et d'obtenir une démonstration à moitié cassée.
 *
 * CE N'EST PAS UN REPLI SILENCIEUX
 * --------------------------------
 * Le client inerte ne simule aucun succès : toute opération d'authentification
 * répond une erreur portant le code `SPC_DEMO`, que `diagnostiquerErreurAuth`
 * classe explicitement en « problème de configuration » et affiche en ambre. Un
 * hébergement dont on aurait oublié les variables reste donc visible comme tel,
 * au lieu d'accuser le mot de passe de l'utilisateur (BUG-002).
 */
export function createClient(): ClientNavigateur {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) {
    return clientDemo() as unknown as ClientNavigateur;
  }
  return clientReel(url, cle);
}
