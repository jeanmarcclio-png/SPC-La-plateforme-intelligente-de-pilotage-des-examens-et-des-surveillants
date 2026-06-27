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
