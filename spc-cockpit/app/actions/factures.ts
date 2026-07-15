"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ttcFromHT } from "@/lib/operations/engine";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/facturation");
  revalidatePath("/operations/rapports");
}

function parseForm(fd: FormData) {
  const reference = (fd.get("reference") as string | null)?.trim();
  const client = (fd.get("client") as string | null)?.trim();
  const montantHT = Number(fd.get("montant_ht") ?? 0) || 0;
  const montantTTCRaw = Number(fd.get("montant_ttc") ?? 0) || 0;
  return {
    reference,
    client,
    session: (fd.get("session") as string | null)?.trim() || null,
    statut: (fd.get("statut") as string | null) ?? "À facturer",
    montant_ht: montantHT,
    montant_ttc: montantTTCRaw > 0 ? montantTTCRaw : ttcFromHT(montantHT),
    emission: (fd.get("emission") as string | null) || null,
    echeance: (fd.get("echeance") as string | null) || null,
  };
}

export async function createFacture(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("finance");
  if (!auth.ok) return { error: auth.error };
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { error } = await supabase.from("factures").insert({ ...fields, org_id });
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateFactureStatut(id: number, statut: string): Promise<{ error?: string }> {
  const auth = await requireCapability("finance");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("factures").update({ statut }).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteFacture(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("finance");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("factures").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
