"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { journaliser, resumeAffectation } from "@/lib/operations/journal";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/planification");
}

interface Creneau {
  debut: string;
  fin: string;
}

export interface AffectationFields {
  salle: string | null;
  matin: boolean;
  matinDebut: string | null;
  matinFin: string | null;
  apm: boolean;
  apmDebut: string | null;
  apmFin: string | null;
  // Liste complète des créneaux d'une demi-journée (§29). Le 1er créneau est
  // aussi recopié dans matin*/apm* ci-dessus pour la compatibilité.
  matinCreneaux?: Creneau[];
  apmCreneaux?: Creneau[];
}

async function nomSurveillant(supabase: Awaited<ReturnType<typeof createClient>>, surveillantId: number): Promise<string> {
  const { data } = await supabase.from("surveillants").select("nom").eq("id", surveillantId).single();
  return data?.nom ?? `surveillant #${surveillantId}`;
}

export async function updateAffectation(id: number, f: AffectationFields): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("affectations").select("*").eq("id", id).single();

    const matinList = (f.matinCreneaux ?? []).filter((c) => c.debut && c.fin);
    const apmList = (f.apmCreneaux ?? []).filter((c) => c.debut && c.fin);
    const next = {
      salle: f.salle,
      matin: f.matin,
      matin_debut: f.matin ? f.matinDebut : null,
      matin_fin: f.matin ? f.matinFin : null,
      apm: f.apm,
      apm_debut: f.apm ? f.apmDebut : null,
      apm_fin: f.apm ? f.apmFin : null,
      // Source de vérité multi-créneaux (§29) : liste complète, ou null si ≤ 1
      // créneau (on retombe alors sur les colonnes matin*/apm*).
      matin_creneaux: matinList.length > 1 ? matinList : null,
      apm_creneaux: apmList.length > 1 ? apmList : null,
    };
    const { error } = await supabase.from("affectations").update(next).eq("id", id);
    if (error) return { error: `Enregistrement échoué : ${error.message}` };

    // Source de vérité des créneaux (§30) : on remplace la liste complète.
    // Si la table n'existe pas encore (migration non appliquée), on ignore
    // silencieusement — les colonnes matin*/apm* + jsonb assurent le repli.
    const orgId = avant?.org_id ?? (await getActiveOrgId());
    const rows = [
      ...matinList.map((c, i) => ({ affectation_id: id, org_id: orgId, periode: "matin", debut: c.debut, fin: c.fin, ordre: i })),
      ...apmList.map((c, i) => ({ affectation_id: id, org_id: orgId, periode: "apm", debut: c.debut, fin: c.fin, ordre: i })),
    ];
    const del = await supabase.from("creneaux").delete().eq("affectation_id", id);
    if (!del.error && rows.length) await supabase.from("creneaux").insert(rows);

    if (avant) {
      await journaliser(supabase, {
        missionId: avant.mission_id ?? null,
        objet: `Affectation — ${await nomSurveillant(supabase, avant.surveillant_id)}`,
        ancienne: resumeAffectation(avant),
        nouvelle: resumeAffectation(next),
      });
    }

    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function addAffectation(missionId: number, surveillantId: number, roleMission: string): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { error } = await supabase.from("affectations").insert({
      mission_id: missionId,
      surveillant_id: surveillantId,
      role_mission: roleMission,
      statut: "Proposé",
      org_id,
    });
    if (error) return { error: `Ajout échoué : ${error.message}` };

    await journaliser(supabase, {
      missionId,
      objet: `Affectation — ${await nomSurveillant(supabase, surveillantId)}`,
      ancienne: null,
      nouvelle: `ajouté à la session (${roleMission})`,
    });

    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function setPresence(id: number, presence: "En attente" | "Présent" | "Absent"): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("affectations").select("mission_id, surveillant_id, presence").eq("id", id).single();
    const { error } = await supabase.from("affectations").update({ presence }).eq("id", id);
    if (error) return { error: `Émargement échoué : ${error.message}` };

    if (avant) {
      await journaliser(supabase, {
        missionId: avant.mission_id ?? null,
        objet: `Présence — ${await nomSurveillant(supabase, avant.surveillant_id)}`,
        ancienne: avant.presence ?? "En attente",
        nouvelle: presence,
      });
    }

    revalidatePath("/operations/presence");
    revalidatePath("/operations");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteAffectation(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("affectations").select("*").eq("id", id).single();
    const { error } = await supabase.from("affectations").delete().eq("id", id);
    if (error) return { error: `Suppression échouée : ${error.message}` };

    if (avant) {
      await journaliser(supabase, {
        missionId: avant.mission_id ?? null,
        objet: `Affectation — ${await nomSurveillant(supabase, avant.surveillant_id)}`,
        ancienne: resumeAffectation(avant),
        nouvelle: "retiré de la session",
      });
    }

    revalidateOps();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
