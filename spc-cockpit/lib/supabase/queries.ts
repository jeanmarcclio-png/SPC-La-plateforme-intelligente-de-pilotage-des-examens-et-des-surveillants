import { createClient } from "@/lib/supabase/server";
import type { Campagne, Alerte, Livrable, Prospect } from "@/lib/types";
import { calcJoursRestants } from "@/lib/data";
import {
  campagnes as mockCampagnes,
  alertes as mockAlertes,
  echeances as mockEcheances,
  livraisonIDF as mockLivrables,
  top10Prospects as mockProspects,
  clusterScores as mockClusterScores,
  segmentRepartition as mockSegmentRepartition,
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
      joursRestants: r.deadline ? calcJoursRestants(r.deadline) : (r.jours_restants ?? 0),
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
    if (error || !data?.length) return mockEcheances.map((e, i) => ({ id: i + 1, ...e, urgent: (e as { urgent?: boolean }).urgent ?? false }));
    return data.map((r) => ({
      id: r.id as number,
      date: r.date,
      nom: r.nom,
      tag: r.tag ?? "",
      urgent: r.urgent ?? false,
    }));
  } catch {
    return mockEcheances.map((e, i) => ({ id: i + 1, ...e, urgent: (e as { urgent?: boolean }).urgent ?? false }));
  }
}

export async function getLivrables(campagneId?: string): Promise<Livrable[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("livrables").select("*, campagnes(nom)").order("id");
    if (campagneId) query = query.eq("campagne_id", campagneId);
    const { data, error } = await query;
    if (error || !data?.length) return mockLivrables;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      description: r.description ?? "",
      statut: r.statut as Livrable["statut"],
      fichier: r.fichier ?? undefined,
      campagneId: r.campagne_id ?? undefined,
      campagneNom: (r.campagnes as { nom?: string } | null)?.nom ?? undefined,
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
      email: r.email ?? undefined,
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
      telephone: r.telephone ?? undefined,
      contactPrincipal: r.contact_principal ?? undefined,
      fonctionContact: r.fonction_contact ?? undefined,
      prochaineRelance: r.prochaine_relance ?? undefined,
      valeurPotentielle: r.valeur_potentielle ?? undefined,
      derniereInteraction: r.derniere_interaction ?? undefined,
      nbEtudiants: r.nb_etudiants ?? undefined,
      sessionsParAn: r.sessions_par_an ?? undefined,
      campagneId: r.campagne_id ?? undefined,
    }));
  } catch {
    return mockProspects;
  }
}

const SEGMENT_COLORS: Record<string, string> = {
  "Commerce":  "#1a6b7e",
  "CPGE":      "#4a90d9",
  "Santé":     "#38a169",
  "Université":"#805ad5",
};

const CLUSTER_LABELS: Record<string, string> = {
  "Lyon/RA":     "Lyon / Rhône-Alpes",
  "Paris IDF":   "Paris IDF",
  "Lille/HdF":   "Lille / HdF",
  "Bordeaux/NA": "Bordeaux / NA",
  "PACA":        "Marseille / PACA",
  "Nancy/GE":    "Nancy / Grand Est",
};

export async function getClusterScores() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("prospects").select("cluster, score_bant");
    if (error || !data?.length) return mockClusterScores;

    const map: Record<string, { total: number; count: number }> = {};
    for (const r of data) {
      const key = r.cluster ?? "Autre";
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += r.score_bant ?? 0;
      map[key].count += 1;
    }
    return Object.entries(map)
      .map(([key, { total, count }]) => ({
        nom: CLUSTER_LABELS[key] ?? key,
        score: Math.round((total / count) * 10) / 10,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return mockClusterScores;
  }
}

export async function getSegmentRepartition() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("prospects").select("segment");
    if (error || !data?.length) return mockSegmentRepartition;

    const map: Record<string, number> = {};
    for (const r of data) {
      const seg = r.segment ?? "Autre";
      map[seg] = (map[seg] ?? 0) + 1;
    }
    return Object.entries(map).map(([nom, count]) => ({
      nom,
      count,
      color: SEGMENT_COLORS[nom] ?? "#a0aec0",
    }));
  } catch {
    return mockSegmentRepartition;
  }
}
