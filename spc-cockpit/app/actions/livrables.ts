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

export async function deleteLivrable(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("livrables").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateAll();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateLivrable(id: number, fd: FormData): Promise<{ error?: string }> {
  const nom = (fd.get("nom") as string | null)?.trim();
  const description = (fd.get("description") as string | null)?.trim() ?? "";
  const statut = (fd.get("statut") as string | null) ?? "À rédiger";
  const fichier = (fd.get("fichier") as string | null)?.trim() || null;
  if (!nom) return { error: "Le nom est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("livrables")
      .update({ nom, description, statut, fichier })
      .eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateAll();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
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
