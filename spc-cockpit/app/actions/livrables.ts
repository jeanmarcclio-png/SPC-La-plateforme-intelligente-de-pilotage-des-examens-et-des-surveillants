"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/livrables");
  revalidatePath("/campagnes");
  revalidatePath("/dashboard");
  revalidatePath("/reporting");
}

export async function updateLivrableStatut(id: number, statut: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("livrables").update({ statut }).eq("id", id);
  if (error) throw new Error(`Mise à jour statut livrable échouée : ${error.message}`);
  revalidateAll();
}

export async function createLivrable(fd: FormData): Promise<{ error?: string }> {
  const nom = (fd.get("nom") as string | null)?.trim();
  const description = (fd.get("description") as string | null)?.trim() ?? "";
  const statut = (fd.get("statut") as string | null) ?? "À rédiger";
  if (!nom) return { error: "Le nom est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("livrables").insert({ nom, description, statut });
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateAll();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
