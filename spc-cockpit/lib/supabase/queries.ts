import { createClient } from "@/lib/supabase/server";
import type { Campagne, Alerte, Livrable, Prospect } from "@/lib/types";
import {
  campagnes as mockCampagnes,
  alertes as mockAlertes,
  echeances as mockEcheances,
  livraisonIDF as mockLivrables,
  top10Prospects as mockProspects,
} from "@/lib/data";

export async function getCampagnes(): Promise<Campagne[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("campagnes").select("*").order("created_at");
    if (error || !data?.length) return mockCampagnes;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      perimetre: r.perimetre ?? "",
      deadline: r.deadline ?? "",
      joursRestants: r.jours_restants ?? 0,
      score: r.score ?? 0,
      statut: r.statut ?? "En cours",
      nombreProspects: r.nombre_prospects ?? 0,
      tresChaudes: r.tres_chaudes ?? 0,
    }));
  } catch {
    return mockCampagnes;
  }
}

export async function getAlertes(): Promise<Alerte[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("alertes").select("*").order("created_at");
    if (error || !data?.length) return mockAlertes;
    return data.map((r) => ({
      id: r.id,
      type: r.type as Alerte["type"],
      titre: r.titre,
      description: r.description ?? "",
      count: r.count ?? 0,
    }));
  } catch {
    return mockAlertes;
  }
}

export async function getEcheances() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("echeances").select("*").order("id");
    if (error || !data?.length) return mockEcheances;
    return data.map((r) => ({
      date: r.date,
      nom: r.nom,
      tag: r.tag ?? "",
      urgent: r.urgent ?? false,
    }));
  } catch {
    return mockEcheances;
  }
}

export async function getLivrables(campagneId?: string): Promise<Livrable[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("livrables").select("*").order("id");
    if (campagneId) query = query.eq("campagne_id", campagneId);
    const { data, error } = await query;
    if (error || !data?.length) return mockLivrables;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      description: r.description ?? "",
      statut: r.statut as Livrable["statut"],
      fichier: r.fichier ?? undefined,
    }));
  } catch {
    return mockLivrables;
  }
}

export async function getProspects(campagneId?: string): Promise<Prospect[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("prospects").select("*").order("score_bant", { ascending: false });
    if (campagneId) query = query.eq("campagne_id", campagneId);
    const { data, error } = await query;
    if (error || !data?.length) return mockProspects;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      segment: r.segment as Prospect["segment"],
      cluster: r.cluster ?? "",
      scoreBANT: r.score_bant ?? 0,
      niveau: r.niveau as Prospect["niveau"],
      priorite: r.priorite as Prospect["priorite"],
      vague: r.vague as Prospect["vague"],
      interlocuteur: r.interlocuteur ?? "",
      canal: r.canal ?? "",
      statut: r.statut as Prospect["statut"],
      action: r.action ?? "",
      notes: r.notes ?? undefined,
    }));
  } catch {
    return mockProspects;
  }
}
