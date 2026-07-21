"use client";

import type { Prospect } from "@/lib/types";

const ACTIONS = [
  {
    icon: "📞",
    label: "Script appel",
    color: "bg-blue-50 text-blue-700",
    prompt: (p: Prospect, score: number) =>
      `Génère un script d'appel à froid pour contacter ${p.nom} (${p.segment} · ${p.cluster}). Score BANT ${score}/10, statut : ${p.statut}. Interlocuteur cible : ${p.interlocuteur}. Canal : ${p.canal}. Objectif : décrocher un RDV ou audit gratuit 30 min.`,
  },
  {
    icon: "📧",
    label: "Email IA",
    color: "bg-teal-50 text-teal-700",
    prompt: (p: Prospect, score: number) =>
      `Rédige un email de prospection B2B pour ${p.nom} (${p.segment}). Score BANT ${score}/10, niveau : ${p.niveau}. Ton : professionnel institutionnel. CTA : proposer un appel découverte de 15 minutes.`,
  },
  {
    icon: "📅",
    label: "Préparer RDV",
    color: "bg-purple-50 text-purple-700",
    prompt: (p: Prospect, score: number) =>
      `Aide-moi à préparer mon RDV avec ${p.nom} (${p.segment}). Score BANT ${score}/10. Donne-moi 5 questions clés, les 3 objections probables et un pitch de 2 minutes sur la valeur Survéo.`,
  },
];

export function ContactDuJour({
  prospect,
  confidence,
  action,
}: {
  prospect: Prospect;
  confidence: number;
  action: string;
}) {
  function dispatch(prompt: string) {
    window.dispatchEvent(new CustomEvent("copilote:open", { detail: prompt }));
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm animate-scale-in"
      style={{ background: "linear-gradient(135deg, #0d1e2e 0%, #1a3a52 100%)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="text-[11px] text-[#4a90d9] font-bold uppercase tracking-[1.2px] mb-1">
          🎯 Contact du Jour · IA
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[19px] font-extrabold text-white leading-tight truncate">{prospect.nom}</div>
            <div className="text-[12px] text-white/60 mt-0.5">{prospect.segment} · {prospect.cluster}</div>
          </div>
          <div className="text-center flex-shrink-0">
            <div className="text-[26px] font-black text-[#4a90d9] leading-none">{confidence}%</div>
            <div className="text-[11px] text-white/40 uppercase tracking-wide">confiance</div>
          </div>
        </div>
      </div>

      {/* Action recommandée */}
      <div className="mx-4 mb-3 bg-white/[0.08] rounded-xl px-3 py-2.5 border border-white/[0.1]">
        <div className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Action recommandée</div>
        <div className="text-[13px] font-semibold text-white">{action} — {prospect.nom}</div>
        <div className="text-[11px] text-white/50 mt-0.5">{prospect.interlocuteur}</div>
      </div>

      {/* Mode Décision buttons */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {ACTIONS.map(({ icon, label, color, prompt }) => (
          <button
            key={label}
            onClick={() => dispatch(prompt(prospect, prospect.scoreBANT))}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl ${color} transition-opacity active:opacity-70`}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
