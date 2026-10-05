"use server";

// Gestion des collaborateurs de l'organisation active (écran
// /operations/collaborateurs). Réservé aux ADMINISTRATEURS, quel que soit le
// mode SPC_ENFORCE_ROLES (garde stricte) : ces actions contournent la RLS via
// la clé service_role.
//
// Accès sans mot de passe en clair : on génère un lien à usage unique
// (generateLink) qui ouvre une session via /auth/confirm puis amène à l'écran
// de choix du mot de passe. Le lien est envoyé par email (Resend) si la
// messagerie est configurée, et toujours renvoyé à l'administrateur pour qu'il
// puisse le transmettre lui-même.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireCapabilityStrict, getCurrentUser } from "@/lib/auth/session";
import { getActiveOrgId, getMyOrganizations } from "@/lib/auth/org";
import type { Role } from "@/lib/auth/roles";
import {
  validerInvitation,
  controlerActionMembre,
  construireLienAcces,
  emailInvitation,
  estRoleSurveillant,
  roleCollaborateur,
  ROLES_COLLABORATEUR,
  type TypeLienAcces,
} from "@/lib/auth/collaborateurs";

const PAGE = "/operations/collaborateurs";

export interface Collaborateur {
  userId: string;
  email: string;
  nom: string | null;
  role: Role;
  statut: "actif" | "en_attente";
  ajouteLe: string | null;
  derniereConnexion: string | null;
  estMoi: boolean;
}

export interface ResultatLien {
  ok?: boolean;
  error?: string;
  email?: string;
  lien?: string;
  emailEnvoye?: boolean;
  emailErreur?: string;
}

// ---------------------------------------------------------------------------
// Contexte commun
// ---------------------------------------------------------------------------

type Contexte =
  | { ok: true; admin: SupabaseClient; orgId: string; acteur: User; orgNom: string }
  | { ok: false; error: string };

async function contexteAdmin(): Promise<Contexte> {
  const auth = await requireCapabilityStrict("admin");
  if (!auth.ok) return { ok: false, error: auth.error ?? "Accès réservé aux administrateurs." };

  const acteur = await getCurrentUser();
  if (!acteur) return { ok: false, error: "Non authentifié." };

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "Aucune organisation active." };

  const admin = createServiceClient();
  if (!admin) {
    return {
      ok: false,
      error: "Gestion des accès indisponible : la variable SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur le serveur.",
    };
  }

  const orgs = await getMyOrganizations();
  const orgNom = orgs.find((o) => o.orgId === orgId)?.nom ?? "votre organisation";
  return { ok: true, admin, orgId, acteur, orgNom };
}

