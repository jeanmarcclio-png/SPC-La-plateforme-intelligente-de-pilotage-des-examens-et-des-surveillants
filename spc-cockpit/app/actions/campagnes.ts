"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/campagnes");
  revalidatePath("/dashboard");
  revalidatePath("/reporting");
  revalidatePath("/qualification");
}

export async function updateCampagneStatut(id: string, statut: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("campagnes").update({ statut }).eq("id", id);
  if (error) throw new Error(`Mise à jour statut campagne échouée : ${error.message}`);
  revalidateAll();
}

export async function createCampagne(formData: FormData) {
  const supabase = await createClient();
  const nom = (formData.get("nom") as string || "").trim().slice(0, 255);
  if (!nom) throw new Error("Le nom de la campagne est requis");
  const id = nom.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const { error } = await supabase.from("campagnes").insert({
    id,
    nom,
    perimetre:         formData.get("perimetre") as string,
    deadline:          formData.get("deadline") as string,
    jours_restants:    parseInt(formData.get("jours_restants") as string) || 0,
    score:             parseFloat(formData.get("score") as string) || 0,
    statut:            formData.get("statut") as string,
    nombre_prospects:  parseInt(formData.get("nombre_prospects") as string) || 0,
    tres_chaudes:      0,
  });
  if (error) throw new Error(`Création campagne échouée : ${error.message}`);
  revalidateAll();
}
