import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Bypass d'authentification RÉSERVÉ AUX TESTS E2E (Playwright). Actif seulement
  // si SPC_E2E=1 — variable jamais définie en production ni sur Vercel. Permet de
  // piloter les écrans avec les données de démonstration (mock-fallback) sans
  // session Supabase. N'affecte en rien le déploiement réel.
  if (process.env.SPC_E2E === "1") return res;

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
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
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
