"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/planification");
}

export interface AffectationFields {
  salle: string | null;
  matin: boolean;
  matinDebut: string | null;
  matinFin: string | null;
  apm: boolean;
  apmDebut: string | null;
  apmFin: string | null;
}

export async function updateAffectation(id: number, f: AffectationFields): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("affectations").update({
      salle: f.salle,
      matin: f.matin,
      matin_debut: f.matin ? f.matinDebut : null,
      matin_fin: f.matin ? f.matinFin : null,
      apm: f.apm,
      apm_debut: f.apm ? f.apmDebut : null,
      apm_fin: f.apm ? f.apmFin : null,
    }).eq("id", id);
    if (error) return { error: `Enregistrement échoué : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function addAffectation(missionId: number, surveillantId: number, roleMission: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("affectations").insert({
      mission_id: missionId,
      surveillant_id: surveillantId,
      role_mission: roleMission,
      statut: "Proposé",
    });
    if (error) return { error: `Ajout échoué : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteAffectation(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("affectations").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
