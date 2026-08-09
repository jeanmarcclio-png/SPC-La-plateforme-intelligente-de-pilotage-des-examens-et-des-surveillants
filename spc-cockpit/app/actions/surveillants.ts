"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { journaliser } from "@/lib/operations/journal";
import { log } from "@/lib/log";
import { montant, texteRequis, premiereErreurDe, messageMetier } from "@/lib/operations/validation-serveur";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/surveillants");
}

function parseForm(fd: FormData) {
  // Prénom et nom (de famille) sont saisis séparément ; `nom` stocke le nom
  // complet affiché partout, `prenom` conserve le prénom structuré.
  const prenom = (fd.get("prenom") as string | null)?.trim() || "";
  const nomFamille = (fd.get("nom") as string | null)?.trim() || "";
  const nom = [prenom, nomFamille].filter(Boolean).join(" ").trim();
  return {
    nom,
    prenom: prenom || null,
    zone: (fd.get("zone") as string | null)?.trim() || null,
    dispo_matin: (fd.get("dispo_matin") as string | null)?.trim() || null,
    dispo_apm: (fd.get("dispo_apm") as string | null)?.trim() || null,
    role: (fd.get("role") as string | null) ?? "Surveillant salle",
    statut: (fd.get("statut") as string | null) ?? "Disponible",
    email: (fd.get("email") as string | null)?.trim() || null,
    telephone: (fd.get("telephone") as string | null)?.trim() || null,
    qualifications: (fd.get("qualifications") as string | null)?.trim() || null,
    taux_horaire: 0, // renseigné après validation (voir champsValides)
    note: 0,
  };
}

/**
 * Validation CÔTÉ SERVEUR (BUG-022). `Number(x) || 18` transformait
 * silencieusement un taux horaire de 0 € en 18 €, et une saisie non numérique
 * en valeur de repli — sans jamais le dire à l'utilisateur.
 */
function champsValides(fd: FormData): { erreur: string } | { champs: ReturnType<typeof parseForm> } {
  const base = parseForm(fd);
  const nom = texteRequis(fd, "nom", { libelle: "Le nom", maxLongueur: 120 });
  const taux = montant(fd, "taux_horaire", { min: 0, defaut: 18, libelle: "Le taux horaire" });
  const note = montant(fd, "note", { min: 0, defaut: 0, libelle: "La note" });
  const erreur = premiereErreurDe(nom, taux, note);
  if (erreur) return { erreur };
  if (!base.nom) return { erreur: "Le nom est obligatoire" };
  return {
    champs: {
      ...base,
      taux_horaire: (taux as { valeur: number }).valeur,
      note: (note as { valeur: number }).valeur,
    },
  };
}

