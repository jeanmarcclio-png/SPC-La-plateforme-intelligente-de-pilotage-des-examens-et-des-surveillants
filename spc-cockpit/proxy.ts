import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  // Bypass des tests bout-en-bout (Playwright). Activé UNIQUEMENT lorsque la
  // variable E2E_AUTH_BYPASS vaut "1", injectée par le serveur de test local
  // (voir playwright.config.ts). Elle n'est JAMAIS définie en production
  // (Vercel) : l'authentification Supabase reste donc pleinement appliquée.
  // Permet de valider le rendu des écrans authentifiés sans backend Supabase.
  if (process.env.E2E_AUTH_BYPASS === "1") {
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
