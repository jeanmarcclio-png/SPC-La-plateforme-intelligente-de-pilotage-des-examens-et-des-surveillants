"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/surveillants");
}

function parseForm(fd: FormData) {
  const nom = (fd.get("nom") as string | null)?.trim();
  return {
    nom,
    role: (fd.get("role") as string | null) ?? "Surveillant salle",
    statut: (fd.get("statut") as string | null) ?? "Disponible",
    email: (fd.get("email") as string | null)?.trim() || null,
    telephone: (fd.get("telephone") as string | null)?.trim() || null,
    qualifications: (fd.get("qualifications") as string | null)?.trim() || null,
    taux_horaire: Number(fd.get("taux_horaire") ?? 18) || 18,
    note: Number(fd.get("note") ?? 0) || 0,
  };
}

export async function createSurveillant(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.nom) return { error: "Le nom est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("surveillants").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateSurveillant(id: number, fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.nom) return { error: "Le nom est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("surveillants").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteSurveillant(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("surveillants").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
