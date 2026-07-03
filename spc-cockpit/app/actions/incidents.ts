"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/incidents");
}

function parseForm(fd: FormData) {
  const titre = (fd.get("titre") as string | null)?.trim();
  return {
    titre,
    salle: (fd.get("salle") as string | null)?.trim() || null,
    date_incident: (fd.get("date_incident") as string | null) || null,
    gravite: (fd.get("gravite") as string | null) ?? "mineur",
    statut: (fd.get("statut") as string | null) ?? "Ouvert",
    description: (fd.get("description") as string | null)?.trim() || null,
  };
}

export async function createIncident(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.titre) return { error: "Le type d'incident est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("incidents").insert(fields);
    if (error) return { error: `Déclaration échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateIncident(id: number, fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.titre) return { error: "Le type d'incident est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("incidents").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteIncident(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("incidents").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