/** Origine publique de l'application (pour construire les liens d'accès). */
async function origineApplication(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Retrouve un compte Auth par email (pagination de l'API admin). */
async function trouverUtilisateurParEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) return null;
    const trouve = data.users.find((u) => u.email?.toLowerCase() === email);
    if (trouve) return trouve;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Envoi de l'email d'accès — uniquement si Resend + expéditeur sont configurés. */
async function envoyerEmailAcces(
  email: string,
  contenu: { sujet: string; texte: string }
): Promise<{ envoye: boolean; erreur?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SPC_EMAIL_FROM;
  if (!key || !from) return { envoye: false };
  try {
    const { error } = await new Resend(key).emails.send({
      from,
      to: [email],
      subject: contenu.sujet,
      text: contenu.texte,
    });
    if (error) return { envoye: false, erreur: error.message };
    return { envoye: true };
  } catch (e) {
    return { envoye: false, erreur: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

function nomActeur(acteur: User): string | null {
  const meta = (acteur.user_metadata ?? {}) as Record<string, unknown>;
  const nom = typeof meta.nom === "string" ? meta.nom : typeof meta.full_name === "string" ? meta.full_name : null;
  return nom || acteur.email || null;
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export async function listerCollaborateurs(): Promise<{ collaborateurs: Collaborateur[]; error?: string }> {
  const ctx = await contexteAdmin();
  if (!ctx.ok) return { collaborateurs: [], error: ctx.error };

  const { data, error } = await ctx.admin
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("org_id", ctx.orgId);
  if (error) return { collaborateurs: [], error: `Lecture des membres impossible : ${error.message}` };

  const membres = (data ?? []).filter((m) => !estRoleSurveillant(m.role as string | null));

  const collaborateurs = await Promise.all(
    membres.map(async (m): Promise<Collaborateur | null> => {
      const userId = String(m.user_id);
      const { data: u } = await ctx.admin.auth.admin.getUserById(userId);
      const user = u?.user;
      if (!user) return null;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const nom = typeof meta.nom === "string" && meta.nom.trim() ? meta.nom.trim() : null;
      return {
        userId,
        email: user.email ?? "—",
        nom,
        role: roleCollaborateur(m.role as string | null),
        statut: user.last_sign_in_at ? "actif" : "en_attente",
        ajouteLe: (m.created_at as string | null) ?? null,
        derniereConnexion: user.last_sign_in_at ?? null,
        estMoi: userId === ctx.acteur.id,
      };
    })
  );

  const ordre: Record<Role, number> = { administrateur: 0, coordinateur: 1, planificateur: 2, lecteur: 3 };
  const liste = collaborateurs
    .filter((c): c is Collaborateur => c !== null)
    .sort((a, b) => ordre[a.role] - ordre[b.role] || a.email.localeCompare(b.email));

  return { collaborateurs: liste };
}

// ---------------------------------------------------------------------------
// Invitation
// ---------------------------------------------------------------------------

export async function inviterCollaborateur(input: {
  email: string;
  role: string;
  nom?: string;
}): Promise<ResultatLien> {
  const v = validerInvitation(input);
  if (!v.ok) return { error: v.error };

  const ctx = await contexteAdmin();
  if (!ctx.ok) return { error: ctx.error };
  const { admin, orgId } = ctx;

  try {
    // 1) Compte Auth : création par lien d'invitation, ou compte existant.
    let userId: string | null = null;
    let tokenHash: string | null = null;
    let type: TypeLienAcces = "invite";

    const { data: invite, error: iErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email: v.email,
      options: { data: v.nom ? { nom: v.nom } : {} },
    });

    if (invite?.user) {
      userId = invite.user.id;
      tokenHash = invite.properties?.hashed_token ?? null;
    } else if (iErr && /already|registered|exists/i.test(iErr.message)) {
      const existant = await trouverUtilisateurParEmail(admin, v.email);
      if (!existant) return { error: "Ce compte existe mais n'a pas pu être retrouvé." };
      userId = existant.id;
      type = "recovery";
    } else {
      return { error: `Création du compte impossible : ${iErr?.message ?? "erreur inconnue"}` };
    }

    // 2) Appartenance à l'organisation (jamais d'écrasement silencieux).
    const { data: membre } = await admin
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membre) {
      if (estRoleSurveillant(membre.role as string | null)) {
        return {
          error: "Cet email correspond à un compte surveillant de l'organisation : gérez-le depuis l'écran Surveillants.",
        };
      }
      return { error: `${v.email} fait déjà partie des collaborateurs (rôle « ${membre.role} »).` };
    }

    const { error: mErr } = await admin
      .from("organization_members")
      .insert({ org_id: orgId, user_id: userId, role: v.role });
    if (mErr) return { error: `Rattachement à l'organisation impossible : ${mErr.message}` };

    // 3) Lien d'accès (compte existant : lien de (ré)initialisation).
    if (!tokenHash) {
      const { data: rec, error: rErr } = await admin.auth.admin.generateLink({ type: "recovery", email: v.email });
      if (rErr || !rec?.properties?.hashed_token) {
        revalidatePath(PAGE);
        return {
          ok: true,
          email: v.email,
          error: `Collaborateur ajouté, mais le lien d'accès n'a pas pu être généré : ${rErr?.message ?? "inconnu"}. Utilisez « Renvoyer l'accès ».`,
        };
      }
      tokenHash = rec.properties.hashed_token;
    }

    const lien = construireLienAcces(await origineApplication(), tokenHash, type);
    const envoi = await envoyerEmailAcces(
      v.email,
      emailInvitation({ lien, role: v.role, organisation: ctx.orgNom, invitant: nomActeur(ctx.acteur) })
    );

    revalidatePath(PAGE);
    return { ok: true, email: v.email, lien, emailEnvoye: envoi.envoye, emailErreur: envoi.erreur };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

// ---------------------------------------------------------------------------
// Actions sur un membre existant
// ---------------------------------------------------------------------------

async function membreCible(admin: SupabaseClient, orgId: string, userId: string) {
  const { data } = await admin
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as { role: string | null } | null;
}

export async function renvoyerAcces(userId: string): Promise<ResultatLien> {
  const ctx = await contexteAdmin();
  if (!ctx.ok) return { error: ctx.error };
  const { admin, orgId } = ctx;

  const membre = await membreCible(admin, orgId, userId);
  if (!membre) return { error: "Ce collaborateur ne fait pas partie de l'organisation." };
  if (estRoleSurveillant(membre.role)) {
    return { error: "Compte surveillant : gérez-le depuis l'écran Surveillants." };
  }

  const { data: u } = await admin.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) return { error: "Email du compte introuvable." };

  const { data: rec, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !rec?.properties?.hashed_token) {
    return { error: `Génération du lien impossible : ${error?.message ?? "inconnu"}` };
  }

  const lien = construireLienAcces(await origineApplication(), rec.properties.hashed_token, "recovery");
  const envoi = await envoyerEmailAcces(
    email,
    emailInvitation({ lien, role: roleCollaborateur(membre.role), organisation: ctx.orgNom, relance: true })
  );
  return { ok: true, email, lien, emailEnvoye: envoi.envoye, emailErreur: envoi.erreur };
}

export async function changerRoleCollaborateur(userId: string, role: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await contexteAdmin();
  if (!ctx.ok) return { error: ctx.error };
  const { admin, orgId, acteur } = ctx;

  const nouveau = role.trim().toLowerCase();
  if (!(ROLES_COLLABORATEUR as readonly string[]).includes(nouveau)) return { error: "Rôle inconnu." };

  const membre = await membreCible(admin, orgId, userId);
  if (!membre) return { error: "Ce collaborateur ne fait pas partie de l'organisation." };

  const garde = controlerActionMembre({ acteurId: acteur.id, cibleId: userId, cibleRoleBrut: membre.role });
  if (!garde.ok) return { error: garde.error };

  const { error } = await admin
    .from("organization_members")
    .update({ role: nouveau })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) return { error: `Changement de rôle impossible : ${error.message}` };

  revalidatePath(PAGE);
  return { ok: true };
}

/**
 * Retire l'accès à l'organisation (supprime l'appartenance). Le compte Auth est
 * conservé : il peut appartenir à d'autres organisations et l'historique reste
 * traçable. Sans appartenance, la RLS ne lui donne plus accès à aucune donnée.
 */
export async function retirerCollaborateur(userId: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await contexteAdmin();
  if (!ctx.ok) return { error: ctx.error };
  const { admin, orgId, acteur } = ctx;

  const membre = await membreCible(admin, orgId, userId);
  if (!membre) return { error: "Ce collaborateur ne fait déjà plus partie de l'organisation." };

  const garde = controlerActionMembre({ acteurId: acteur.id, cibleId: userId, cibleRoleBrut: membre.role });
  if (!garde.ok) return { error: garde.error };

  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) return { error: `Retrait impossible : ${error.message}` };

  revalidatePath(PAGE);
  return { ok: true };
}
