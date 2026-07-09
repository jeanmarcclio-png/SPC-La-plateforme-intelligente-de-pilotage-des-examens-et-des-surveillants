import { createClient } from "@/lib/supabase/server";
import type { Surveillant, Mission, Affectation, Devis, Incident, Salle, Amenagement, Facture, DevisLigne, DevisSalle, DevisEquipe , JournalEntry } from "./types";
import { mockSurveillants, mockMissions, mockAffectations, mockDevis, mockIncidents, mockSalles, mockAmenagements, mockFactures, mockDevisLignes, mockDevisSalles, mockDevisEquipe, mockJournal } from "./mock";

export async function getSurveillants(): Promise<Surveillant[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("surveillants").select("*").order("nom");
    if (error || !data?.length) return mockSurveillants;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      prenom: r.prenom ?? undefined,
      zone: r.zone ?? undefined,
      dispoMatin: r.dispo_matin ?? undefined,
      dispoApm: r.dispo_apm ?? undefined,
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
      type: r.type ?? "Examen écrit",
      nbSalles: r.nb_salles ?? 1,
      nbSurveillants: r.nb_surveillants ?? 1,
      montantHT: Number(r.montant_ht ?? 0),
      statut: r.statut ?? "Planifiée",
      notes: r.notes ?? undefined,
    }));
  } catch {
    return mockMissions;
  }
}

export async function getAffectations(): Promise<Affectation[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("affectations").select("*").order("id");
    if (error || !data?.length) return mockAffectations;
    return data.map((r) => ({
      id: r.id,
      missionId: r.mission_id,
      surveillantId: r.surveillant_id,
      roleMission: r.role_mission ?? undefined,
      statut: r.statut ?? "Proposé",
      salle: r.salle ?? undefined,
      matin: r.matin ?? false,
      matinDebut: r.matin_debut ?? undefined,
      matinFin: r.matin_fin ?? undefined,
      apm: r.apm ?? false,
      apmDebut: r.apm_debut ?? undefined,
      apmFin: r.apm_fin ?? undefined,
      presence: r.presence ?? "En attente",
    }));
  } catch {
    return mockAffectations;
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
      contact: r.contact ?? undefined,
      email: r.email ?? undefined,
      ville: r.ville ?? undefined,
      typeEpreuve: r.type_epreuve ?? undefined,
      dateDebut: r.date_debut ?? undefined,
      dateFin: r.date_fin ?? undefined,
      coefficient: Number(r.coefficient ?? 1) || 1,
      fraisDeplacement: Number(r.frais_deplacement ?? 0),
      fraisCoordination: Number(r.frais_coordination ?? 0),
      remise: Number(r.remise ?? 0),
    }));
  } catch {
    return mockDevis;
  }
}

export async function getSalles(): Promise<Salle[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("salles").select("*").order("nom");
    if (error || !data?.length) return mockSalles;
    return data.map((r) => ({
      id: r.id,
      nom: r.nom,
      batiment: r.batiment ?? undefined,
      etage: r.etage ?? undefined,
      capacite: r.capacite ?? 0,
      etudiants: r.etudiants ?? 0,
      nbSurveillants: r.nb_surveillants ?? 0,
      pmr: r.pmr ?? false,
      tiersTemps: r.tiers_temps ?? false,
    }));
  } catch {
    return mockSalles;
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

export async function getAmenagements(): Promise<Amenagement[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("amenagements").select("*").order("id");
    if (error || !data?.length) return mockAmenagements;
    return data.map((r) => ({
      id: r.id,
      amenagement: r.amenagement,
      salle: r.salle ?? undefined,
      tiersTemps: r.tiers_temps ?? false,
      surveillant: r.surveillant ?? undefined,
    }));
  } catch {
    return mockAmenagements;
  }
}

export async function getFactures(): Promise<Facture[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("factures").select("*").order("id");
    if (error || !data?.length) return mockFactures;
    return data.map((r) => ({
      id: r.id,
      reference: r.reference,
      client: r.client,
      session: r.session ?? undefined,
      statut: r.statut ?? "À facturer",
      montantHT: Number(r.montant_ht ?? 0),
      montantTTC: Number(r.montant_ttc ?? 0),
      emission: r.emission ?? undefined,
      echeance: r.echeance ?? undefined,
      devisId: r.devis_id ?? undefined,
    }));
  } catch {
    return mockFactures;
  }
}

export async function getDevisLignes(): Promise<DevisLigne[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_lignes").select("*").order("ordre");
    if (error || !data?.length) return mockDevisLignes;
    return data.map((r) => ({
      id: r.id,
      devisId: r.devis_id,
      designation: r.designation,
      quantite: Number(r.quantite ?? 1),
      unite: r.unite ?? "forfait",
      prixUnitaire: Number(r.prix_unitaire ?? 0),
      ordre: r.ordre ?? 1,
    }));
  } catch {
    return mockDevisLignes;
  }
}

export async function getDevisSalles(): Promise<DevisSalle[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_salles").select("*").order("ordre");
    if (error || !data?.length) return mockDevisSalles;
    return data.map((r) => ({
      id: r.id,
      devisId: r.devis_id,
      session: r.session === "apres-midi" ? "apres-midi" as const : "matin" as const,
      salle: r.salle,
      etudiants: r.etudiants ?? 0,
      surveillants: r.surveillants ?? 1,
      pmr: r.pmr ?? false,
      tiersTemps: r.tiers_temps ?? false,
      debut: r.debut ?? undefined,
      fin: r.fin ?? undefined,
      observations: r.observations ?? undefined,
      ordre: r.ordre ?? 1,
    }));
  } catch {
    return mockDevisSalles;
  }
}

export async function getDevisEquipe(): Promise<DevisEquipe[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_equipe").select("*").order("ordre");
    if (error || !data?.length) return mockDevisEquipe;
    return data.map((r) => ({
      id: r.id,
      devisId: r.devis_id,
      role: r.role,
      effectif: r.effectif ?? 1,
      heuresPers: Number(r.heures_pers ?? 0),
      tauxH: Number(r.taux_h ?? 0),
      ordre: r.ordre ?? 1,
    }));
  } catch {
    return mockDevisEquipe;
  }
}

export async function getJournal(): Promise<JournalEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("journal_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data?.length) return mockJournal;
    return data.map((r) => ({
      id: r.id,
      missionId: r.mission_id ?? null,
      utilisateur: r.utilisateur ?? "inconnu",
      objet: r.objet,
      ancienne: r.ancienne ?? null,
      nouvelle: r.nouvelle ?? null,
      createdAt: r.created_at,
    }));
  } catch {
    return mockJournal;
  }
}
