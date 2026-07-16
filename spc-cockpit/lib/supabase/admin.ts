import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase à privilèges élevés (service_role) — SERVEUR UNIQUEMENT.
 * Contourne la RLS : réservé aux opérations d'administration contrôlées
 * (invitation de comptes surveillant). Ne JAMAIS l'importer côté client.
 *
 * Retourne null si la clé n'est pas configurée (fonctionnalité désactivée
 * proprement plutôt que crash au build).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
