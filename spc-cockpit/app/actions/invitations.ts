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

    // Garde-fou : ne JAMAIS rétrograder un compte admin/coordinateur/planificateur
    // (ex. si l'email du surveillant est celui d'un membre déjà privilégié).
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    const existingRole = existingMember?.role?.toLowerCase();
    if (existingMember && existingRole !== "surveillant") {
      return {
        error: `Cet email appartient déjà à un compte « ${existingMember.role} » dans cette organisation : impossible de l'inviter comme surveillant.`,
      };
    }

    // 2) Membership 'surveillant' (créé seulement si absent — jamais de downgrade).
    if (!existingMember) {
      const { error: mErr } = await admin
        .from("organization_members")
        .insert({ org_id: orgId, user_id: userId, role: "surveillant" });
      if (mErr) return { error: `Rattachement échoué : ${mErr.message}` };
    }

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

// Mot de passe lisible (sans caractères ambigus 0/O, 1/l/I).
function genererMotDePasse(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/**
 * Définit (ou réinitialise) un mot de passe pour un surveillant, SANS email :
 * le coordinateur transmet lui-même l'identifiant + le mot de passe généré.
 * Crée le compte + membership 'surveillant' + liaison si nécessaire.
 * Ne touche jamais un compte admin/coordinateur (garde-fou).
 */
export async function definirMotDePasseSurveillant(
  surveillantId: number
): Promise<{ error?: string; email?: string; motDePasse?: string }> {
  const auth = await requireCapability("validate"); // coordinateur+
  if (!auth.ok) return { error: auth.error };

  const admin = createServiceClient();
  if (!admin) {
    return { error: "Indisponible : SUPABASE_SERVICE_ROLE_KEY non configurée." };
  }
  const orgId = await getActiveOrgId();
  if (!orgId) return { error: "Aucune organisation active." };

  const supabase = await createClient();
  const { data: surv, error: sErr } = await supabase
    .from("surveillants")
    .select("id, nom, email, user_id")
    .eq("id", surveillantId)
    .maybeSingle();
  if (sErr || !surv) return { error: "Surveillant introuvable." };
  if (!surv.email) {
    return { error: "Ce surveillant n'a pas d'email — renseignez-en un (il sert d'identifiant de connexion)." };
  }
  const email = String(surv.email).trim().toLowerCase();
  const motDePasse = genererMotDePasse();

  try {
    // Retrouver le compte (via lien ou par email).
    let userId = (surv.user_id as string | null) ?? null;
    if (!userId) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    }

    // Garde-fou : ne jamais toucher un compte admin/coordinateur.
    if (userId) {
      const { data: m } = await admin
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .maybeSingle();
      if (m && m.role?.toLowerCase() !== "surveillant") {
        return { error: `Cet email appartient déjà à un compte « ${m.role} » : action refusée.` };
      }
    }

    // Créer le compte s'il n'existe pas, sinon fixer le mot de passe.
    if (!userId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password: motDePasse,
        email_confirm: true,
        user_metadata: { nom: surv.nom },
      });
      if (error || !created?.user) return { error: `Création du compte échouée : ${error?.message}` };
      userId = created.user.id;
    } else {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: motDePasse,
        email_confirm: true,
      });
      if (error) return { error: `Mise à jour du mot de passe échouée : ${error.message}` };
    }

    // Membership 'surveillant' (si absent) + liaison de la fiche.
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existingMember) {
      await admin.from("organization_members").insert({ org_id: orgId, user_id: userId, role: "surveillant" });
    }
    await admin
      .from("surveillants")
      .update({ user_id: userId, invited_at: new Date().toISOString() })
      .eq("id", surveillantId);

    revalidatePath("/operations/surveillants");
    return { email, motDePasse };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
