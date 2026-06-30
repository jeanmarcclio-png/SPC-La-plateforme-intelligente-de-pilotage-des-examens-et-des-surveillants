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

export async function createLivrable(fd: FormData) {
  const nom = (fd.get("nom") as string | null)?.trim();
  const description = (fd.get("description") as string | null)?.trim() ?? "";
  const statut = (fd.get("statut") as string | null) ?? "À rédiger";
  if (!nom) throw new Error("Le nom est obligatoire");

  const supabase = await createClient();
  const { error } = await supabase.from("livrables").insert({ nom, description, statut });
  if (error) throw new Error(`Création livrable échouée : ${error.message}`);
  revalidateAll();
}
