// Résolution de l'organisation courante (serveur uniquement).
// L'organisation active est mémorisée dans un cookie `spc_org_id` (choisi via le
// sélecteur d'org). À défaut, on retombe sur la première appartenance.
//
// La sécurité réelle reste portée par la RLS (org_id ∈ memberships) : ce module
// ne fait que déterminer QUELLE org afficher, pas donner accès.

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export const ORG_COOKIE = "spc_org_id";

export interface OrgMembership {
  orgId: string;
  nom: string;
  slug: string | null;
  role: string;
}

/** Organisations de l'utilisateur courant (avec nom/slug/rôle). */
export async function getMyOrganizations(): Promise<OrgMembership[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("organization_members")
      .select("org_id, role, organizations(nom, slug)")
      .eq("user_id", user.id);
    if (error || !data) return [];
    return data.map((r) => {
      const org = r.organizations as unknown as { nom?: string; slug?: string | null } | null;
      return {
        orgId: String(r.org_id),
        nom: org?.nom ?? "Organisation",
        slug: org?.slug ?? null,
        role: String(r.role ?? "lecteur"),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Organisation active : cookie `spc_org_id` s'il est valide (membre), sinon la
 * première appartenance. Retourne null si l'utilisateur n'appartient à aucune
 * organisation (→ onboarding).
 */
export async function getActiveOrgId(): Promise<string | null> {
  const orgs = await getMyOrganizations();
  if (orgs.length === 0) return null;
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORG_COOKIE)?.value;
  if (preferred && orgs.some((o) => o.orgId === preferred)) return preferred;
  return orgs[0].orgId;
}

/**
 * Garde de layout : exige une organisation active. Redirige vers /onboarding si
 * l'utilisateur n'a encore aucune organisation. À appeler dans les layouts
 * serveur des espaces protégés.
 */
export async function requireActiveOrgId(): Promise<string | null> {
  // Bypass E2E (Playwright) : cohérent avec proxy.ts — pas de redirection, les
  // écrans s'affichent avec les données de démonstration (mock-fallback).
  if (process.env.SPC_E2E === "1") return null;
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return orgId;
}
