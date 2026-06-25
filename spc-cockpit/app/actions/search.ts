"use server";

import { getProspects, getCampagnes, getLivrables } from "@/lib/supabase/queries";
import type { Prospect, Campagne, Livrable } from "@/lib/types";

export interface SearchResults {
  prospects: Pick<Prospect, "id" | "nom" | "segment" | "cluster" | "scoreBANT" | "statut">[];
  campagnes: Pick<Campagne, "id" | "nom" | "statut" | "score">[];
  livrables: Pick<Livrable, "id" | "nom" | "statut" | "campagneNom">[];
}

export async function searchAll(q: string): Promise<SearchResults> {
  if (!q || q.trim().length < 2) return { prospects: [], campagnes: [], livrables: [] };
  const lq = q.toLowerCase().trim();

  const [prospects, campagnes, livrables] = await Promise.all([
    getProspects(),
    getCampagnes(),
    getLivrables(),
  ]);

  return {
    prospects: prospects
      .filter(p =>
        p.nom.toLowerCase().includes(lq) ||
        p.segment.toLowerCase().includes(lq) ||
        p.cluster.toLowerCase().includes(lq) ||
        p.statut.toLowerCase().includes(lq)
      )
      .slice(0, 6)
      .map(({ id, nom, segment, cluster, scoreBANT, statut }) => ({ id, nom, segment, cluster, scoreBANT, statut })),

    campagnes: campagnes
      .filter(c =>
        c.nom.toLowerCase().includes(lq) ||
        c.perimetre.toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .map(({ id, nom, statut, score }) => ({ id, nom, statut, score })),

    livrables: livrables
      .filter(l =>
        l.nom.toLowerCase().includes(lq) ||
        (l.description ?? "").toLowerCase().includes(lq) ||
        (l.campagneNom ?? "").toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .map(({ id, nom, statut, campagneNom }) => ({ id, nom, statut, campagneNom })),
  };
}
