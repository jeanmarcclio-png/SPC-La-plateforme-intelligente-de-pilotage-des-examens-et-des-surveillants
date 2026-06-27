"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function createEcheance(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("echeances").insert({
    date:   formData.get("date") as string,
    nom:    (formData.get("nom") as string || "").trim().slice(0, 255),
    tag:    formData.get("tag") as string,
    urgent: formData.get("urgent") === "true",
  });
  if (error) throw new Error(`Création échéance échouée : ${error.message}`);
  revalidateAll();
}

export async function updateEcheance(id: number, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("echeances").update({
    date:   formData.get("date") as string,
    nom:    (formData.get("nom") as string || "").trim().slice(0, 255),
    tag:    formData.get("tag") as string,
    urgent: formData.get("urgent") === "true",
  }).eq("id", id);
  if (error) throw new Error(`Mise à jour échéance échouée : ${error.message}`);
  revalidateAll();
}

export async function deleteEcheance(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("echeances").delete().eq("id", id);
  if (error) throw new Error(`Suppression échéance échouée : ${error.message}`);
  revalidateAll();
}
