"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rateLimit";

function revalidateAll() {
  revalidatePath("/qualification");
  revalidatePath("/dashboard");
  revalidatePath("/campagnes");
  revalidatePath("/reporting");
  revalidatePath("/planning");
}

async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? "anon";
}

async function guardRateLimit() {
  const userId = await getUserId();
  const { allowed, retryAfter } = checkRateLimit(userId);
  if (!allowed) throw new Error(`Trop de requêtes — réessayez dans ${retryAfter}s`);
}

export async function updateProspectStatut(id: string, statut: string) {
  await guardRateLimit();
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ statut }).eq("id", id);
  if (error) throw new Error(`Mise à jour statut échouée : ${error.message}`);
  revalidateAll();
}

export async function updateProspectNotes(id: string, notes: string) {
  await guardRateLimit();
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ notes }).eq("id", id);
  if (error) throw new Error(`Mise à jour notes échouée : ${error.message}`);
  revalidatePath("/qualification");
}

export async function updateProspectNiveau(id: string, niveau: string) {
  await guardRateLimit();
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ niveau }).eq("id", id);
  if (error) throw new Error(`Mise à jour niveau échouée : ${error.message}`);
  revalidateAll();
}

export async function logProspectInteraction(id: string, interaction: string) {
  await guardRateLimit();
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ derniere_interaction: interaction }).eq("id", id);
  if (error) throw new Error(`Enregistrement interaction échoué : ${error.message}`);
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
  await guardRateLimit();
  const sanitized = { ...fields };
  // Normalize valeur_potentielle: strip non-numeric suffixes, keep only the numeric part
  if (sanitized.valeur_potentielle !== undefined) {
    const num = parseFloat(sanitized.valeur_potentielle);
    sanitized.valeur_potentielle = isNaN(num) ? "" : String(num);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update(sanitized).eq("id", id);
  if (error) throw new Error(`Mise à jour fiche échouée : ${error.message}`);
  revalidateAll();
}

export async function deleteProspect(id: string) {
  await guardRateLimit();
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) throw new Error(`Suppression prospect échouée : ${error.message}`);
  revalidateAll();
}

export async function createProspect(formData: FormData) {
  await guardRateLimit();
  const supabase = await createClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("prospects").insert({
    id,
    nom:           (formData.get("nom") as string || "").trim().slice(0, 255),
    segment:       formData.get("segment") as string,
    cluster:       formData.get("cluster") as string,
    score_bant:    parseFloat(formData.get("score_bant") as string) || 0,
    niveau:        formData.get("niveau") as string,
    priorite:      formData.get("priorite") as string,
    vague:         parseInt(formData.get("vague") as string) || 1,
    interlocuteur: formData.get("interlocuteur") as string,
    canal:         formData.get("canal") as string,
    statut:        "Non contacté",
    action:        formData.get("action") as string,
    campagne_id:   formData.get("campagne_id") as string,
  });
  if (error) throw new Error(`Création prospect échouée : ${error.message}`);
  revalidateAll();
}
