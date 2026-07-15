"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getUserOrganizations } from "@/lib/auth/session";
import { ORG_COOKIE } from "@/lib/auth/org";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * Crée une organisation (via RPC security definer) et la définit comme active.
 * Le créateur devient 'admin'. Retourne { error } en cas d'échec.
 */
export async function createOrganisation(fd: FormData): Promise<{ error?: string; orgId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifié." };

  const nom = (fd.get("nom") as string | null)?.trim() ?? "";
  if (!nom) return { error: "Le nom de l'organisation est obligatoire." };

  const tauxRaw = fd.get("taux_horaire");
  const coeffRaw = fd.get("coefficient_net");
  const taux = tauxRaw != null && tauxRaw !== "" ? Number(tauxRaw) : 12.31;
  const coeff = coeffRaw != null && coeffRaw !== "" ? Number(coeffRaw) : 0.7824;
  if (Number.isNaN(taux) || Number.isNaN(coeff)) {
    return { error: "Taux horaire / coefficient invalides." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("spc_create_organization", {
      p_nom: nom,
      p_taux: taux,
      p_coeff: coeff,
    });
    if (error) return { error: `Création échouée : ${error.message}` };

    const orgId = String(data);
    const cookieStore = await cookies();
    cookieStore.set(ORG_COOKIE, orgId, COOKIE_OPTS);
    return { orgId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Change l'organisation active (sélecteur d'org). Vérifie que l'utilisateur en
 * est bien membre avant de poser le cookie.
 */
export async function setActiveOrganisation(orgId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifié." };

  const orgs = await getUserOrganizations(user.id);
  if (!orgs.includes(orgId)) {
    return { error: "Organisation non autorisée." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, COOKIE_OPTS);
  return {};
}
