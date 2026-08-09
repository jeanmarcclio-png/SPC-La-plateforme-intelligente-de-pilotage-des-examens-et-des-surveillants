"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { journaliser } from "@/lib/operations/journal";
import { requireCapability } from "@/lib/auth/session";
import { getActiveOrgId } from "@/lib/auth/org";
import { log } from "@/lib/log";
import { allowedTransitions, MISSION_STATUTS } from "@/lib/operations/mission-status";
import type { StatutMission } from "@/lib/operations/types";
import {
  entier, montant, texteRequis, premiereErreurDe, messageMetier,
} from "@/lib/operations/validation-serveur";

function revalidateOps() {
  revalidatePath("/operations");
  revalidatePath("/operations/missions");
}

/**
 * Lecture ET validation du formulaire, CÔTÉ SERVEUR (BUG-022). Les attributs
 * `min` du navigateur ne protègent que le navigateur : un appel direct au
 * Server Action passait sans aucun contrôle, et `Number(x) || repli`
 * transformait 0 en 1 et une saisie invalide en 0 €.
 */
function parseForm(fd: FormData): { erreur: string } | { champs: Record<string, unknown> } {
  const reference = texteRequis(fd, "reference", { libelle: "La référence", maxLongueur: 60 });
  const client = texteRequis(fd, "client", { libelle: "Le client", maxLongueur: 120 });
  const nbSalles = entier(fd, "nb_salles", { min: 1, max: 500, defaut: 1, libelle: "Le nombre de salles" });
  const nbSurveillants = entier(fd, "nb_surveillants", { min: 1, max: 2000, defaut: 1, libelle: "Le nombre de surveillants" });
  const montantHT = montant(fd, "montant_ht", { min: 0, defaut: 0, libelle: "Le montant HT" });

  const erreur = premiereErreurDe(reference, client, nbSalles, nbSurveillants, montantHT);
  if (erreur) return { erreur };

  const statutBrut = (fd.get("statut") as string | null) ?? "Planifiée";
  if (!(MISSION_STATUTS as string[]).includes(statutBrut)) {
    return { erreur: `Statut inconnu : « ${statutBrut} »` };
  }

  return {
    champs: {
      reference: (reference as { valeur: string }).valeur,
      client: (client as { valeur: string }).valeur,
      session: (fd.get("session") as string | null)?.trim() || null,
      date_mission: (fd.get("date_mission") as string | null) || null,
      type: (fd.get("type") as string | null) ?? "Examen écrit",
      nb_salles: (nbSalles as { valeur: number }).valeur,
      nb_surveillants: (nbSurveillants as { valeur: number }).valeur,
      montant_ht: (montantHT as { valeur: number }).valeur,
      statut: statutBrut,
    },
  };
}

