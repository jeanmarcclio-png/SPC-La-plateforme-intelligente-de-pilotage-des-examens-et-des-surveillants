// Contexte d'autorisation SERVEUR (à n'importer que côté serveur).
// Ne jamais se fier au middleware seul : chaque action/route sensible appelle
// requireCapability(). Mode transition par défaut (SPC_ENFORCE_ROLES ≠ "1") :
// un utilisateur authentifié est autorisé — le durcissement par rôle s'active
// une fois les rôles opérationnels semés en base (après migrations v12/v13).

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizeRole, authorize, type Role, type Capability, type AuthResult } from "./roles";

/** Rôles strictement appliqués uniquement si SPC_ENFORCE_ROLES === "1". */
export function rolesEnforced(): boolean {
  return process.env.SPC_ENFORCE_ROLES === "1";
}

/** Utilisateur Supabase courant (ou null). */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Rôle opérationnel de l'utilisateur courant, lu depuis
 * organization_members.role (par user_id) pour l'organisation active.
 * L'organisation active suit le cookie `spc_org_id` (sélecteur d'org), sinon
 * la première appartenance. `normalizeRole` mappe le vocabulaire spec
 * (« admin » → administrateur, « surveillant » → lecteur/lecture seule).
 * Dégrade en « lecteur » si aucune appartenance (jamais d'élévation par défaut).
 */
export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("org_id, role")
      .eq("user_id", user.id);
    if (!data?.length) return "lecteur";

    const cookieStore = await cookies();
    const preferred = cookieStore.get("spc_org_id")?.value;
    const row = (preferred && data.find((r) => String(r.org_id) === preferred)) || data[0];
    return normalizeRole(row?.role ?? null);
  } catch {
    return "lecteur";
  }
}

/**
 * Garde d'autorisation d'une Server Action / Route Handler.
 * Retourne { ok, error } — cohérent avec le pattern `{error?}`.
 */
export async function requireCapability(capability: Capability): Promise<AuthResult> {
  const enforce = rolesEnforced();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = enforce && user?.email ? await getCurrentRole() : null;
  return authorize({ authenticated: !!user, enforce, role, capability });
}

/**
 * Garde STRICTE : applique toujours le contrôle de rôle, même en mode transition
 * (`SPC_ENFORCE_ROLES ≠ 1`). Réservée aux opérations destructrices qui contournent
 * la RLS via `service_role` (ex. anonymisation). Échoue « fermé » : un compte sans
 * appartenance résolue est refusé (voir migration 27 qui garantit les appartenances).
 */
export async function requireCapabilityStrict(capability: Capability): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getCurrentRole() : null;
  return authorize({ authenticated: !!user, enforce: true, role, capability });
}

// ---------------------------------------------------------------------------
// Isolation par organisation — activée une fois la migration v12 appliquée.
// Défensif : si les tables org n'existent pas encore, on ne bloque pas (mode
// mono-organisation implicite) mais on ne divulgue rien d'inter-org non plus.
// ---------------------------------------------------------------------------

/** Organisations dont l'utilisateur est membre (vide si tables absentes). */
export async function getUserOrganizations(userId: string): Promise<string[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("organization_members").select("org_id").eq("user_id", userId);
    if (error) return [];
    return (data ?? []).map((r) => String(r.org_id));
  } catch {
    return [];
  }
}

/** Organisation courante de l'utilisateur (première appartenance, ou null). */
export async function getCurrentOrgId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const orgs = await getUserOrganizations(user.id);
  return orgs[0] ?? null;
}

/** Vérifie que l'utilisateur appartient à l'organisation ciblée. */
export async function assertOrgAccess(userId: string, orgId: string): Promise<AuthResult> {
  const orgs = await getUserOrganizations(userId);
  if (orgs.length === 0) return { ok: true }; // mode mono-org implicite (avant v12)
  return orgs.includes(orgId)
    ? { ok: true }
    : { ok: false, error: "Accès refusé : organisation non autorisée." };
}
