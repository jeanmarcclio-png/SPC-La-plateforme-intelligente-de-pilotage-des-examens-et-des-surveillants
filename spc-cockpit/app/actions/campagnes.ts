"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/campagnes");
  revalidatePath("/dashboard");
}

export async function updateCampagneStatut(id: string, statut: string) {
  const supabase = await createClient();
  await supabase.from("campagnes").update({ statut }).eq("id", id);
  revalidateAll();
}

export async function createCampagne(formData: FormData) {
  const supabase = await createClient();
  const nom = formData.get("nom") as string;
  const id = nom.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  await supabase.from("campagnes").insert({
    id,
    nom,
    perimetre: formData.get("perimetre") as string,
    deadline: formData.get("deadline") as string,
    jours_restants: parseInt(formData.get("jours_restants") as string) || 0,
    score: parseFloat(formData.get("score") as string) || 0,
    statut: formData.get("statut") as string,
    nombre_prospects: parseInt(formData.get("nombre_prospects") as string) || 0,
    tres_chaudes: 0,
  });
  revalidateAll();
}
