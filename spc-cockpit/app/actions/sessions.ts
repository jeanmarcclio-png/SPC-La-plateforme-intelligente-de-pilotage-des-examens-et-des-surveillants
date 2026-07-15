"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import type { StatutSession } from "@/lib/supabase/sessions";

export interface SessionInput {
  date: string | null;
  creneau: string | null;
  salle: string | null;
  dureeMinutes: number | null;
  statut: StatutSession;
  besoinSurveillants: number;
}

function toRow(f: SessionInput) {
  return {
    date: f.date,
    creneau: f.creneau,
    salle: f.salle,
    duree_minutes: f.dureeMinutes,
    statut: f.statut,
    besoin_surveillants: f.besoinSurveillants,
  };
}

export async function createSession(f: SessionInput): Promise<{ error?: string; id?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    if (!org_id) return { error: "Aucune organisation active." };
    const { data, error } = await supabase
      .from("sessions")
      .insert({ ...toRow(f), org_id })
      .select("id")
      .single();
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidatePath("/operations");
    return { id: data ? String(data.id) : undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateSession(id: string, f: SessionInput): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("sessions").update(toRow(f)).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };
    revalidatePath("/operations");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
