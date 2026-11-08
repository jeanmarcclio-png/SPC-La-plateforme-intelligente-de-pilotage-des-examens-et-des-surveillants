// Référence de mission EX-AAAA-NNN — séquence serveur (max + 1 sur toutes les missions).
// Utilisée par la création depuis un devis accepté et par la conversion d'une demande.

import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function prochaineReferenceMission(supabase: Supabase, annee: string): Promise<string> {
  const { data: refs } = await supabase.from("missions").select("reference");
  const max = (refs ?? []).reduce((acc, r) => {
    const n = Number(String(r.reference).match(/^EX-\d{4}-(\d+)$/)?.[1] ?? 0);
    return Math.max(acc, n);
  }, 0);
  return `EX-${annee}-${String(max + 1).padStart(3, "0")}`;
}
