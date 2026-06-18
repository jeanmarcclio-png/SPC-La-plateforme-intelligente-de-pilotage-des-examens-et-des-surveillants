"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/qualification");
  revalidatePath("/dashboard");
  revalidatePath("/campagnes");
}

export async function updateProspectStatut(id: string, statut: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ statut }).eq("id", id);
  revalidateAll();
}

export async function updateProspectNotes(id: string, notes: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ notes }).eq("id", id);
  revalidatePath("/qualification");
}

export async function deleteProspect(id: string) {
  const supabase = await createClient();
  await supabase.from("prospects").delete().eq("id", id);
  revalidateAll();
}

export async function createProspect(formData: FormData) {
  const supabase = await createClient();
  const id = crypto.randomUUID();
  await supabase.from("prospects").insert({
    id,
    nom:          formData.get("nom") as string,
    segment:      formData.get("segment") as string,
    cluster:      formData.get("cluster") as string,
    score_bant:   parseFloat(formData.get("score_bant") as string) || 0,
    niveau:       formData.get("niveau") as string,
    priorite:     formData.get("priorite") as string,
    vague:        parseInt(formData.get("vague") as string) || 1,
    interlocuteur:formData.get("interlocuteur") as string,
    canal:        formData.get("canal") as string,
    statut:       "Non contacté",
    action:       formData.get("action") as string,
    campagne_id:  formData.get("campagne_id") as string,
  });
  revalidateAll();
}
