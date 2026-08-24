import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { demoActif } from "@/lib/operations/source";
import { clientDemo } from "@/lib/demo/client-demo";

/**
 * Client réel. Isolé dans sa propre fonction pour une raison de TYPAGE, pas de
 * lisibilité : `createClient` ci-dessous doit garder EXACTEMENT le type que
 * TypeScript inférait avant l'ajout du mode démonstration. Une annotation
 * écrite à la main (`ReturnType<typeof createServerClient>`) résout les
 * génériques à leurs valeurs par défaut, ce qui dégrade les types en aval —
 * jusqu'à faire échouer la compilation d'écrans sans rapport, sur un paramètre
 * de rappel devenu implicitement `any`.
 */
async function clientReel() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

type ClientSupabase = Awaited<ReturnType<typeof clientReel>>;

export async function createClient(): Promise<ClientSupabase> {
  // MODE DÉMONSTRATION (SPC_DEMO=1) — aucune instance Supabase requise.
  //
  // Ce court-circuit est en TÊTE, avant `cookies()` et avant toute lecture des
  // variables d'environnement : sans lui, les deux assertions `!` de
  // `clientReel` font lever `createServerClient`, et l'écran rend une 500.
  // C'est ce qui empêchait jusqu'ici de déployer une démonstration autonome.
  //
  // La conversion de type est assumée : le client de démonstration n'implémente
  // que la surface réellement utilisée dans ce dépôt (`from`, `rpc`, `auth`).
  // La concentrer ici évite de la disséminer chez les 33 appelants — voir
  // lib/demo/client-demo.ts pour les invariants tenus.
  if (demoActif()) {
    return clientDemo() as unknown as ClientSupabase;
  }
  return clientReel();
}
