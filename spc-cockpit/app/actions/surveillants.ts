"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";

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

export interface ImportRowInput {
  nom: string;
  role: string;
  statut: string;
  email: string | null;
  telephone: string | null;
  qualifications: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Import en masse de surveillants (CSV). Dédup par nom / email / téléphone :
 * met à jour l'existant si `updateExisting`, sinon l'ignore. Ne supprime rien,
 * ne casse aucune affectation (les surveillants existants conservent leur id).
 */
export async function importSurveillants(
  rows: ImportRowInput[],
  updateExisting: boolean
): Promise<{ error?: string; ajoutes?: number; misAJour?: number; ignores?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  if (!rows.length) return { error: "Aucune ligne à importer" };

  try {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("surveillants").select("id, nom, email, telephone");
    const byNom = new Map<string, number>();
    const byEmail = new Map<string, number>();
    const byTel = new Map<string, number>();
    for (const e of existing ?? []) {
      if (e.nom) byNom.set(norm(e.nom), e.id);
      if (e.email) byEmail.set(norm(e.email), e.id);
      if (e.telephone) byTel.set(String(e.telephone).replace(/\D/g, ""), e.id);
    }

    let ajoutes = 0, misAJour = 0, ignores = 0;
    for (const r of rows) {
      if (!r.nom?.trim()) { ignores++; continue; }
      const matchId =
        byNom.get(norm(r.nom)) ??
        (r.email ? byEmail.get(norm(r.email)) : undefined) ??
        (r.telephone ? byTel.get(r.telephone.replace(/\D/g, "")) : undefined);

      const fields = {
        nom: r.nom.trim(),
        role: r.role || "Surveillant salle",
        statut: r.statut || "Disponible",
        email: r.email || null,
        telephone: r.telephone || null,
        qualifications: r.qualifications || null,
        taux_horaire: 18,
      };

      if (matchId) {
        if (!updateExisting) { ignores++; continue; }
        const { error } = await supabase.from("surveillants").update(fields).eq("id", matchId);
        if (error) return { error: `Mise à jour de ${r.nom} échouée : ${error.message}` };
        misAJour++;
      } else {
        const { data: inserted, error } = await supabase.from("surveillants").insert(fields).select("id, nom, email, telephone").single();
        if (error) return { error: `Import de ${r.nom} échoué : ${error.message}` };
        // évite les doublons internes au fichier
        if (inserted) {
          byNom.set(norm(inserted.nom), inserted.id);
          if (inserted.email) byEmail.set(norm(inserted.email), inserted.id);
          if (inserted.telephone) byTel.set(String(inserted.telephone).replace(/\D/g, ""), inserted.id);
        }
        ajoutes++;
      }
    }

    revalidateOps();
    return { ajoutes, misAJour, ignores };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
