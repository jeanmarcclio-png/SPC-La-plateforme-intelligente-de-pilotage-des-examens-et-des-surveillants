"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { getDemandeClient } from "@/lib/operations/demandes";
import { generateDemandeReference, evaluateDemande, buildMissionFromDemande, piecePath, validatePieceMeta, PIECES_BUCKET } from "@/lib/operations/demandes-constants";
import type { Contact, DemandeSalle } from "@/lib/operations/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function revalidateDemandes(id?: number) {
  revalidatePath("/demandes-client");
  if (id) revalidatePath(`/demandes-client/${id}`);
}

/** Journalise une action de demande (best-effort : n'échoue jamais l'appelant). */
async function logDemande(supabase: SupabaseClient, org_id: string | null, demandeId: number, action: string, detail?: string) {
  try {
    await supabase.from("demandes_client_journal").insert({ demande_id: demandeId, org_id, action, detail: detail ?? null });
  } catch { /* le journal ne doit jamais bloquer l'action métier */ }
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
  const statut = str(fd, "statut") || "Brouillon interne";

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
    await logDemande(supabase, org_id, demandeId, "Création", `${salles.length} salle(s) · statut ${statut}`);
    revalidateDemandes(demandeId);
    return { id: demandeId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/** Payload d'un import Excel (spec §10) : infos établissement + salles parsées. */
export interface ImportDemandePayload {
  etablissement: string;
  campus?: string;
  ville?: string;
  typeEtablissement?: string;
  referenceClient?: string;
  observations?: string;
  demandeur: Contact;
  responsableClient: Contact;
  salles: DemandeSalle[];
}

function salleToRow(s: DemandeSalle, i: number) {
  return {
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
  };
}

/**
 * Création d'une demande depuis un import Excel (spec §10.3). Statut initial
 * « Importée depuis Excel » ; réutilise la même plomberie d'insert que la
 * création manuelle. Le contrôle qualité à 3 niveaux reste à faire côté fiche.
 */
export async function importerDemande(payload: ImportDemandePayload): Promise<{ error?: string; id?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const etablissement = payload.etablissement?.trim();
  if (!etablissement) return { error: "Le nom de l'établissement est obligatoire" };

  const salles = (payload.salles ?? []).filter((s) => s.salle?.trim()).map(salleToRow);
  if (salles.length === 0) return { error: "Aucune salle exploitable dans le fichier importé." };

  const c = (x?: Contact) => x ?? {};
  const dem = c(payload.demandeur);
  const rc = c(payload.responsableClient);
  const fields = {
    etablissement,
    campus: payload.campus?.trim() || null,
    ville: payload.ville?.trim() || null,
    reference_client: payload.referenceClient?.trim() || null,
    type_etablissement: payload.typeEtablissement?.trim() || null,
    demandeur_prenom: dem.prenom?.trim() || null,
    demandeur_nom: dem.nom?.trim() || null,
    demandeur_fonction: dem.fonction?.trim() || null,
    demandeur_email: dem.email?.trim() || null,
    demandeur_telephone: dem.telephone?.trim() || null,
    resp_client_prenom: rc.prenom?.trim() || null,
    resp_client_nom: rc.nom?.trim() || null,
    resp_client_fonction: rc.fonction?.trim() || null,
    resp_client_email: rc.email?.trim() || null,
    resp_client_telephone: rc.telephone?.trim() || null,
    observations: payload.observations?.trim() || null,
  };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { data, error } = await supabase
      .from("demandes_client")
      .insert({ ...fields, reference: generateDemandeReference(), statut: "Importée depuis Excel", org_id })
      .select("id")
      .single();
    if (error || !data) return { error: `Import échoué : ${error?.message ?? "aucune ligne"}` };

    const demandeId = data.id as number;
    const rows = salles.map((s) => ({ ...s, demande_id: demandeId, org_id }));
    const { error: sErr } = await supabase.from("demandes_client_salles").insert(rows);
    if (sErr) return { error: `Salles non enregistrées : ${sErr.message}` };

    await logDemande(supabase, org_id, demandeId, "Import Excel", `${salles.length} salle(s) importée(s)`);
    revalidateDemandes(demandeId);
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
    const org_id = await getActiveOrgId();
    const { error } = await supabase
      .from("demandes_client")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Changement de statut échoué : ${error.message}` };
    await logDemande(supabase, org_id, id, "Changement de statut", statut);
    revalidateDemandes(id);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Conversion en mission (spec §13). Disponible uniquement si « Validée SPC ».
 * Crée la mission (statut « À chiffrer »), relie la demande et la passe en
 * « Convertie en mission ». Ne duplique aucun calcul financier (moteur central).
 */
export async function convertirEnMission(id: number): Promise<{ error?: string; missionId?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const demande = await getDemandeClient(id);
  if (!demande) return { error: "Demande introuvable" };
  if (demande.statut !== "Validée SPC") return { error: "Seule une demande « Validée SPC » peut être convertie en mission." };
  if (demande.missionId) return { error: "Cette demande est déjà convertie en mission." };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();

    const { data: mission, error: mErr } = await supabase
      .from("missions")
      .insert({ ...buildMissionFromDemande(demande), org_id })
      .select("id")
      .single();
    if (mErr || !mission) return { error: `Création de mission échouée : ${mErr?.message ?? "aucune ligne"}` };

    const missionId = mission.id as number;
    const { error: uErr } = await supabase
      .from("demandes_client")
      .update({ statut: "Convertie en mission", mission_id: missionId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (uErr) return { error: `Demande non mise à jour : ${uErr.message}` };

    await logDemande(supabase, org_id, id, "Conversion en mission", `Mission #${missionId} · statut À chiffrer`);
    revalidateDemandes(id);
    revalidatePath("/operations/missions");
    return { missionId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Validation SPC (spec §9, §11) : contrôle à 3 niveaux. Bloque sur les erreurs ;
 * les avertissements sont remontés mais n'empêchent pas la validation.
 */
export async function validerDemande(id: number): Promise<{ error?: string; blocages?: string[]; avertissements?: string[] }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const demande = await getDemandeClient(id);
  if (!demande) return { error: "Demande introuvable" };

  const { erreurs, avertissements } = evaluateDemande(demande);
  if (erreurs.length > 0) {
    return { error: `La demande ne peut pas être validée : ${erreurs.length} élément(s) à corriger.`, blocages: erreurs };
  }
  const res = await updateDemandeStatut(id, "Validée SPC");
  if (res.error) return res;
  return { avertissements };
}

// ─── Pièces jointes (Lot B) ──────────────────────────────────────────────────

export async function uploadPiece(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const demandeId = Number(fd.get("demande_id"));
  const file = fd.get("file");
  if (!demandeId || !(file instanceof File)) return { error: "Fichier manquant." };
  const invalid = validatePieceMeta({ name: file.name, size: file.size });
  if (invalid) return { error: invalid };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    if (!org_id) return { error: "Organisation introuvable." };
    const chemin = piecePath(org_id, demandeId, file.name);

    const { error: upErr } = await supabase.storage
      .from(PIECES_BUCKET)
      .upload(chemin, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) return { error: `Envoi échoué : ${upErr.message}` };

    const { error: metaErr } = await supabase.from("demandes_client_pieces").insert({
      demande_id: demandeId, org_id, nom: file.name, chemin, taille: file.size, type_mime: file.type || null,
    });
    if (metaErr) {
      await supabase.storage.from(PIECES_BUCKET).remove([chemin]); // rollback binaire orphelin
      return { error: `Métadonnées non enregistrées : ${metaErr.message}` };
    }
    await logDemande(supabase, org_id, demandeId, "Pièce jointe ajoutée", file.name);
    revalidateDemandes(demandeId);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deletePiece(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { data: piece } = await supabase.from("demandes_client_pieces").select("chemin, demande_id, nom").eq("id", id).single();
    if (!piece) return { error: "Pièce introuvable." };
    await supabase.storage.from(PIECES_BUCKET).remove([piece.chemin as string]);
    const { error } = await supabase.from("demandes_client_pieces").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };
    await logDemande(supabase, org_id, piece.demande_id as number, "Pièce jointe supprimée", piece.nom as string);
    revalidateDemandes(piece.demande_id as number);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/** URL signée à durée courte pour télécharger une pièce (accès contrôlé RLS). */
export async function getPieceSignedUrl(id: number): Promise<{ error?: string; url?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: piece } = await supabase.from("demandes_client_pieces").select("chemin").eq("id", id).single();
    if (!piece) return { error: "Pièce introuvable." };
    const { data, error } = await supabase.storage.from(PIECES_BUCKET).createSignedUrl(piece.chemin as string, 60);
    if (error || !data) return { error: `Lien indisponible : ${error?.message ?? ""}` };
    return { url: data.signedUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * URLs signées de toutes les pièces d'une demande, pour l'assemblage du dossier
 * ZIP côté client (Lot C). Durée courte (120 s) le temps du téléchargement.
 */
export async function getDossierPieces(demandeId: number): Promise<{ error?: string; pieces?: { nom: string; url: string }[] }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("demandes_client_pieces")
      .select("nom, chemin")
      .eq("demande_id", demandeId)
      .order("created_at", { ascending: true });
    if (error) return { error: `Pièces indisponibles : ${error.message}` };
    if (!data?.length) return { pieces: [] };

    const pieces: { nom: string; url: string }[] = [];
    for (const p of data) {
      const { data: signed } = await supabase.storage.from(PIECES_BUCKET).createSignedUrl(p.chemin as string, 120);
      if (signed?.signedUrl) pieces.push({ nom: p.nom as string, url: signed.signedUrl });
    }
    return { pieces };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Demande de correction au client (spec §12) : passe la demande en « À corriger »
 * et consigne le commentaire SPC dans l'historique.
 */
export async function demanderCorrection(id: number, commentaire: string): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const msg = commentaire?.trim();
  if (!msg) return { error: "Merci de préciser la correction demandée." };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { error } = await supabase
      .from("demandes_client")
      .update({ statut: "À corriger", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: `Demande de correction échouée : ${error.message}` };
    await logDemande(supabase, org_id, id, "Demande de correction", msg);
    revalidateDemandes(id);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
