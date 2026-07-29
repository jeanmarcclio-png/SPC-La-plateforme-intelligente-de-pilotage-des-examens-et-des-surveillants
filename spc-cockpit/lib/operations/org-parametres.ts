import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/auth/org";
import { TAUX_HORAIRE_DEFAUT } from "./demandes-constants";

/** Lit un paramètre d'organisation (table org_parametres), ou null. */
export async function getOrgParam(cle: string): Promise<string | null> {
  try {
    const orgId = await getActiveOrgId();
    if (!orgId) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("org_parametres")
      .select("valeur")
      .eq("org_id", orgId)
      .eq("cle", cle)
      .maybeSingle();
    return (data?.valeur as string) ?? null;
  } catch {
    return null;
  }
}

/** Taux horaire de facturation de l'org (fallback TAUX_HORAIRE_DEFAUT). */
export async function getTauxHoraireFacturation(): Promise<number> {
  const v = await getOrgParam("taux_horaire_facturation");
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : TAUX_HORAIRE_DEFAUT;
}
