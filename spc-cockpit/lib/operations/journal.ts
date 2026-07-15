// Journal de session (Master Prompt §15.6) — écriture append-only.
// L'échec de journalisation ne bloque jamais l'action métier : il est
// signalé en console mais l'utilisateur n'est pas interrompu.

import type { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/auth/org";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function journaliser(
  supabase: Supabase,
  entry: {
    missionId: number | null;
    objet: string;
    ancienne?: string | null;
    nouvelle?: string | null;
    orgId?: string | null;
  }
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const utilisateur = data.user?.email ?? "inconnu";
    // org_id : fourni par l'appelant sinon résolu depuis l'org active
    // (nécessaire pour que l'insert passe la RLS stricte au durcissement).
    const org_id = entry.orgId !== undefined ? entry.orgId : await getActiveOrgId();
    const { error } = await supabase.from("journal_sessions").insert({
      mission_id: entry.missionId,
      org_id,
      utilisateur,
      objet: entry.objet,
      ancienne: entry.ancienne ?? null,
      nouvelle: entry.nouvelle ?? null,
    });
    if (error) console.warn("Journal de session non écrit :", error.message);
  } catch (e) {
    console.warn("Journal de session non écrit :", e instanceof Error ? e.message : e);
  }
}

/** Résumé lisible d'une affectation pour les colonnes ancienne/nouvelle. */
export function resumeAffectation(a: {
  salle?: string | null;
  matin?: boolean;
  matin_debut?: string | null;
  matin_fin?: string | null;
  apm?: boolean;
  apm_debut?: string | null;
  apm_fin?: string | null;
}): string {
  const parts = [
    a.salle ? `salle ${a.salle}` : "sans salle",
    a.matin ? `matin ${a.matin_debut ?? "?"}–${a.matin_fin ?? "?"}` : "pas de matin",
    a.apm ? `après-midi ${a.apm_debut ?? "?"}–${a.apm_fin ?? "?"}` : "pas d'après-midi",
  ];
  return parts.join(" · ");
}
