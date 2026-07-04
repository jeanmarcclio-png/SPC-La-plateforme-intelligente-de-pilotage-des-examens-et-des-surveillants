"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations/pmr");
}

function parseForm(fd: FormData) {
  const amenagement = (fd.get("amenagement") as string | null)?.trim();
  return {
    amenagement,
    salle: (fd.get("salle") as string | null)?.trim() || null,
    tiers_temps: fd.get("tiers_temps") === "true",
    surveillant: (fd.get("surveillant") as string | null)?.trim() || null,
  };
}

export async function createAmenagement(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.amenagement) return { error: "Le type d'aménagement est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("amenagements").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateAmenagement(id: number, fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.amenagement) return { error: "Le type d'aménagement est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("amenagements").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteAmenagement(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("amenagements").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
