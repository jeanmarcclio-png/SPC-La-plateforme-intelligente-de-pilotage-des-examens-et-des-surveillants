"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/devis");
}

function parseForm(fd: FormData) {
  const reference = (fd.get("reference") as string | null)?.trim();
  const client = (fd.get("client") as string | null)?.trim();
  const montantHT = Number(fd.get("montant_ht") ?? 0) || 0;
  const montantTTCRaw = Number(fd.get("montant_ttc") ?? 0) || 0;
  return {
    reference,
    client,
    session: (fd.get("session") as string | null)?.trim() || null,
    statut: (fd.get("statut") as string | null) ?? "Brouillon",
    montant_ht: montantHT,
    montant_ttc: montantTTCRaw > 0 ? montantTTCRaw : Math.round(montantHT * 1.2 * 100) / 100,
    nb_surveillants: Number(fd.get("nb_surveillants") ?? 0) || 0,
    contact: (fd.get("contact") as string | null)?.trim() || null,
    email: (fd.get("email") as string | null)?.trim() || null,
    ville: (fd.get("ville") as string | null)?.trim() || null,
    type_epreuve: (fd.get("type_epreuve") as string | null)?.trim() || null,
    date_debut: (fd.get("date_debut") as string | null) || null,
    date_fin: (fd.get("date_fin") as string | null) || null,
    frais_deplacement: Number(fd.get("frais_deplacement") ?? 0) || 0,
    frais_coordination: Number(fd.get("frais_coordination") ?? 0) || 0,
    remise: Number(fd.get("remise") ?? 0) || 0,
  };
}

// Chaînage métier : un devis accepté crée (ou retrouve) sa mission.
async function creerMissionDepuisDevis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  devisId: number
): Promise<{ missionRef?: string; error?: string }> {
  const { data: d } = await supabase.from("devis").select("*").eq("id", devisId).single();
  if (!d) return { error: "Devis introuvable" };
  if (d.mission_id) return {}; // mission déjà liée — rien à faire

  // Référence EX-YYYY-NNN suivante
  const { data: refs } = await supabase.from("missions").select("reference");
  const annee = (d.date_debut as string | null)?.slice(0, 4) ?? "2026";
  const max = (refs ?? []).reduce((acc, r) => {
    const n = Number(String(r.reference).match(/^EX-\d{4}-(\d+)$/)?.[1] ?? 0);
    return Math.max(acc, n);
  }, 0);
  const reference = `EX-${annee}-${String(max + 1).padStart(3, "0")}`;

  // Volume salles depuis la répartition du devis (max des deux sessions)
  const { data: salles } = await supabase.from("devis_salles").select("session, salle").eq("devis_id", devisId);
  const matin = new Set((salles ?? []).filter((s) => s.session === "matin").map((s) => s.salle)).size;
  const apm = new Set((salles ?? []).filter((s) => s.session === "apres-midi").map((s) => s.salle)).size;
  const nbSalles = Math.max(matin, apm, 1);

  const { data: mission, error } = await supabase.from("missions").insert({
    reference,
    client: d.client,
    session: d.session,
    date_mission: d.date_debut,
    type: d.type_epreuve ?? "Examen écrit",
    nb_salles: nbSalles,
    nb_surveillants: d.nb_surveillants ?? 1,
    montant_ht: d.montant_ht ?? 0,
    statut: "Planifiée",
  }).select("id, reference").single();
  if (error || !mission) return { error: `Création de la mission échouée : ${error?.message}` };

  await supabase.from("devis").update({ mission_id: mission.id }).eq("id", devisId);
  revalidatePath("/operations/missions");
  revalidatePath("/operations/planification");
  return { missionRef: mission.reference };
}

export async function createDevis(fd: FormData): Promise<{ error?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").insert(fields);
    if (error) return { error: `Création échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateDevis(id: number, fd: FormData): Promise<{ error?: string; missionRef?: string }> {
  const fields = parseForm(fd);
  if (!fields.reference) return { error: "La référence est obligatoire" };
  if (!fields.client) return { error: "Le client est obligatoire" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").update(fields).eq("id", id);
    if (error) return { error: `Mise à jour échouée : ${error.message}` };

    let missionRef: string | undefined;
    if (fields.statut === "Accepté") {
      const chaine = await creerMissionDepuisDevis(supabase, id);
      if (chaine.error) return { error: chaine.error };
      missionRef = chaine.missionRef;
    }

    revalidateOps();
    return { missionRef };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function duplicateDevis(id: number): Promise<{ error?: string; newId?: number }> {
  try {
    const supabase = await createClient();
    const { data: src, error: e1 } = await supabase.from("devis").select("*").eq("id", id).single();
    if (e1 || !src) return { error: "Devis introuvable" };

    const copie = { ...src, id: undefined, created_at: undefined, reference: `${src.reference}-COPIE`, statut: "Brouillon" };
    delete copie.id;
    delete copie.created_at;
    const { data: inserted, error: e2 } = await supabase.from("devis").insert(copie).select("id").single();
    if (e2 || !inserted) return { error: `Duplication échouée : ${e2?.message ?? "insertion impossible"}` };

    const { data: lignes } = await supabase.from("devis_lignes").select("*").eq("devis_id", id);
    if (lignes?.length) {
      await supabase.from("devis_lignes").insert(
        lignes.map((l) => ({ ...l, id: undefined, created_at: undefined, devis_id: inserted.id }))
      );
    }
    const { data: salles } = await supabase.from("devis_salles").select("*").eq("devis_id", id);
    if (salles?.length) {
      await supabase.from("devis_salles").insert(
        salles.map((s) => ({ ...s, id: undefined, created_at: undefined, devis_id: inserted.id }))
      );
    }

    revalidateOps();
    return { newId: inserted.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteDevis(id: number): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("devis").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
