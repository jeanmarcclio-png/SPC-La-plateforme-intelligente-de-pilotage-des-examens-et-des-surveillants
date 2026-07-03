"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/devis");
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
    statut: (fd.get("statut") as string | null) ?? "Brouillon",
    montant_ht: montantHT,
    montant_ttc: montantTTCRaw > 0 ? montantTTCRaw : Math.round(montantHT * 1.2 * 100) / 100,
    nb_surveillants: Number(fd.get("nb_surveillants") ?? 0) || 0,
  };
}

export async function createDevis(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateDevis(id: number, fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteDevis(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
