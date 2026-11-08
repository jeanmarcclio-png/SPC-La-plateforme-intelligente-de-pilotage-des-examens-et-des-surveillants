import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const CONFIG_MANQUANTE =
  "Configuration Supabase manquante. Renseigner NEXT_PUBLIC_SUPABASE_URL et " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir .env.example), puis relancer npm run dev.";

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Bypass d'authentification RÉSERVÉ AUX TESTS E2E (Playwright). Actif seulement
  // si SPC_E2E=1 — variable jamais définie en production ni sur Vercel. Permet de
  // piloter les écrans avec les données de démonstration (mock-fallback) sans
  // session Supabase. N'affecte en rien le déploiement réel.
  if (process.env.SPC_E2E === "1") return res;

  // Configuration absente : aucune session ne peut être vérifiée. On répond
  // 503 avec un message explicite — jamais un accès ouvert, jamais un crash 500.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const { pathname } = req.nextUrl;
    if (pathname === "/offline" || pathname === "/confidentialite") return res;
    return new NextResponse(CONFIG_MANQUANTE, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
