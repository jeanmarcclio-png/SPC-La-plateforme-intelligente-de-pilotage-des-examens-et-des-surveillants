"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/qualification");
  revalidatePath("/dashboard");
  revalidatePath("/campagnes");
  revalidatePath("/reporting");
  revalidatePath("/planning");
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

export async function updateProspectNiveau(id: string, niveau: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ niveau }).eq("id", id);
  revalidateAll();
}

export async function logProspectInteraction(id: string, interaction: string) {
  const supabase = await createClient();
  await supabase.from("prospects").update({ derniere_interaction: interaction }).eq("id", id);
  revalidatePath("/qualification");
}

export async function updateProspectFiche(id: string, fields: {
  telephone?: string;
  contact_principal?: string;
  fonction_contact?: string;
  valeur_potentielle?: string;
  prochaine_relance?: string;
  derniere_interaction?: string;
  notes?: string;
  score_bant?: number;
  nb_etudiants?: number | null;
  sessions_par_an?: number | null;
}) {
  const supabase = await createClient();
  await supabase.from("prospects").update(fields).eq("id", id);
  revalidateAll();
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
