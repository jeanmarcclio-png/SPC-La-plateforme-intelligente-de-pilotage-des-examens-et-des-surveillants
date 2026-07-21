"use client";

import type { Prospect } from "@/lib/types";

export function ModeDecisionButtons({ prospect }: { prospect: Prospect }) {
  const score = prospect.scoreBANT;

  const actions = [
    {
      icon: "📞",
      label: "Script appel",
      bg: "bg-[var(--color-primary)]",
      prompt: `Génère un script d'appel à froid pour contacter ${prospect.nom} (${prospect.segment} · ${prospect.cluster}). Score BANT ${score}/10, statut : ${prospect.statut}. Interlocuteur cible : ${prospect.interlocuteur}. Canal recommandé : ${prospect.canal}. Objectif : décrocher un RDV ou audit gratuit 30 min.`,
    },
    {
      icon: "📧",
      label: "Email IA",
      bg: "bg-[#4a90d9]",
      prompt: `Rédige un email de prospection B2B pour ${prospect.nom} (${prospect.segment}). Score BANT ${score}/10, niveau : ${prospect.niveau}. Notes : ${prospect.notes ?? "aucune"}. Ton : professionnel institutionnel. CTA : proposer un appel découverte de 15 minutes.`,
    },
    {
      icon: "📅",
      label: "Préparer RDV",
      bg: "bg-[#805ad5]",
      prompt: `Aide-moi à préparer mon RDV avec ${prospect.nom} (${prospect.segment}). Score BANT ${score}/10. Donne-moi 5 questions clés à poser, les 3 objections probables et un pitch de 2 minutes sur la valeur Survéo pour ce type d'établissement.`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map(({ icon, label, bg, prompt }) => (
        <button
          key={label}
          onClick={() => window.dispatchEvent(new CustomEvent("copilote:open", { detail: prompt }))}
          className={`${bg} flex flex-col items-center gap-1.5 py-3 rounded-xl text-white active:opacity-70 transition-opacity`}
        >
          <span className="text-xl">{icon}</span>
          <span className="text-[11px] font-semibold">{label}</span>
        </button>
      ))}
    </div>
  );
}
