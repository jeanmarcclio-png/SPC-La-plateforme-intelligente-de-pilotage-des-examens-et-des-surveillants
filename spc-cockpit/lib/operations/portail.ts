import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { emptyPortailPayload, type PortailPayload, type PortailEtat } from "./portail-constants";

/** Token public : 32 octets aléatoires, encodés URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte SHA-256 (hex) d'un token — seule valeur stockée en base. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface PortailLoad {
  etat: PortailEtat;
  reference?: string;
  statut?: string;
  expiresAt?: string;
  form?: PortailPayload;
}

type SalleRow = Record<string, unknown>;

function mapForm(demande: Record<string, unknown>, salles: SalleRow[]): PortailPayload {
  const s = (k: string) => (demande[k] as string) ?? undefined;
  return {
    ...emptyPortailPayload(),
    etablissement: (demande.etablissement as string) ?? "",
    campus: s("campus"), adresse: s("adresse"), ville: s("ville"), code_postal: s("code_postal"),
    reference_client: s("reference_client"), type_etablissement: s("type_etablissement"),
    demandeur_prenom: s("demandeur_prenom"), demandeur_nom: s("demandeur_nom"),
    demandeur_fonction: s("demandeur_fonction"), demandeur_email: s("demandeur_email"),
    demandeur_telephone: s("demandeur_telephone"), demandeur_service: s("demandeur_service"),
    resp_client_prenom: s("resp_client_prenom"), resp_client_nom: s("resp_client_nom"),
    resp_client_fonction: s("resp_client_fonction"), resp_client_email: s("resp_client_email"),
    resp_client_telephone: s("resp_client_telephone"),
    pmr_present: Boolean(demande.pmr_present), pmr_nombre: Number(demande.pmr_nombre ?? 0), pmr_details: s("pmr_details"),
    tiers_temps_present: Boolean(demande.tiers_temps_present), tiers_temps_nombre: Number(demande.tiers_temps_nombre ?? 0), tiers_temps_details: s("tiers_temps_details"),
    besoins_specifiques: Array.isArray(demande.besoins_specifiques) ? (demande.besoins_specifiques as string[]) : [],
    observations: s("observations"),
    salles: (salles ?? []).map((r, i) => ({
      date_examen: (r.date_examen as string) ?? undefined,
      creneau: (r.creneau as "matin" | "apres-midi") ?? "matin",
      salle: (r.salle as string) ?? "",
      batiment: (r.batiment as string) ?? undefined,
      etudiants: Number(r.etudiants ?? 0),
      surveillants: Number(r.surveillants ?? 1),
      pmr: Boolean(r.pmr),
      tiers_temps: Boolean(r.tiers_temps),
      debut_examen: (r.debut_examen as string) ?? undefined,
      fin_examen: (r.fin_examen as string) ?? undefined,
      debut_surveillance: (r.debut_surveillance as string) ?? undefined,
      fin_surveillance: (r.fin_surveillance as string) ?? undefined,
      observations: (r.observations as string) ?? undefined,
      ordre: Number(r.ordre ?? i + 1),
    })),
  };
}

/**
 * Charge une demande via son token (fonction scellée `spc_portail_get`).
 * Aucune table n'est lue directement : la RPC est la seule porte publique.
 */
export async function getPortailByToken(token: string): Promise<PortailLoad> {
  if (!token || token.length < 20) return { etat: "invalide" };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("spc_portail_get", { p_token_hash: hashToken(token) });
    if (error || !data) return { etat: "invalide" };
    const res = data as Record<string, unknown>;
    const etat = (res.etat as PortailEtat) ?? "invalide";
    if (etat !== "ok") return { etat };
    const demande = (res.demande as Record<string, unknown>) ?? {};
    const salles = (res.salles as SalleRow[]) ?? [];
    return {
      etat: "ok",
      reference: (demande.reference as string) ?? undefined,
      statut: (demande.statut as string) ?? undefined,
      expiresAt: (res.expires_at as string) ?? undefined,
      form: mapForm(demande, salles),
    };
  } catch {
    return { etat: "invalide" };
  }
}