export async function createSurveillant(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const valide = champsValides(fd);
  if ("erreur" in valide) return { error: valide.erreur };
  const fields = valide.champs;

  try {
    const supabase = await createClient();
    // org_id injecté systématiquement : la ligne créée est rattachée à
    // l'organisation active (prépare la RLS stricte). NULL si aucune org (mode
    // transition / avant backfill) — non bloquant.
    const org_id = await getActiveOrgId();

    // Anti-doublon : la création manuelle n'effectuait AUCUN contrôle là où
    // l'import CSV déduplique par nom / e-mail / téléphone (BUG-013). Deux
    // points d'entrée pour la même entité, deux politiques.
    const doublon = await chercherDoublon(supabase, fields);
    if (doublon) {
      return { error: `Un surveillant « ${doublon.nom} » existe déjà avec les mêmes coordonnées. Ouvrez sa fiche pour la compléter plutôt que de créer un doublon.` };
    }

    const { data, error } = await supabase.from("surveillants").insert({ ...fields, org_id }).select("id, nom").single();
    if (error) {
      log.error("[surveillants] création échouée :", error.message);
      return { error: messageMetier("Création du surveillant", error.message) };
    }
    await journaliser(supabase, {
      missionId: null,
      objet: `Surveillant ajouté — ${data?.nom ?? fields.nom}`,
      ancienne: null,
      nouvelle: fields.statut,
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[surveillants] création échouée :", e);
    return { error: messageMetier("Création du surveillant", e instanceof Error ? e.message : String(e)) };
  }
}

/** Recherche un surveillant existant par nom, e-mail ou téléphone normalisés. */
async function chercherDoublon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fields: { nom: string; email: string | null; telephone: string | null },
): Promise<{ id: number; nom: string } | null> {
  const { data } = await supabase.from("surveillants").select("id, nom, email, telephone");
  if (!data?.length) return null;
  const nomN = norm(fields.nom);
  const mailN = fields.email ? norm(fields.email) : null;
  const telN = fields.telephone ? fields.telephone.replace(/\D/g, "") : null;
  for (const e of data) {
    if (e.nom && norm(e.nom) === nomN) return { id: e.id, nom: e.nom };
    if (mailN && e.email && norm(e.email) === mailN) return { id: e.id, nom: e.nom };
    if (telN && e.telephone && String(e.telephone).replace(/\D/g, "") === telN) return { id: e.id, nom: e.nom };
  }
  return null;
}

export async function updateSurveillant(id: number, fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const valide = champsValides(fd);
  if ("erreur" in valide) return { error: valide.erreur };
  const fields = valide.champs;

  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("surveillants").select("nom, statut").eq("id", id).single();
    const { error } = await supabase.from("surveillants").update(fields).eq("id", id);
    if (error) {
      log.error("[surveillants] mise à jour échouée :", error.message);
      return { error: messageMetier("Mise à jour du surveillant", error.message) };
    }
    await journaliser(supabase, {
      missionId: null,
      objet: `Surveillant modifié — ${fields.nom}`,
      ancienne: avant?.statut ?? null,
      nouvelle: fields.statut,
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[surveillants] mise à jour échouée :", e);
    return { error: messageMetier("Mise à jour du surveillant", e instanceof Error ? e.message : String(e)) };
  }
}

export interface DependancesSurveillant {
  affectations: number;
  missions: string[];
  nom: string;
}

/**
 * Dépendances d'un surveillant. Le schéma porte `surveillant_id ... on delete
 * cascade` (migration 01) : supprimer un surveillant DÉTRUIT toutes ses
 * affectations, sans avertissement et sans trace (BUG-003). L'appelant doit
 * présenter ce décompte avant de confirmer.
 */
export async function dependancesSurveillant(id: number): Promise<DependancesSurveillant> {
  const vide = { affectations: 0, missions: [] as string[], nom: `surveillant #${id}` };
  try {
    const supabase = await createClient();
    const [surv, aff] = await Promise.all([
      supabase.from("surveillants").select("nom").eq("id", id).single(),
      supabase.from("affectations").select("mission_id").eq("surveillant_id", id),
    ]);
    const missionIds = [...new Set((aff.data ?? []).map((a) => a.mission_id).filter(Boolean))];
    let libelles: string[] = [];
    if (missionIds.length) {
      const { data } = await supabase.from("missions").select("client, reference").in("id", missionIds);
      libelles = (data ?? []).map((m) => `${m.client} (${m.reference})`);
    }
    return { affectations: aff.data?.length ?? 0, missions: libelles, nom: surv.data?.nom ?? vide.nom };
  } catch (e) {
    log.error("[surveillants] lecture des dépendances impossible :", e);
    return vide;
  }
}

/**
 * Désactivation — action RECOMMANDÉE à la place de la suppression. Conserve la
 * fiche, l'historique et les affectations passées ; le surveillant sort
 * simplement des listes de disponibilité.
 */
export async function desactiverSurveillant(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("surveillants").select("nom, statut").eq("id", id).single();
    const { error } = await supabase.from("surveillants").update({ statut: "Indisponible" }).eq("id", id);
    if (error) {
      log.error("[surveillants] désactivation échouée :", error.message);
      return { error: messageMetier("Désactivation du surveillant", error.message) };
    }
    await journaliser(supabase, {
      missionId: null,
      objet: `Surveillant désactivé — ${avant?.nom ?? `#${id}`}`,
      ancienne: avant?.statut ?? null,
      nouvelle: "Indisponible",
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[surveillants] désactivation échouée :", e);
    return { error: messageMetier("Désactivation du surveillant", e instanceof Error ? e.message : String(e)) };
  }
}

/**
 * Suppression définitive. REFUSE tant que l'appelant n'a pas confirmé avoir vu
 * les affectations qui seront détruites en cascade.
 */
export async function deleteSurveillant(id: number, confirme = false): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const dep = await dependancesSurveillant(id);
  if (dep.affectations > 0 && !confirme) {
    const ou = dep.missions.length ? ` sur ${dep.missions.slice(0, 3).join(", ")}${dep.missions.length > 3 ? "…" : ""}` : "";
    return {
      error: `Suppression non confirmée : ${dep.nom} porte ${dep.affectations} affectation(s)${ou}. Elles seront détruites avec la fiche. Préférez la désactivation, qui conserve l'historique du planning.`,
    };
  }

  try {
    const supabase = await createClient();
    await journaliser(supabase, {
      missionId: null,
      objet: `Surveillant supprimé — ${dep.nom}`,
      ancienne: `${dep.affectations} affectation(s) détruite(s)`,
      nouvelle: "supprimé",
    });
    const { error } = await supabase.from("surveillants").delete().eq("id", id);
    if (error) {
      log.error("[surveillants] suppression échouée :", error.message);
      return { error: messageMetier("Suppression du surveillant", error.message) };
    }
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[surveillants] suppression échouée :", e);
    return { error: messageMetier("Suppression du surveillant", e instanceof Error ? e.message : String(e)) };
  }
}

export interface ImportRowInput {
  nom: string;
  prenom?: string | null;
  zone?: string | null;
  dispoMatin?: string | null;
  dispoApm?: string | null;
  role: string;
  statut: string;
  email: string | null;
  telephone: string | null;
  qualifications: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Import en masse de surveillants (CSV). Dédup par nom / email / téléphone :
 * met à jour l'existant si `updateExisting`, sinon l'ignore. Ne supprime rien,
 * ne casse aucune affectation (les surveillants existants conservent leur id).
 */
export async function importSurveillants(
  rows: ImportRowInput[],
  updateExisting: boolean
): Promise<{ error?: string; ajoutes?: number; misAJour?: number; ignores?: number }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  if (!rows.length) return { error: "Aucune ligne à importer" };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { data: existing } = await supabase.from("surveillants").select("id, nom, email, telephone");
    const byNom = new Map<string, number>();
    const byEmail = new Map<string, number>();
    const byTel = new Map<string, number>();
    for (const e of existing ?? []) {
      if (e.nom) byNom.set(norm(e.nom), e.id);
      if (e.email) byEmail.set(norm(e.email), e.id);
      if (e.telephone) byTel.set(String(e.telephone).replace(/\D/g, ""), e.id);
    }

    let ajoutes = 0, misAJour = 0, ignores = 0;
    for (const r of rows) {
      if (!r.nom?.trim()) { ignores++; continue; }
      const matchId =
        byNom.get(norm(r.nom)) ??
        (r.email ? byEmail.get(norm(r.email)) : undefined) ??
        (r.telephone ? byTel.get(r.telephone.replace(/\D/g, "")) : undefined);

      const fields = {
        nom: r.nom.trim(),
        prenom: r.prenom || null,
        zone: r.zone || null,
        dispo_matin: r.dispoMatin || null,
        dispo_apm: r.dispoApm || null,
        role: r.role || "Surveillant salle",
        statut: r.statut || "Disponible",
        email: r.email || null,
        telephone: r.telephone || null,
        qualifications: r.qualifications || null,
        taux_horaire: 18,
      };

      if (matchId) {
        if (!updateExisting) { ignores++; continue; }
        const { error } = await supabase.from("surveillants").update(fields).eq("id", matchId);
        if (error) return { error: `Mise à jour de ${r.nom} échouée : ${error.message}` };
        misAJour++;
      } else {
        const { data: inserted, error } = await supabase.from("surveillants").insert({ ...fields, org_id }).select("id, nom, email, telephone").single();
        if (error) return { error: `Import de ${r.nom} échoué : ${error.message}` };
        // évite les doublons internes au fichier
        if (inserted) {
          byNom.set(norm(inserted.nom), inserted.id);
          if (inserted.email) byEmail.set(norm(inserted.email), inserted.id);
          if (inserted.telephone) byTel.set(String(inserted.telephone).replace(/\D/g, ""), inserted.id);
        }
        ajoutes++;
      }
    }

    revalidateOps();
    return { ajoutes, misAJour, ignores };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
