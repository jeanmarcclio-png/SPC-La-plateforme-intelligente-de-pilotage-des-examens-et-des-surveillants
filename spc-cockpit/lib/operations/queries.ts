import { createClient } from "@/lib/supabase/server";
import type { Surveillant, Mission, Devis, Incident } from "./types";
import { mockSurveillants, mockMissions, mockDevis, mockIncidents } from "./mock";

export async function getSurveillants(): Promise<Surveillant[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("surveillants").select("*").order("nom");
    if (error || !data?.length) return mockSurveillants;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      role: r.role ?? "Surveillant salle",
      statut: r.statut ?? "Disponible",
      email: r.email ?? undefined,
      telephone: r.telephone ?? undefined,
      qualifications: r.qualifications ?? undefined,
      nbExamens: r.nb_examens ?? 0,
      heures: Number(r.heures ?? 0),
      note: Number(r.note ?? 0),
      tauxHoraire: Number(r.taux_horaire ?? 0),
    }));
  } catch {
    return mockSurveillants;
  }
}

export async function getMissions(): Promise<Mission[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("missions").select("*").order("date_mission", { ascending: false });
    if (error || !data?.length) return mockMissions;
    return data.map((r) => ({
      id: r.id,
      reference: r.reference,
      client: r.client,
      session: r.session ?? undefined,
      dateMission: r.date_mission ?? undefined,
      nbSalles: r.nb_salles ?? 1,
      nbSurveillants: r.nb_surveillants ?? 1,
      statut: r.statut ?? "Planifiée",
      notes: r.notes ?? undefined,
    }));
  } catch {
    return mockMissions;
  }
}

export async function getDevisList(): Promise<Devis[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
    if (error || !data?.length) return mockDevis;
    return data.map((r) => ({
      id: r.id,
      reference: r.reference,
      client: r.client,
      session: r.session ?? undefined,
      statut: r.statut ?? "Brouillon",
      montantHT: Number(r.montant_ht ?? 0),
      montantTTC: Number(r.montant_ttc ?? 0),
      nbSurveillants: r.nb_surveillants ?? 0,
      missionId: r.mission_id ?? undefined,
    }));
  } catch {
    return mockDevis;
  }
}

export async function getIncidents(): Promise<Incident[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
    if (error || !data?.length) return mockIncidents;
    return data.map((r) => ({
      id: r.id,
      titre: r.titre,
      salle: r.salle ?? undefined,
      dateIncident: r.date_incident ?? undefined,
      gravite: r.gravite ?? "mineur",
      statut: r.statut ?? "Ouvert",
      description: r.description ?? undefined,
      missionId: r.mission_id ?? undefined,
    }));
  } catch {
    return mockIncidents;
  }
}
