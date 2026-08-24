"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { journaliser } from "@/lib/operations/journal";
import { log } from "@/lib/log";
import { normaliserNomSalle } from "@/lib/operations/referentiel-salles";
import {
  entier, texteRequis, premiereErreurDe, messageMetier,
} from "@/lib/operations/validation-serveur";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/salles");
  revalidatePath("/operations/planification");
}

/**
 * Lecture ET validation du formulaire, CÔTÉ SERVEUR (BUG-022). `Number(x) || 0`
 * transformait une saisie non numérique en 0 sans un mot ; les Server Actions
 * étant des points d'entrée réseau, les attributs `min` du navigateur ne
 * protégeaient rien.
 */
function parseForm(fd: FormData): { erreur: string } | { champs: Record<string, unknown> } {
  const nom = texteRequis(fd, "nom", { libelle: "Le nom de la salle", maxLongueur: 120 });
  const capacite = entier(fd, "capacite", { min: 0, max: 5000, defaut: 0, libelle: "La capacité" });
  const etudiants = entier(fd, "etudiants", { min: 0, max: 5000, defaut: 0, libelle: "Le nombre d'étudiants" });
  const nbSurveillants = entier(fd, "nb_surveillants", { min: 0, max: 200, defaut: 0, libelle: "Le nombre de surveillants" });

  const erreur = premiereErreurDe(nom, capacite, etudiants, nbSurveillants);
  if (erreur) return { erreur };

  const cap = (capacite as { valeur: number }).valeur;
  const etu = (etudiants as { valeur: number }).valeur;
  if (etu > cap) {
    return { erreur: `Le nombre d'étudiants (${etu}) dépasse la capacité de la salle (${cap}). Augmentez la capacité ou répartissez les candidats sur une autre salle.` };
  }

  return {
    champs: {
      nom: (nom as { valeur: string }).valeur,
      batiment: (fd.get("batiment") as string | null)?.trim() || null,
      etage: (fd.get("etage") as string | null)?.trim() || null,
      capacite: cap,
      etudiants: etu,
      nb_surveillants: (nbSurveillants as { valeur: number }).valeur,
      pmr: fd.get("pmr") === "true",
      tiers_temps: fd.get("tiers_temps") === "true",
    },
  };
}

/**
 * Salle du même nom déjà présente dans l'organisation. Le rapprochement suit la
 * même normalisation que le référentiel applicatif : « Salle A21 » et « A21 »
 * sont la même salle. Complète l'index unique de la migration 31, qui refuse le
 * doublon en base mais après coup — ici, l'utilisateur est prévenu avant.
 */
async function chercherDoublon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nom: string,
  exclureId?: number,
): Promise<string | null> {
  const cle = normaliserNomSalle(nom);
  if (!cle) return null;
  const { data } = await supabase.from("salles").select("id, nom, batiment");
  for (const s of data ?? []) {
    if (exclureId != null && s.id === exclureId) continue;
    if (normaliserNomSalle(s.nom) === cle) {
      return `Une salle « ${s.nom} »${s.batiment ? ` (${s.batiment})` : ""} existe déjà. Ouvrez sa fiche plutôt que d'en créer une seconde.`;
    }
  }
  return null;
}

