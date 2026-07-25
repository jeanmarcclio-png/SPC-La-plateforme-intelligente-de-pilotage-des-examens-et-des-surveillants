"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { getDemandeClient } from "@/lib/operations/demandes";
import { generateDemandeReference, validateDemande } from "@/lib/operations/demandes-constants";
import type { DemandeSalle } from "@/lib/operations/types";

function revalidateDemandes() {
  revalidatePath("/demandes-client");
}

const str = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() || null;
const bool = (fd: FormData, k: string) => { const v = fd.get(k); return v === "on" || v === "true"; };
const int = (fd: FormData, k: string) => Number(fd.get(k) ?? 0) || 0;

function parseSalles(fd: FormData): Array<Record<string, unknown>> {
  let raw: DemandeSalle[] = [];
  try { raw = JSON.parse((fd.get("salles_json") as string) || "[]"); } catch { raw = []; }
  return raw
    .filter((s) => s.salle?.trim())
    .map((s, i) => ({
      date_examen: s.dateExamen || null,
      creneau: s.creneau ?? "matin",
      salle: s.salle.trim(),
      batiment: s.batiment?.trim() || null,
      etudiants: Number(s.etudiants) || 0,
      surveillants: Number(s.surveillants) || 1,
      pmr: Boolean(s.pmr),
      tiers_temps: Boolean(s.tiersTemps),
      debut_examen: s.debutExamen || null,
      fin_examen: s.finExamen || null,
      debut_surveillance: s.debutSurveillance || null,
      fin_surveillance: s.finSurveillance || null,
      observations: s.observations?.trim() || null,
      ordre: i + 1,
    }));
}

function parseDemande(fd: FormData) {
  let besoins: string[] = [];
  try { besoins = JSON.parse((fd.get("besoins_json") as string) || "[]"); } catch { besoins = []; }
  return {
    etablissement: str(fd, "etablissement"),
    campus: str(fd, "campus"),
    adresse: str(fd, "adresse"),
    ville: str(fd, "ville"),
    code_postal: str(fd, "code_postal"),
    reference_client: str(fd, "reference_client"),
    type_etablissement: str(fd, "type_etablissement"),
    contact_administratif: str(fd, "contact_administratif"),
    demandeur_prenom: str(fd, "demandeur_prenom"),
    demandeur_nom: str(fd, "demandeur_nom"),
    demandeur_fonction: str(fd, "demandeur_fonction"),
    demandeur_email: str(fd, "demandeur_email"),
    demandeur_telephone: str(fd, "demandeur_telephone"),
    demandeur_service: str(fd, "demandeur_service"),
    resp_client_prenom: str(fd, "resp_client_prenom"),
    resp_client_nom: str(fd, "resp_client_nom"),
    resp_client_fonction: str(fd, "resp_client_fonction"),
    resp_client_email: str(fd, "resp_client_email"),
    resp_client_telephone: str(fd, "resp_client_telephone"),
    resp_client_service: str(fd, "resp_client_service"),
    resp_spc: str(fd, "resp_spc"),
    resp_spc_email: str(fd, "resp_spc_email"),
    resp_spc_role: str(fd, "resp_spc_role"),
    pmr_present: bool(fd, "pmr_present"),
    pmr_nombre: int(fd, "pmr_nombre"),
    pmr_details: str(fd, "pmr_details"),
    tiers_temps_present: bool(fd, "tiers_temps_present"),
    tiers_temps_nombre: int(fd, "tiers_temps_nombre"),
    tiers_temps_details: str(fd, "tiers_temps_details"),
    besoins_specifiques: besoins,
    observations: str(fd, "observations"),
  };
}

export async function createDemande(fd: FormData): Promise<{ error?: string; id?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const fields = parseDemande(fd);
  if (!fields.etablissement) return { error: "Le nom de l'établissement est obligatoire" };

  const salles = parseSalles(fd);
  const reference = str(fd, "reference") || generateDemandeReference();
  const statut = str(fd, "statut") || "Brouillon";

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { data, error } = await supabase
      .from("demandes_client")
      .insert({ ...fields, reference, statut, org_id })
      .select("id")
      .single();
    if (error || !data) return { error: `Création échouée : ${error?.message ?? "aucune ligne"}` };

    const demandeId = data.id as number;
    if (salles.length > 0) {
      const rows = salles.map((s) => ({ ...s, demande_id: demandeId, org_id }));
      const { error: sErr } = await supabase.from("demandes_client_salles").insert(rows);
      if (sErr) return { error: `Salles non enregistrées : ${sErr.message}` };
    }
    revalidateDemandes();
    return { id: demandeId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateDemandeStatut(id: number, statut: string): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("demandes_client")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Changement de statut échoué : ${error.message}` };
    revalidateDemandes();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Validation SPC (spec §12) : exécute les contrôles bloquants puis scelle la
 * demande en « Validée SPC ». Retourne la liste des erreurs si non conforme.
 */
export async function validerDemande(id: number): Promise<{ error?: string; blocages?: string[] }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const demande = await getDemandeClient(id);
  if (!demande) return { error: "Demande introuvable" };

  const blocages = validateDemande(demande);
  if (blocages.length > 0) {
    return { error: `La demande ne peut pas être validée : ${blocages.length} élément(s) à corriger.`, blocages };
  }
  return updateDemandeStatut(id, "Validée SPC");
}
