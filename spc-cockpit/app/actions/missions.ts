"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/missions");
}

function parseForm(fd: FormData) {
  const reference = (fd.get("reference") as string | null)?.trim();
  const client = (fd.get("client") as string | null)?.trim();
  return {
    reference,
    client,
    session: (fd.get("session") as string | null)?.trim() || null,
    date_mission: (fd.get("date_mission") as string | null) || null,
    type: (fd.get("type") as string | null) ?? "Examen écrit",
    nb_salles: Number(fd.get("nb_salles") ?? 1) || 1,
    nb_surveillants: Number(fd.get("nb_surveillants") ?? 1) || 1,
    montant_ht: Number(fd.get("montant_ht") ?? 0) || 0,
    statut: (fd.get("statut") as string | null) ?? "Planifiée",
  };
}

export async function createMission(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("missions").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateMission(id: number, fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("missions").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

// Validation de session (Master Prompt §15.4) : les contrôles bloquants sont
// exécutés côté client via le moteur central ; cette action scelle le statut.
export async function validerSession(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("missions").update({ statut: "Validée" }).eq("id", id);
    if (error) return { error: `Validation échouée : ${error.message}` };
    revalidateOps();
    revalidatePath("/operations/planification");
    revalidatePath("/operations/cockpit");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteMission(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
