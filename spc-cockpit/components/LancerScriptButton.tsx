"use client";

import type { Prospect } from "@/lib/types";

export function LancerScriptButton({ prospect }: { prospect: Prospect }) {
  const prompt = `Génère un script d'appel à froid pour contacter ${prospect.nom} (${prospect.segment} · ${prospect.cluster}). Score BANT ${prospect.scoreBANT}/10, statut : ${prospect.statut}. Interlocuteur cible : ${prospect.interlocuteur}. Canal recommandé : ${prospect.canal}. Objectif : décrocher un RDV ou audit gratuit 30 min.`;
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: prompt }))}
      className="mt-3 w-full bg-white/[0.15] hover:bg-white/[0.25] text-white text-[12px] font-semibold py-2 rounded-lg transition-colors flex items-center justify-center"
    >
      Lancer le script d&apos;appel →
    </button>
  );
}
