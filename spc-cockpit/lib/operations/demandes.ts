import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DemandeClient, DemandeSalle, DemandeJournalEntry } from "./types";

// ─── Mock (fallback : Supabase absent / table vide, comme le reste du module) ─
export const mockDemandes: DemandeClient[] = [
  {
    id: 1,
    reference: "DC-2026-0420",
    statut: "À vérifier SPC",
    etablissement: "EM Lyon Business School",
    campus: "Écully",
    ville: "Lyon",
    codePostal: "69130",
    referenceClient: "EML-2026-S1",
    typeEtablissement: "Business school",
    demandeur: { prenom: "Claire", nom: "Bonnet", fonction: "Responsable examens", email: "c.bonnet@em-lyon.com", telephone: "04 78 33 78 00" },
    responsableClient: { prenom: "Marc", nom: "Delaunay", fonction: "Directeur scolarité", email: "m.delaunay@em-lyon.com" },
    responsableSpc: { nom: "Julien Mercier", email: "j.mercier@spc.fr", role: "Coordinateur" },
    pmrPresent: true, pmrNombre: 3, pmrDetails: "Accès ascenseur bâtiment B",
    tiersTempsPresent: true, tiersTempsNombre: 5, tiersTempsDetails: "Majoration 1/3 temps",
    besoinsSpecifiques: ["Contrôle d'identité", "Émargement"],
    observations: "Session partiels S1 — 3 salles simultanées.",
    salles: [
      { id: 1, dateExamen: "2026-01-12", creneau: "matin", salle: "A21", batiment: "A", etudiants: 120, surveillants: 3, pmr: true, tiersTemps: true, debutExamen: "09:00", finExamen: "11:00", debutSurveillance: "08:30", finSurveillance: "11:30", ordre: 1 },
      { id: 2, dateExamen: "2026-01-12", creneau: "apres-midi", salle: "B14", batiment: "B", etudiants: 90, surveillants: 2, pmr: false, tiersTemps: false, debutExamen: "14:00", finExamen: "16:00", debutSurveillance: "13:30", finSurveillance: "16:30", ordre: 2 },
    ],
    createdAt: "2026-07-20",
    updatedAt: "2026-07-22",
  },
  {
    id: 2,
    reference: "DC-2026-0418",
    statut: "Brouillon interne",
    etablissement: "IFSI CHU Lyon",
    ville: "Lyon",
    typeEtablissement: "IFSI",
    demandeur: { prenom: "Sophie", nom: "Girard", fonction: "Cadre pédagogique", email: "s.girard@chu-lyon.fr" },
    responsableClient: { prenom: "", nom: "", email: "" },
    responsableSpc: { nom: "Julien Mercier" },
    pmrPresent: false, pmrNombre: 0,
    tiersTempsPresent: false, tiersTempsNombre: 0,
    besoinsSpecifiques: [],
    observations: "Demande reçue par téléphone — à compléter.",
    salles: [
      { id: 3, dateExamen: "2026-02-03", creneau: "matin", salle: "C02", etudiants: 60, surveillants: 2, pmr: false, tiersTemps: false, debutSurveillance: "08:30", finSurveillance: "11:30", ordre: 1 },
    ],
    createdAt: "2026-07-18",
    updatedAt: "2026-07-18",
  },
];

function mapSalle(r: Record<string, unknown>): DemandeSalle {
  return {
    id: r.id as number,
    dateExamen: (r.date_examen as string) ?? undefined,
    creneau: (r.creneau as "matin" | "apres-midi") ?? "matin",
    salle: (r.salle as string) ?? "",
    batiment: (r.batiment as string) ?? undefined,
    etudiants: Number(r.etudiants ?? 0),
    surveillants: Number(r.surveillants ?? 1),
    pmr: Boolean(r.pmr),
    tiersTemps: Boolean(r.tiers_temps),
    debutExamen: (r.debut_examen as string) ?? undefined,
    finExamen: (r.fin_examen as string) ?? undefined,
    debutSurveillance: (r.debut_surveillance as string) ?? undefined,
    finSurveillance: (r.fin_surveillance as string) ?? undefined,
    observations: (r.observations as string) ?? undefined,
    ordre: Number(r.ordre ?? 1),
  };
}

