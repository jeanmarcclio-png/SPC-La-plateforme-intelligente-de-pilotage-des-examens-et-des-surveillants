// Accès en lecture à la table `sessions` (sessions d'examen — modèle SaaS).
// Lecture serveur ; la RLS filtre par organisation au durcissement.

import { createClient } from "@/lib/supabase/server";

export type StatutSession = "prevue" | "annulee";

export interface SessionExamen {
  id: string;
  orgId: string | null;
  date: string | null;
  creneau: string | null;
  salle: string | null;
  dureeMinutes: number | null;
  statut: StatutSession;
  besoinSurveillants: number;
  createdAt: string | null;
}

function mapRow(r: Record<string, unknown>): SessionExamen {
  return {
    id: String(r.id),
    orgId: r.org_id ? String(r.org_id) : null,
    date: (r.date as string) ?? null,
    creneau: (r.creneau as string) ?? null,
    salle: (r.salle as string) ?? null,
    dureeMinutes: (r.duree_minutes as number) ?? null,
    statut: (r.statut as StatutSession) ?? "prevue",
    besoinSurveillants: (r.besoin_surveillants as number) ?? 0,
    createdAt: (r.created_at as string) ?? null,
  };
}

/** Sessions de l'organisation active (RLS-scopées). Vide si erreur/aucune. */
export async function getSessions(): Promise<SessionExamen[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("sessions").select("*").order("date");
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}
