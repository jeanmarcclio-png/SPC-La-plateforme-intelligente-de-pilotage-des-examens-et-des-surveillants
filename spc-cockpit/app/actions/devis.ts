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
    contact: (fd.get("contact") as string | null)?.trim() || null,
    email: (fd.get("email") as string | null)?.trim() || null,
    ville: (fd.get("ville") as string | null)?.trim() || null,
    type_epreuve: (fd.get("type_epreuve") as string | null)?.trim() || null,
    date_debut: (fd.get("date_debut") as string | null) || null,
    date_fin: (fd.get("date_fin") as string | null) || null,
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

export async function duplicateDevis(id: number): Promise<{ error?: string; newId?: number }> {
  try {
    const supabase = await createClient();
    const { data: src, error: e1 } = await supabase.from("devis").select("*").eq("id", id).single();
    if (e1 || !src) return { error: "Devis introuvable" };

    const copie = { ...src, id: undefined, created_at: undefined, reference: `${src.reference}-COPIE`, statut: "Brouillon" };
    delete copie.id;
    delete copie.created_at;
    const { data: inserted, error: e2 } = await supabase.from("devis").insert(copie).select("id").single();
    if (e2 || !inserted) return { error: `Duplication échouée : ${e2?.message ?? "insertion impossible"}` };

    const { data: lignes } = await supabase.from("devis_lignes").select("*").eq("devis_id", id);
    if (lignes?.length) {
      await supabase.from("devis_lignes").insert(
        lignes.map((l) => ({ ...l, id: undefined, created_at: undefined, devis_id: inserted.id }))
      );
    }
    const { data: salles } = await supabase.from("devis_salles").select("*").eq("devis_id", id);
    if (salles?.length) {
      await supabase.from("devis_salles").insert(
        salles.map((s) => ({ ...s, id: undefined, created_at: undefined, devis_id: inserted.id }))
      );
    }

    revalidateOps();
    return { newId: inserted.id };
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
