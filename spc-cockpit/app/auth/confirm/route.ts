import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { cheminInterneSur, CHEMIN_MOT_DE_PASSE } from "@/lib/auth/collaborateurs";

// Lien d'accès collaborateur (invitation / réinitialisation) : vérifie le jeton
// à usage unique côté serveur, ouvre la session, puis redirige vers l'écran de
// choix du mot de passe. Route publique (proxy : /auth/*).
const TYPES = new Set(["invite", "recovery", "magiclink", "email"] as const);
type TypeOtp = "invite" | "recovery" | "magiclink" | "email";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as TypeOtp | null;
  const next = cheminInterneSur(searchParams.get("next"), CHEMIN_MOT_DE_PASSE);

  if (tokenHash && type && TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=lien`);
}