export async function createMission(fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const parsed = parseForm(fd);
  if ("erreur" in parsed) return { error: parsed.erreur };

  try {
    const supabase = await createClient();
    const org_id = await getActiveOrgId();
    const { data, error } = await supabase
      .from("missions")
      .insert({ ...parsed.champs, org_id })
      .select("id, reference, client")
      .single();
    if (error) {
      log.error("[missions] création échouée :", error.message);
      return { error: messageMetier("Création de la mission", error.message) };
    }
    await journaliser(supabase, {
      missionId: data?.id ?? null,
      objet: `Mission créée — ${data?.client ?? ""} (${data?.reference ?? ""})`,
      ancienne: null,
      nouvelle: String(parsed.champs.statut),
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[missions] création échouée :", e);
    return { error: messageMetier("Création de la mission", e instanceof Error ? e.message : String(e)) };
  }
}

export async function updateMission(id: number, fd: FormData): Promise<{ error?: string }> {
  const auth = await requireCapability("plan");
  if (!auth.ok) return { error: auth.error };
  const parsed = parseForm(fd);
  if ("erreur" in parsed) return { error: parsed.erreur };

  try {
    const supabase = await createClient();
    const { data: avant } = await supabase
      .from("missions")
      .select("statut, client, reference")
      .eq("id", id)
      .single();

    // Contrôle de transition CÔTÉ SERVEUR (BUG-011). Le formulaire ne propose
    // plus que les transitions légales, mais le Server Action est un point
    // d'entrée réseau : sans ce contrôle, « Terminée → Brouillon » restait
    // possible par appel direct.
    const ancien = avant?.statut as StatutMission | undefined;
    const nouveau = parsed.champs.statut as StatutMission;
    if (ancien && nouveau !== ancien && !allowedTransitions(ancien).includes(nouveau)) {
      const permises = allowedTransitions(ancien);
      return {
        error: permises.length
          ? `Transition refusée : une mission « ${ancien} » ne peut passer qu'à ${permises.join(" ou ")}.`
          : `Transition refusée : « ${ancien} » est un statut terminal, la mission ne peut plus changer d'état.`,
      };
    }

    const { error } = await supabase.from("missions").update(parsed.champs).eq("id", id);
    if (error) {
      log.error("[missions] mise à jour échouée :", error.message);
      return { error: messageMetier("Mise à jour de la mission", error.message) };
    }

    await journaliser(supabase, {
      missionId: id,
      objet: `Mission modifiée — ${avant?.client ?? `mission #${id}`}`,
      ancienne: ancien ?? null,
      nouvelle: nouveau,
    });
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[missions] mise à jour échouée :", e);
    return { error: messageMetier("Mise à jour de la mission", e instanceof Error ? e.message : String(e)) };
  }
}

// Validation de session (Master Prompt §15.4) : les contrôles bloquants sont
// exécutés côté client via planification-vue ; cette action scelle le statut.
export async function validerSession(id: number): Promise<{ error?: string }> {
  const auth = await requireCapability("validate");
  if (!auth.ok) return { error: auth.error };
  try {
    const supabase = await createClient();
    const { data: avant } = await supabase.from("missions").select("statut, client").eq("id", id).single();

    const ancien = avant?.statut as StatutMission | undefined;
    if (ancien && ancien !== "Validée" && !allowedTransitions(ancien).includes("Validée")) {
      return { error: `Validation refusée : une mission « ${ancien} » ne peut pas être validée.` };
    }

    const { error } = await supabase.from("missions").update({ statut: "Validée" }).eq("id", id);
    if (error) {
      log.error("[missions] validation échouée :", error.message);
      return { error: messageMetier("Validation de la session", error.message) };
    }

    await journaliser(supabase, {
      missionId: id,
      objet: `Statut de session — ${avant?.client ?? `mission #${id}`}`,
      ancienne: avant?.statut ?? null,
      nouvelle: "Validée",
    });
    revalidateOps();
    revalidatePath("/operations/planification");
    revalidatePath("/operations/cockpit");
    return {};
  } catch (e) {
    log.error("[missions] validation échouée :", e);
    return { error: messageMetier("Validation de la session", e instanceof Error ? e.message : String(e)) };
  }
}

// ---------------------------------------------------------------------------
// Suppression — dépendances annoncées avant destruction (BUG-003)
// ---------------------------------------------------------------------------

export interface DependancesMission {
  affectations: number;
  incidents: number;
  devis: number;
  libelle: string;
}

/**
 * Dépendances d'une mission. Le schéma porte `on delete cascade` sur
 * `affectations` : une suppression détruit le planning SANS avertissement.
 * L'appelant DOIT présenter ce décompte avant de confirmer.
 */
export async function dependancesMission(id: number): Promise<DependancesMission> {
  const vide = { affectations: 0, incidents: 0, devis: 0, libelle: `mission #${id}` };
  try {
    const supabase = await createClient();
    const [mission, aff, inc, dev] = await Promise.all([
      supabase.from("missions").select("client, reference").eq("id", id).single(),
      supabase.from("affectations").select("id", { count: "exact", head: true }).eq("mission_id", id),
      supabase.from("incidents").select("id", { count: "exact", head: true }).eq("mission_id", id),
      supabase.from("devis").select("id", { count: "exact", head: true }).eq("mission_id", id),
    ]);
    return {
      affectations: aff.count ?? 0,
      incidents: inc.count ?? 0,
      devis: dev.count ?? 0,
      libelle: mission.data ? `${mission.data.client} (${mission.data.reference})` : vide.libelle,
    };
  } catch (e) {
    log.error("[missions] lecture des dépendances impossible :", e);
    return vide;
  }
}

/**
 * Suppression d'une mission. REFUSE tant que l'appelant n'a pas confirmé avoir
 * vu les dépendances : sans cette garde, un clic détruisait en cascade le
 * planning de la session sans laisser de trace.
 */
export async function deleteMission(id: number, confirme = false): Promise<{ error?: string }> {
  const auth = await requireCapability("validate");
  if (!auth.ok) return { error: auth.error };

  const dep = await dependancesMission(id);
  const total = dep.affectations + dep.incidents + dep.devis;
  if (total > 0 && !confirme) {
    const details = [
      dep.affectations > 0 ? `${dep.affectations} affectation(s) de surveillants` : null,
      dep.incidents > 0 ? `${dep.incidents} incident(s)` : null,
      dep.devis > 0 ? `${dep.devis} devis` : null,
    ].filter(Boolean).join(", ");
    return {
      error: `Suppression non confirmée : ${dep.libelle} porte ${details}. Ces éléments seront détruits avec la mission. Confirmez pour poursuivre, ou passez la mission en « Annulée » pour conserver l'historique.`,
    };
  }

  try {
    const supabase = await createClient();
    // Journalisé AVANT la suppression : après, la ligne mission n'existe plus.
    await journaliser(supabase, {
      missionId: null,
      objet: `Mission supprimée — ${dep.libelle}`,
      ancienne: `${dep.affectations} affectation(s), ${dep.incidents} incident(s), ${dep.devis} devis`,
      nouvelle: "supprimée",
    });
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) {
      log.error("[missions] suppression échouée :", error.message);
      return { error: messageMetier("Suppression de la mission", error.message) };
    }
    revalidateOps();
    return {};
  } catch (e) {
    log.error("[missions] suppression échouée :", e);
    return { error: messageMetier("Suppression de la mission", e instanceof Error ? e.message : String(e)) };
  }
}