export async function createSalle(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const parsed = parseForm(fd);
  if ("erreur" in parsed) return { error: parsed.erreur };

  try {
    const supabase = await createClient();
    const doublon = await chercherDoublon(supabase, String(parsed.champs.nom));
    if (doublon) return { error: doublon };

    const org_id = await getActiveOrgId();
    const { data, error } = await supabase
      .from("salles")
      .insert({ ...parsed.champs, org_id })
      .select("id, nom")
      .single();
    if (error) {
      log.error("[salles] création échouée :", error.message);
      return { error: messageMetier("Création de la salle", error.message) };
    }
    await journaliser(supabase, {
      missionId: null,
      objet: `Salle créée — ${data?.nom ?? parsed.champs.nom}`,
      ancienne: null,
      nouvelle: `capacité ${parsed.champs.capacite}, ${parsed.champs.nb_surveillants} surveillant(s)`,
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[salles] création échouée :", e);
    return { error: messageMetier("Création de la salle", e instanceof Error ? e.message : String(e)) };
  }
}

export async function updateSalle(id: number, fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const parsed = parseForm(fd);
  if ("erreur" in parsed) return { error: parsed.erreur };

  try {
    const supabase = await createClient();
    const doublon = await chercherDoublon(supabase, String(parsed.champs.nom), id);
    if (doublon) return { error: doublon };

    const { data: avant } = await supabase
      .from("salles").select("nom, capacite, nb_surveillants").eq("id", id).single();

    const { error } = await supabase.from("salles").update(parsed.champs).eq("id", id);
    if (error) {
      log.error("[salles] mise à jour échouée :", error.message);
      return { error: messageMetier("Mise à jour de la salle", error.message) };
    }

    // Renommer une salle rompt le rapprochement avec les affectations, qui
    // portent le nom en clair (BUG-004). La trace le dit explicitement.
    const renommee = avant && normaliserNomSalle(avant.nom) !== normaliserNomSalle(String(parsed.champs.nom));
    await journaliser(supabase, {
      missionId: null,
      objet: renommee
        ? `Salle renommée — ${avant?.nom} → ${parsed.champs.nom} (le planning référence encore l'ancien nom)`
        : `Salle modifiée — ${parsed.champs.nom}`,
      ancienne: avant ? `capacité ${avant.capacite}, ${avant.nb_surveillants} surveillant(s)` : null,
      nouvelle: `capacité ${parsed.champs.capacite}, ${parsed.champs.nb_surveillants} surveillant(s)`,
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[salles] mise à jour échouée :", e);
    return { error: messageMetier("Mise à jour de la salle", e instanceof Error ? e.message : String(e)) };
  }
}

// ---------------------------------------------------------------------------
// Suppression protégée par le planning (BUG-004)
// ---------------------------------------------------------------------------

export interface UsageSalle {
  nom: string;
  affectations: number;
  incidents: number;
  devisSalles: number;
}

/**
 * Usage réel d'une salle. Le rapprochement se fait sur le NOM normalisé : tant
 * que `affectations.salle_id` (migration 32) n'est pas renseigné partout, c'est
 * la seule jointure disponible — et c'est précisément l'absence de cette
 * jointure qui constitue BUG-004.
 */
export async function usageSalle(id: number): Promise<UsageSalle> {
  const vide = { nom: `salle #${id}`, affectations: 0, incidents: 0, devisSalles: 0 };
  try {
    const supabase = await createClient();
    const { data: salle } = await supabase.from("salles").select("nom").eq("id", id).single();
    if (!salle?.nom) return vide;
    const cle = normaliserNomSalle(salle.nom);

    const [aff, inc, dvs] = await Promise.all([
      supabase.from("affectations").select("id, salle, salle_id"),
      supabase.from("incidents").select("id, salle"),
      supabase.from("devis_salles").select("id, salle"),
    ]);

    const parNom = (rows: { salle?: string | null }[] | null) =>
      (rows ?? []).filter((r) => normaliserNomSalle(r.salle) === cle).length;

    // Les affectations déjà rattachées par clé étrangère comptent aussi, même
    // si leur libellé texte a divergé depuis.
    const affRows = aff.data ?? [];
    const affCount = affRows.filter(
      (r) => (r as { salle_id?: number | null }).salle_id === id || normaliserNomSalle(r.salle) === cle,
    ).length;

    return {
      nom: salle.nom,
      affectations: affCount,
      incidents: parNom(inc.data),
      devisSalles: parNom(dvs.data),
    };
  } catch (e) {
    log.error("[salles] lecture de l'usage impossible :", e);
    return vide;
  }
}

/**
 * Suppression d'une salle. REFUSÉE tant que le planning la référence : c'est
 * l'invariant INV-004 (« une salle supprimée ne doit plus apparaître au
 * planning »), jusqu'ici inapplicable par construction. Le refus n'est pas
 * contournable par confirmation — contrairement à la suppression d'une mission,
 * il n'existe aucun cas métier où détacher le planning est le comportement
 * voulu : il faut d'abord réaffecter les créneaux.
 */
export async function deleteSalle(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };

  const usage = await usageSalle(id);
  if (usage.affectations > 0) {
    return {
      error: `Suppression refusée : « ${usage.nom} » porte ${usage.affectations} affectation(s) au planning. Réaffectez ces créneaux à une autre salle, puis supprimez la salle.`,
    };
  }
  if (usage.incidents > 0 || usage.devisSalles > 0) {
    const details = [
      usage.incidents > 0 ? `${usage.incidents} incident(s)` : null,
      usage.devisSalles > 0 ? `${usage.devisSalles} ligne(s) de devis` : null,
    ].filter(Boolean).join(" et ");
    return {
      error: `Suppression refusée : « ${usage.nom} » est citée par ${details}. Ces documents perdraient leur référence de salle.`,
    };
  }

  try {
    const supabase = await createClient();
    // Journalisé AVANT : après la suppression, la ligne n'existe plus.
    await journaliser(supabase, {
      missionId: null,
      objet: `Salle supprimée — ${usage.nom}`,
      ancienne: "aucune affectation, aucun incident, aucun devis",
      nouvelle: "supprimée",
    });
    const { error } = await supabase.from("salles").delete().eq("id", id);
    if (error) {
      log.error("[salles] suppression échouée :", error.message);
      return { error: messageMetier("Suppression de la salle", error.message) };
    }
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[salles] suppression échouée :", e);
    return { error: messageMetier("Suppression de la salle", e instanceof Error ? e.message : String(e)) };
  }
}
