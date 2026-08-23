import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Bypass d'authentification RÉSERVÉ AUX TESTS E2E (Playwright). Actif seulement
  // si SPC_E2E=1 — variable jamais définie en production ni sur Vercel. Permet de
  // piloter les écrans avec les données de démonstration (mock-fallback) sans
  // session Supabase. N'affecte en rien le déploiement réel.
  if (process.env.SPC_E2E === "1") return res;

  // MODE DÉMONSTRATION (SPC_DEMO=1) — instance publique sans base ni compte.
  // Le contrôle de session n'a pas d'objet : il n'y a pas de session à établir,
  // et /login renverrait le visiteur vers un formulaire qu'aucune instance
  // n'honore. On laisse donc passer, exactement comme pour le bypass E2E.
  // Les écritures restent refusées plus bas dans la pile, par le client de
  // démonstration (lib/demo/client-demo.ts) — pas par cette porte.
  if (process.env.SPC_DEMO === "1") {
    // En démonstration il n'y a aucun compte : présenter un formulaire de
    // connexion serait proposer une porte qui ne s'ouvre pas. On envoie donc
    // directement le visiteur sur le cockpit.
    if (req.nextUrl.pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/operations/cockpit", req.url));
    }
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  // Routes publiques : login + callback OAuth/magic link (/auth/*) + offline.
  // Le callback DOIT rester accessible sans session : c'est lui qui l'établit.
  const isPublic =
    isLoginPage ||
    pathname.startsWith("/auth") ||
    pathname === "/offline" ||
    pathname === "/confidentialite";

  if (!user && !isPublic) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icon-192\\.png|icon-512\\.png|api/).*)",
  ],
};
