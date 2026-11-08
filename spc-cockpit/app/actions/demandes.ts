"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { prochaineReferenceMission } from "@/lib/operations/reference-mission";
import type { PayloadMission } from "@/lib/operations/demandes/conversion";

// Crée la mission issue d'une demande validée SPC. La référence est attribuée
// par le serveur ; le montant reste nul (le chiffrage passe par le devis).
export async function convertirDemandeEnMission(
  payload: PayloadMission,
): Promise<{ error?: string; missionRef?: string; missionId?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const client = String(payload.client ?? "").trim();
  if (!client) return { error: "Établissement manquant : conversion impossible." };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const annee = (payload.dateMission ?? new Date().toISOString()).slice(0, 4);
    const reference = await prochaineReferenceMission(supabase, annee);
    const { data: mission, error } = await supabase
      .from("missions")
      .insert({
        reference,
        client,
        session: null,
        date_mission: payload.dateMission,
        type: "Examen écrit",
        nb_salles: Number(payload.nbSalles) || 0,
        nb_surveillants: Number(payload.nbSurveillants) || 0,
        montant_ht: 0,
        statut: "À chiffrer",
        org_id,
      })
      .select("id, reference")
      .single();
    if (error || !mission) return { error: `Création de la mission échouée : ${error?.message ?? "réponse vide"}` };

    revalidatePath("/operations/missions");
    revalidatePath("/operations/demandes-client");
    return { missionRef: mission.reference, missionId: mission.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
