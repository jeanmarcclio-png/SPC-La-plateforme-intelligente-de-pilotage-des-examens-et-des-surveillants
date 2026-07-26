"use server";

import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/operations/portail";
import { validatePortailPayload, portailEtatMessage, type PortailPayload } from "@/lib/operations/portail-constants";

/**
 * Soumission publique d'une demande via le portail client (spec §14).
 * Aucune authentification : la sécurité repose entièrement sur le token,
 * vérifié et scopé côté base par la fonction scellée `spc_portail_submit`.
 * On ne renvoie jamais de détail interne en cas d'échec.
 */
export async function soumettrePortail(token: string, payload: PortailPayload): Promise<{ error?: string; ok?: boolean }> {
  if (!token) return { error: "Lien invalide." };
  const erreurs = validatePortailPayload(payload);
  if (erreurs.length) return { error: erreurs[0] };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("spc_portail_submit", {
      p_token_hash: hashToken(token),
      p_payload: payload,
    });
    if (error) return { error: "Envoi impossible pour le moment. Merci de réessayer." };
    const etat = (data as { etat?: string; message?: string } | null)?.etat;
    if (etat === "ok") return { ok: true };
    if (etat === "erreur") return { error: (data as { message?: string }).message ?? "Vérifiez les informations saisies." };
    return { error: portailEtatMessage(etat) };
  } catch {
    return { error: "Une erreur inattendue est survenue." };
  }
}
