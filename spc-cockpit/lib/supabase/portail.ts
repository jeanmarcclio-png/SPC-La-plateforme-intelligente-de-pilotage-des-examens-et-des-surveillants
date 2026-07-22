// Couche données du portail surveillant (serveur, RLS-scopée).
// Aucune donnée de mock ici : ce qui n'est pas autorisé par la RLS ne remonte
// pas. À n'importer que côté serveur.

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export type InvitationStatut = "non_invite" | "invite" | "actif";

export interface InvitationRow {
  id: number;
  nom: string;
  email: string | null;
  statut: InvitationStatut;
}

/** Statut d'invitation par surveillant (écran admin coordinateur). */
export async function getInvitationStatuses(): Promise<InvitationRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("surveillants")
      .select("id, nom, email, user_id, invited_at")
      .order("nom");
    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as number,
      nom: r.nom as string,
      email: (r.email as string) ?? null,
      statut: r.user_id ? "actif" : r.invited_at ? "invite" : "non_invite",
    }));
  } catch {
    return [];
  }
}

/** Un créneau tel qu'affiché au surveillant. */
export interface MonCreneau {
  periode: "matin" | "apm";
  debut: string;
  fin: string;
}

export interface MonAffectation {
  id: number;
  date: string | null;      // date de la mission (ISO)
  dateLabel: string;
  creneau: string;          // « Matin », « Après-midi », « Journée »
  creneaux: MonCreneau[];   // détail de chaque plage horaire (§30)
  salle: string | null;
  dureeMinutes: number | null;
  statut: string;           // 'confirmee' | 'prevue' | 'Proposé' | 'Confirmé' …
  decline: boolean;
  reference: string | null; // référence mission (contexte)
}

function minutesEntre(debut?: string | null, fin?: string | null): number {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
}

/** Le surveillant (fiche) rattaché au compte courant, ou null. */
export async function getMonSurveillantId(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("surveillants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return (data?.id as number) ?? null;
  } catch {
    return null;
  }
}

/** Affectations à venir du surveillant courant, triées chronologiquement. */
export async function getMesAffectations(): Promise<MonAffectation[]> {
  try {
    const supabase = await createClient();
    // RLS : ne remonte que les affectations du surveillant courant.
    const { data: affs, error } = await supabase.from("affectations").select("*");
    if (error || !affs?.length) return [];

    const missionIds = [...new Set(affs.map((a) => a.mission_id).filter(Boolean))];
    const { data: missions } = await supabase
      .from("missions")
      .select("id, reference, date_mission")
      .in("id", missionIds.length ? missionIds : [-1]);
    const missionById = new Map((missions ?? []).map((m) => [m.id, m]));

    // Détail des créneaux (§30) — RLS : ne remonte que ceux du surveillant.
    // Repli gracieux sur matin*/apm* si la table n'existe pas encore.
    const affIds = affs.map((a) => a.id);
    const { data: creneaux } = await supabase
      .from("creneaux")
      .select("affectation_id, periode, debut, fin, ordre")
      .in("affectation_id", affIds.length ? affIds : [-1])
      .order("ordre");
    const creneauxByAff = new Map<number, MonCreneau[]>();
    for (const c of creneaux ?? []) {
      const list = creneauxByAff.get(c.affectation_id) ?? [];
      list.push({ periode: c.periode as "matin" | "apm", debut: c.debut, fin: c.fin });
      creneauxByAff.set(c.affectation_id, list);
    }

    const rows: MonAffectation[] = affs.map((a) => {
      const m = a.mission_id ? missionById.get(a.mission_id) : null;
      const date = (m?.date_mission as string) ?? null;
      // Créneaux : table §30 en priorité, sinon repli sur les colonnes uniques.
      let liste = creneauxByAff.get(a.id) ?? [];
      if (liste.length === 0) {
        if (a.matin && a.matin_debut && a.matin_fin) liste.push({ periode: "matin", debut: a.matin_debut, fin: a.matin_fin });
        if (a.apm && a.apm_debut && a.apm_fin) liste.push({ periode: "apm", debut: a.apm_debut, fin: a.apm_fin });
      }
      liste = liste.sort((x, y) => x.debut.localeCompare(y.debut));
      const hasMatin = liste.some((c) => c.periode === "matin");
      const hasApm = liste.some((c) => c.periode === "apm");
      const creneau = hasMatin && hasApm ? "Journée" : hasMatin ? "Matin" : hasApm ? "Après-midi" : "Créneau à définir";
      const duree = liste.reduce((n, c) => n + minutesEntre(c.debut, c.fin), 0);
      return {
        id: a.id as number,
        date,
        dateLabel: date
          ? new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
          : "Date à confirmer",
        creneau,
        creneaux: liste,
        salle: (a.salle as string) ?? null,
        dureeMinutes: duree || null,
        statut: (a.statut as string) ?? "prevue",
        decline: Boolean(a.decline),
        reference: (m?.reference as string) ?? null,
      };
    });

    return rows.sort((x, y) => (x.date ?? "9999").localeCompare(y.date ?? "9999"));
  } catch {
    return [];
  }
}

export interface RefusRow {
  affectationId: number;
  surveillantNom: string;
  surveillantId: number;
  missionRef: string | null;
  salle: string | null;
  motif: string | null;
  decidedAt: string | null;
}

/**
 * File « à traiter » côté coordinateur : affectations refusées par un surveillant
 * (decline = true). La RLS laisse le coordinateur voir toute l'organisation.
 */
export async function getRefusEnAttente(): Promise<RefusRow[]> {
  try {
    const supabase = await createClient();
    const { data: affs, error } = await supabase
      .from("affectations")
      .select("id, surveillant_id, mission_id, salle, motif, decided_at, decline")
      .eq("decline", true)
      .order("decided_at", { ascending: false });
    if (error || !affs?.length) return [];

    const survIds = [...new Set(affs.map((a) => a.surveillant_id).filter(Boolean))];
    const misIds = [...new Set(affs.map((a) => a.mission_id).filter(Boolean))];
    const [{ data: survs }, { data: missions }] = await Promise.all([
      supabase.from("surveillants").select("id, nom").in("id", survIds.length ? survIds : [-1]),
      supabase.from("missions").select("id, reference").in("id", misIds.length ? misIds : [-1]),
    ]);
    const survById = new Map((survs ?? []).map((s) => [s.id, s.nom as string]));
    const misById = new Map((missions ?? []).map((m) => [m.id, m.reference as string]));

    return affs.map((a) => ({
      affectationId: a.id as number,
      surveillantId: a.surveillant_id as number,
      surveillantNom: survById.get(a.surveillant_id) ?? `Surveillant #${a.surveillant_id}`,
      missionRef: a.mission_id ? misById.get(a.mission_id) ?? null : null,
      salle: (a.salle as string) ?? null,
      motif: (a.motif as string) ?? null,
      decidedAt: (a.decided_at as string) ?? null,
    }));
  } catch {
    return [];
  }
}

export interface Disponibilite {
  date: string;
  matin: boolean;
  aprem: boolean;
  commentaire: string | null;
}

/** Disponibilités du surveillant courant sur une plage de dates (ISO). */
export async function getMesDisponibilites(fromISO: string, toISO: string): Promise<Disponibilite[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("disponibilites")
      .select("date, matin, aprem, commentaire")
      .gte("date", fromISO)
      .lte("date", toISO)
      .order("date");
    return (data ?? []).map((d) => ({
      date: d.date as string,
      matin: Boolean(d.matin),
      aprem: Boolean(d.aprem),
      commentaire: (d.commentaire as string) ?? null,
    }));
  } catch {
    return [];
  }
}
