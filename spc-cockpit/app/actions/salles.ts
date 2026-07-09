"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/salles");
}

function parseForm(fd: FormData) {
  const nom = (fd.get("nom") as string | null)?.trim();
  return {
    nom,
    batiment: (fd.get("batiment") as string | null)?.trim() || null,
    etage: (fd.get("etage") as string | null)?.trim() || null,
    capacite: Number(fd.get("capacite") ?? 0) || 0,
    etudiants: Number(fd.get("etudiants") ?? 0) || 0,
    nb_surveillants: Number(fd.get("nb_surveillants") ?? 0) || 0,
    pmr: fd.get("pmr") === "true",
    tiers_temps: fd.get("tiers_temps") === "true",
  };
}

export async function createSalle(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const fields = parseForm(fd);
  if (!fields.nom) return { error: "Le nom de la salle est obligatoire" };
  if (fields.etudiants > fields.capacite) return { error: "Le nombre d'étudiants dépasse la capacité de la salle" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("salles").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateSalle(id: number, fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const fields = parseForm(fd);
  if (!fields.nom) return { error: "Le nom de la salle est obligatoire" };
  if (fields.etudiants > fields.capacite) return { error: "Le nombre d'étudiants dépasse la capacité de la salle" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("salles").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteSalle(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("salles").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
