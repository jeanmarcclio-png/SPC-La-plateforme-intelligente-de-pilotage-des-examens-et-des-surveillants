import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";
import type { Surveillant, Mission, Affectation, Creneau, Devis, Incident, Salle, Amenagement, Facture, DevisLigne, DevisSalle, DevisEquipe , JournalEntry } from "./types";
import { mockSurveillants, mockMissions, mockAffectations, mockDevis, mockIncidents, mockSalles, mockAmenagements, mockFactures, mockDevisLignes, mockDevisSalles, mockDevisEquipe, mockJournal } from "./mock";
import { demoActif, jeuBase, jeuDemo, jeuErreur, jeuVide, type Jeu } from "./source";

// Chaque lecture retourne un `Jeu<T>` porteur de son ORIGINE (base / demo /
// vide / erreur). Le jeu de démonstration n'est servi que sous `SPC_DEMO=1` :
// une table vide reste vide, une erreur reste une erreur. Voir source.ts.

// Next.js signale certains états par une EXCEPTION de contrôle de flux, qu'il
// doit recevoir intacte : usage dynamique détecté pendant le rendu statique,
// redirect(), notFound(). Les avaler ferait rendre statiquement une page qui
// doit être dynamique. On les relaie donc systématiquement.
const DIGESTS_NEXT = ["DYNAMIC_SERVER_USAGE", "NEXT_REDIRECT", "NEXT_NOT_FOUND", "NEXT_HTTP_ERROR_FALLBACK"];

function estControleNext(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && DIGESTS_NEXT.some((d) => digest.startsWith(d));
}

/** Enveloppe commune : porte de démonstration + capture des exceptions. */
async function source<T>(demo: T[], lire: () => Promise<Jeu<T>>, table: string): Promise<Jeu<T>> {
  if (demoActif()) return jeuDemo(demo);
  try {
    return await lire();
  } catch (e) {
    if (estControleNext(e)) throw e;
    const message = e instanceof Error ? e.message : String(e);
    log.error(`[queries] lecture ${table} impossible :`, message);
    return jeuErreur(message);
  }
}

/** Résultat Supabase → Jeu, en distinguant erreur et absence de ligne. */
function depuisSupabase<Row, T>(
  table: string,
  data: Row[] | null,
  error: { message: string } | null,
  mapper: (row: Row) => T,
): Jeu<T> {
  if (error) {
    log.error(`[queries] lecture ${table} refusée :`, error.message);
    return jeuErreur(error.message);
  }
  if (!data?.length) return jeuVide();
  return jeuBase(data.map(mapper));
}

