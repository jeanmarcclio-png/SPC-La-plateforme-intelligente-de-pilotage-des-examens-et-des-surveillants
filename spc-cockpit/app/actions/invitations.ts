"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";

/**
 * Invite un surveillant : crée (ou retrouve) son compte Supabase Auth par magic
 * link, lui pose un membership role 'surveillant' dans l'organisation active, et
 * lie surveillants.user_id. Réservé au coordinateur/admin.
 *
 * Utilise le client service_role (server-only) : ces écritures d'admin
 * contournent volontairement la RLS.
 */
export async function inviterSurveillant(
  surveillantId: number
): Promise<{ error?: string; ok?: boolean; email?: string }> {
  const auth = await requireCapability("validate"); // coordinateur+
  if (!auth.ok) return { error: auth.error };

  const admin = createServiceClient();
  if (!admin) {
    return { error: "Invitation indisponible : SUPABASE_SERVICE_ROLE_KEY non configurée." };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Aucune organisation active." };

  // Email du surveillant (via le client utilisateur, RLS OK pour le coordinateur).
  const supabase = await createClient();
  const { data: surv, error: sErr } = await supabase
    .from("surveillants")
    .select("id, nom, email, user_id")
    .eq("id", surveillantId)
    .maybeSingle();
  if (sErr || !surv) return { error: "Surveillant introuvable." };
  if (!surv.email) return { error: "Ce surveillant n'a pas d'email — renseignez-le d'abord." };
  const email = String(surv.email).trim().toLowerCase();

  try {
    // 1) Créer le compte par invitation (magic link). S'il existe déjà, le retrouver.
    let userId: string | null = null;
    const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nom: surv.nom },
    });
    if (invited?.user) {
      userId = invited.user.id;
    } else if (iErr && /already|registered|exists/i.test(iErr.message)) {
      // Compte déjà présent : le retrouver par email.
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    } else if (iErr) {
      return { error: `Invitation échouée : ${iErr.message}` };
    }
    if (!userId) return { error: "Impossible de créer ou retrouver le compte." };

    // 2) Membership 'surveillant' dans l'org active (idempotent).
    const { error: mErr } = await admin
      .from("organization_members")
      .upsert({ org_id: orgId, user_id: userId, role: "surveillant" }, { onConflict: "org_id,user_id" });
    if (mErr) return { error: `Rattachement échoué : ${mErr.message}` };

    // 3) Lier la fiche surveillant + tracer l'invitation.
    const { error: uErr } = await admin
      .from("surveillants")
      .update({ user_id: userId, invited_at: new Date().toISOString() })
      .eq("id", surveillantId);
    if (uErr) return { error: `Liaison échouée : ${uErr.message}` };

    revalidatePath("/operations/surveillants");
    return { ok: true, email };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
