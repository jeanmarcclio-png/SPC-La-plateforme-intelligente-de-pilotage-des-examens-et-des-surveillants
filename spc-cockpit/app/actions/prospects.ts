"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProspectStatut(id: string, statut: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ statut }).eq("id", id);
  revalidatePath("/qualification");
}

export async function updateProspectNotes(id: string, notes: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ notes }).eq("id", id);
  revalidatePath("/qualification");
}