export async function getSurveillants(): Promise<Jeu<Surveillant>> {
  return source(mockSurveillants, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("surveillants").select("*").order("nom");
    return depuisSupabase("surveillants", data, error, (r) => ({
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
  }, "surveillants");
}

export async function getMissions(): Promise<Jeu<Mission>> {
  return source(mockMissions, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("missions").select("*").order("date_mission", { ascending: false });
    return depuisSupabase("missions", data, error, (r) => ({
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
  }, "missions");
}

export async function getAffectations(): Promise<Jeu<Affectation>> {
  return source(mockAffectations, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("affectations").select("*").order("id");
    if (error) {
      log.error("[queries] lecture affectations refusée :", error.message);
      return jeuErreur<Affectation>(error.message);
    }
    if (!data?.length) return jeuVide<Affectation>();

    // Source de vérité des créneaux : table `creneaux` (§30). Repli gracieux sur
    // le jsonb (§29) puis sur les colonnes matin*/apm* si la table n'existe pas
    // encore (migration non appliquée) — aucun crash dans ce cas.
    const ids = data.map((r) => r.id);
    const { data: creneaux } = await supabase
      .from("creneaux")
      .select("affectation_id, periode, debut, fin, ordre")
      .in("affectation_id", ids.length ? ids : [-1])
      .order("ordre");
    const byAff = new Map<number, { matin: Creneau[]; apm: Creneau[] }>();
    for (const c of creneaux ?? []) {
      const e = byAff.get(c.affectation_id) ?? { matin: [], apm: [] };
      (c.periode === "matin" ? e.matin : e.apm).push({ debut: c.debut, fin: c.fin });
      byAff.set(c.affectation_id, e);
    }

    return jeuBase(data.map((r) => {
      const cr = byAff.get(r.id);
      const matinCreneaux = cr?.matin.length ? cr.matin : Array.isArray(r.matin_creneaux) ? r.matin_creneaux : undefined;
      const apmCreneaux = cr?.apm.length ? cr.apm : Array.isArray(r.apm_creneaux) ? r.apm_creneaux : undefined;
      return {
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
        matinCreneaux,
        apmCreneaux,
        presence: r.presence ?? "En attente",
      };
    }));
  }, "affectations");
}

export async function getDevisList(): Promise<Jeu<Devis>> {
  return source(mockDevis, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
    return depuisSupabase("devis", data, error, (r) => ({
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
  }, "devis");
}

export async function getSalles(): Promise<Jeu<Salle>> {
  return source(mockSalles, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("salles").select("*").order("nom");
    return depuisSupabase("salles", data, error, (r) => ({
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
  }, "salles");
}

export async function getIncidents(): Promise<Jeu<Incident>> {
  return source(mockIncidents, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
    return depuisSupabase("incidents", data, error, (r) => ({
      id: r.id,
      titre: r.titre,
      salle: r.salle ?? undefined,
      dateIncident: r.date_incident ?? undefined,
      gravite: r.gravite ?? "mineur",
      statut: r.statut ?? "Ouvert",
      description: r.description ?? undefined,
      missionId: r.mission_id ?? undefined,
    }));
  }, "incidents");
}

export async function getAmenagements(): Promise<Jeu<Amenagement>> {
  return source(mockAmenagements, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("amenagements").select("*").order("id");
    return depuisSupabase("amenagements", data, error, (r) => ({
      id: r.id,
      amenagement: r.amenagement,
      salle: r.salle ?? undefined,
      tiersTemps: r.tiers_temps ?? false,
      surveillant: r.surveillant ?? undefined,
    }));
  }, "amenagements");
}

export async function getFactures(): Promise<Jeu<Facture>> {
  return source(mockFactures, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("factures").select("*").order("id");
    return depuisSupabase("factures", data, error, (r) => ({
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
  }, "factures");
}

export async function getDevisLignes(): Promise<Jeu<DevisLigne>> {
  return source(mockDevisLignes, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_lignes").select("*").order("ordre");
    return depuisSupabase("devis_lignes", data, error, (r) => ({
      id: r.id,
      devisId: r.devis_id,
      designation: r.designation,
      quantite: Number(r.quantite ?? 1),
      unite: r.unite ?? "forfait",
      prixUnitaire: Number(r.prix_unitaire ?? 0),
      ordre: r.ordre ?? 1,
    }));
  }, "devis_lignes");
}

export async function getDevisSalles(): Promise<Jeu<DevisSalle>> {
  return source(mockDevisSalles, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_salles").select("*").order("ordre");
    return depuisSupabase("devis_salles", data, error, (r) => ({
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
  }, "devis_salles");
}

export async function getDevisEquipe(): Promise<Jeu<DevisEquipe>> {
  return source(mockDevisEquipe, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("devis_equipe").select("*").order("ordre");
    return depuisSupabase("devis_equipe", data, error, (r) => ({
      id: r.id,
      devisId: r.devis_id,
      role: r.role,
      effectif: r.effectif ?? 1,
      heuresPers: Number(r.heures_pers ?? 0),
      tauxH: Number(r.taux_h ?? 0),
      ordre: r.ordre ?? 1,
    }));
  }, "devis_equipe");
}

export async function getJournal(): Promise<Jeu<JournalEntry>> {
  return source(mockJournal, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("journal_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return depuisSupabase("journal_sessions", data, error, (r) => ({
      id: r.id,
      missionId: r.mission_id ?? null,
      utilisateur: r.utilisateur ?? "inconnu",
      objet: r.objet,
      ancienne: r.ancienne ?? null,
      nouvelle: r.nouvelle ?? null,
      createdAt: r.created_at,
    }));
  }, "journal_sessions");
}
