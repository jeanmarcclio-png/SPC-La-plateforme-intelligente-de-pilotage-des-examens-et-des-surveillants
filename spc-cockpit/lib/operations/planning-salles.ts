import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Une salle validée à couvrir en planning (issue du devis lié à la mission). */
export interface SalleACouvrir {
  session: "matin" | "apres-midi";
  salle: string;
  etudiants: number;
  surveillants: number;
  pmr: boolean;
  tiersTemps: boolean;
  debut: string | null;
  fin: string | null;
  observations: string | null;
}

function mapSalle(r: Record<string, unknown>): SalleACouvrir {
  return {
    session: r.session === "apres-midi" ? "apres-midi" : "matin",
    salle: (r.salle as string) ?? "",
    etudiants: Number(r.etudiants ?? 0),
    surveillants: Number(r.surveillants ?? 0),
    pmr: Boolean(r.pmr),
    tiersTemps: Boolean(r.tiers_temps),
    debut: (r.debut as string) ?? null,
    fin: (r.fin as string) ?? null,
    observations: (r.observations as string) ?? null,
  };
}

/**
 * Salles validées à couvrir, indexées par mission (§16). Reprend le détail des
 * salles/horaires depuis le devis rattaché à chaque mission (devis_salles).
 * Retourne {} si rien n'est disponible (aucun devis lié).
 */
export async function getSallesACouvrirParMission(): Promise<Record<number, SalleACouvrir[]>> {
  try {
    const supabase = await createClient();
    const { data: devisRows } = await supabase
      .from("devis")
      .select("id, mission_id")
      .not("mission_id", "is", null);
    if (!devisRows?.length) return {};

    const missionByDevis = new Map<number, number>();
    for (const d of devisRows) missionByDevis.set(d.id as number, d.mission_id as number);
    const devisIds = devisRows.map((d) => d.id as number);

    const { data: salles } = await supabase
      .from("devis_salles")
      .select("*")
      .in("devis_id", devisIds)
      .order("ordre");
    if (!salles?.length) return {};

    const out: Record<number, SalleACouvrir[]> = {};
    for (const row of salles) {
      const missionId = missionByDevis.get(row.devis_id as number);
      if (!missionId) continue;
      (out[missionId] ??= []).push(mapSalle(row));
    }
    return out;
  } catch {
    return {};
  }
}
