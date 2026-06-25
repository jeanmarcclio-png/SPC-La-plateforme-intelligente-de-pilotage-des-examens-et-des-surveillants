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
  await supabase.from("livrables").update({ statut }).eq("id", id);
  revalidateAll();
}
