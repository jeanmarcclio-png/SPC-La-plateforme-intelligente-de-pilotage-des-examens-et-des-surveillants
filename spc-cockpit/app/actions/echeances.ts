"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/planning");
  revalidatePath("/dashboard");
}

export async function createEcheance(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("echeances").insert({
    date: formData.get("date") as string,
    nom: formData.get("nom") as string,
    tag: formData.get("tag") as string,
    urgent: formData.get("urgent") === "true",
  });
  revalidateAll();
}

export async function updateEcheance(id: number, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("echeances").update({
    date: formData.get("date") as string,
    nom: formData.get("nom") as string,
    tag: formData.get("tag") as string,
    urgent: formData.get("urgent") === "true",
  }).eq("id", id);
  revalidateAll();
}

export async function deleteEcheance(id: number) {
  const supabase = await createClient();
  await supabase.from("echeances").delete().eq("id", id);
  revalidateAll();
}
