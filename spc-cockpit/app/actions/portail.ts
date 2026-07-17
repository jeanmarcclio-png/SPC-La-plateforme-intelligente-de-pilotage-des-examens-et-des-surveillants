"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMonSurveillantId } from "@/lib/supabase/portail";

/** Le surveillant confirme SON affectation (RPC contrôlée : propriété + colonnes). */
export async function confirmerAffectation(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("spc_confirmer_affectation", { p_affectation_id: id });
    if (error) return { error: `Confirmation impossible : ${error.message}` };
    revalidatePath("/moi");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Le surveillant décline SON affectation (motif optionnel). Le planning n'est
 * PAS modifié : un drapeau est posé et le coordinateur tranche.
 */
export async function declinerAffectation(id: number, motif?: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("spc_decliner_affectation", {
      p_affectation_id: id,
      p_motif: motif ?? null,
    });
    if (error) return { error: `Refus impossible : ${error.message}` };
    revalidatePath("/moi");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/** Le surveillant déclare/actualise SA disponibilité pour une date (upsert). */
export async function enregistrerDisponibilite(input: {
  date: string;
  matin: boolean;
  aprem: boolean;
  commentaire?: string | null;
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const surveillantId = await getMonSurveillantId();
    if (!surveillantId) return { error: "Compte non lié à un surveillant." };

    // org_id repris de la fiche surveillant (traçabilité multi-tenant).
    const { data: surv } = await supabase
      .from("surveillants")
      .select("org_id")
      .eq("id", surveillantId)
      .maybeSingle();

    const { error } = await supabase.from("disponibilites").upsert(
      {
        surveillant_id: surveillantId,
        org_id: surv?.org_id ?? null,
        date: input.date,
        matin: input.matin,
        aprem: input.aprem,
        commentaire: input.commentaire?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "surveillant_id,date" }
    );
    if (error) return { error: `Enregistrement impossible : ${error.message}` };
    revalidatePath("/moi");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