function mapDemande(r: Record<string, unknown>, salles: DemandeSalle[]): DemandeClient {
  return {
    id: r.id as number,
    reference: (r.reference as string) ?? "",
    statut: (r.statut as DemandeClient["statut"]) ?? "Brouillon",
    etablissement: (r.etablissement as string) ?? "",
    campus: (r.campus as string) ?? undefined,
    adresse: (r.adresse as string) ?? undefined,
    ville: (r.ville as string) ?? undefined,
    codePostal: (r.code_postal as string) ?? undefined,
    referenceClient: (r.reference_client as string) ?? undefined,
    typeEtablissement: (r.type_etablissement as string) ?? undefined,
    contactAdministratif: (r.contact_administratif as string) ?? undefined,
    demandeur: {
      prenom: (r.demandeur_prenom as string) ?? undefined,
      nom: (r.demandeur_nom as string) ?? undefined,
      fonction: (r.demandeur_fonction as string) ?? undefined,
      email: (r.demandeur_email as string) ?? undefined,
      telephone: (r.demandeur_telephone as string) ?? undefined,
      service: (r.demandeur_service as string) ?? undefined,
    },
    responsableClient: {
      prenom: (r.resp_client_prenom as string) ?? undefined,
      nom: (r.resp_client_nom as string) ?? undefined,
      fonction: (r.resp_client_fonction as string) ?? undefined,
      email: (r.resp_client_email as string) ?? undefined,
      telephone: (r.resp_client_telephone as string) ?? undefined,
      service: (r.resp_client_service as string) ?? undefined,
    },
    responsableSpc: {
      nom: (r.resp_spc as string) ?? undefined,
      email: (r.resp_spc_email as string) ?? undefined,
      role: (r.resp_spc_role as string) ?? undefined,
    },
    pmrPresent: Boolean(r.pmr_present),
    pmrNombre: Number(r.pmr_nombre ?? 0),
    pmrDetails: (r.pmr_details as string) ?? undefined,
    tiersTempsPresent: Boolean(r.tiers_temps_present),
    tiersTempsNombre: Number(r.tiers_temps_nombre ?? 0),
    tiersTempsDetails: (r.tiers_temps_details as string) ?? undefined,
    besoinsSpecifiques: Array.isArray(r.besoins_specifiques) ? (r.besoins_specifiques as string[]) : [],
    observations: (r.observations as string) ?? undefined,
    salles,
    missionId: (r.mission_id as number) ?? undefined,
    createdAt: (r.created_at as string) ?? undefined,
    updatedAt: (r.updated_at as string) ?? undefined,
  };
}

export async function getDemandesClient(): Promise<DemandeClient[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("demandes_client")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error || !data?.length) return mockDemandes;

    const ids = data.map((d) => d.id);
    const { data: sallesRows } = await supabase
      .from("demandes_client_salles")
      .select("*")
      .in("demande_id", ids)
      .order("ordre");

    const byDemande = new Map<number, DemandeSalle[]>();
    for (const row of sallesRows ?? []) {
      const list = byDemande.get(row.demande_id as number) ?? [];
      list.push(mapSalle(row));
      byDemande.set(row.demande_id as number, list);
    }
    return data.map((r) => mapDemande(r, byDemande.get(r.id as number) ?? []));
  } catch {
    return mockDemandes;
  }
}

export async function getDemandeClient(id: number): Promise<DemandeClient | null> {
  const all = await getDemandesClient();
  return all.find((d) => d.id === id) ?? null;
}

export async function getDemandeJournal(demandeId: number): Promise<DemandeJournalEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("demandes_client_journal")
      .select("*")
      .eq("demande_id", demandeId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as number,
      action: r.action as string,
      detail: (r.detail as string) ?? undefined,
      utilisateur: (r.utilisateur as string) ?? undefined,
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
