"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { anonymizedSurveillantFields } from "@/lib/rgpd/anonymize";
import { buildExportDossier, buildAffectationsCsv } from "@/lib/rgpd/export";

/**
 * Droit d'accès / portabilité : exporte TOUTES les données d'un surveillant
 * (identité, affectations, disponibilités, heures) en JSON + CSV.
 */
export async function exporterDonneesSurveillant(
  surveillantId: number
): Promise<{ error?: string; json?: string; csv?: string; nom?: string }> {
  const auth = await requireCapability("validate"); // coordinateur+
  if (!auth.ok) return { error: auth.error };

  try {
    const supabase = await createClient();
    const { data: s } = await supabase.from("surveillants").select("*").eq("id", surveillantId).maybeSingle();
    if (!s) return { error: "Surveillant introuvable." };

    const [{ data: affectations }, { data: disponibilites }] = await Promise.all([
      supabase.from("affectations").select("*").eq("surveillant_id", surveillantId),
      supabase.from("disponibilites").select("*").eq("surveillant_id", surveillantId),
    ]);

    const dossier = buildExportDossier(s, affectations ?? [], disponibilites ?? []);
    const csv = buildAffectationsCsv(affectations ?? []);

    return { json: JSON.stringify(dossier, null, 2), csv, nom: s.nom };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

/**
 * Droit à l'effacement : anonymise un surveillant (même logique que la purge
 * automatique) — email/nom/téléphone effacés, agrégats d'heures conservés
 * (paie), compte auth supprimé. Écrit un événement d'audit.
 */
export async function anonymiserSurveillant(
  surveillantId: number
): Promise<{ error?: string; ok?: boolean }> {
  const auth = await requireCapability("admin"); // admin uniquement
  if (!auth.ok) return { error: auth.error };

  const admin = createServiceClient();
  if (!admin) return { error: "Indisponible : SUPABASE_SERVICE_ROLE_KEY non configurée." };
  const orgId = await getActiveOrgId();

  try {
    const { data: s } = await admin
      .from("surveillants")
      .select("id, user_id")
      .eq("id", surveillantId)
      .maybeSingle();
    if (!s) return { error: "Surveillant introuvable." };

    // Anonymisation (heures / taux / nb_examens PRÉSERVÉS pour la paie).
    const { error: uErr } = await admin
      .from("surveillants")
      .update(anonymizedSurveillantFields(surveillantId))
      .eq("id", surveillantId);
    if (uErr) return { error: `Anonymisation échouée : ${uErr.message}` };

    // Suppression du compte auth lié (plus de connexion possible).
    if (s.user_id) {
      try {
        await admin.auth.admin.deleteUser(s.user_id as string);
      } catch {
        /* compte déjà absent : ignoré */
      }
    }

    // Événement d'audit.
    await admin.from("evenements").insert({
      org_id: orgId,
      type: "anonymisation_individuelle",
      detail: { surveillant_id: surveillantId, agregats_preserves: "heures/taux/nb_examens" },
      nb_lignes: 1,
    });

    revalidatePath("/operations/surveillants");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
