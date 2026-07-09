import type { StatutMission, StatutDevis, StatutSurveillant } from "@/lib/operations/types";

// Badges statut — SPC Premium Operations Design System.
// Palette sémantique douce : fond teinté + anneau subtil + texte contrasté,
// point indicateur pour rester compréhensible sans la couleur seule.

type Tone = "success" | "attention" | "critique" | "info" | "accent" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", // sauge — validé/conforme/terminé
  attention: "bg-amber-50 text-amber-700 ring-amber-600/15", // ambre — à confirmer/en cours
  critique: "bg-rose-50 text-rose-700 ring-rose-600/15", // corail — incident/annulé/refusé
  info: "bg-sky-50 text-sky-700 ring-sky-600/15", // bleu paon — planifié/à venir
  accent: "bg-indigo-50 text-indigo-700 ring-indigo-600/15", // indigo — validée/facturé/analyse
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/15", // ardoise — brouillon/archivé
};

const BASE = "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset";

function Dot() {
  return <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />;
}

export function MissionBadge({ statut }: { statut: StatutMission }) {
  const tone: Record<StatutMission, Tone> = {
    "Brouillon": "neutral",
    "À chiffrer": "attention",
    "Devis envoyé": "info",
    "Acceptée": "info",
    "Planifiée": "info",
    "Validée": "accent",
    "En cours": "attention",
    "Terminée": "success",
    "Facturée": "accent",
    "Archivée": "neutral",
    "Annulée": "critique",
  };
  return <span className={`${BASE} ${TONE[tone[statut]]}`}><Dot />{statut}</span>;
}

export function DevisBadge({ statut }: { statut: StatutDevis }) {
  const tone: Record<StatutDevis, Tone> = {
    "Brouillon": "neutral",
    "Envoyé": "info",
    "Accepté": "success",
    "Refusé": "critique",
    "Facturé": "accent",
  };
  return <span className={`${BASE} ${TONE[tone[statut]]}`}><Dot />{statut}</span>;
}

export function SurvBadge({ statut }: { statut: StatutSurveillant }) {
  const tone: Record<StatutSurveillant, Tone> = {
    "Disponible": "success",
    "Planifié": "info",
    "Annulé": "critique",
    "Indisponible": "neutral",
  };
  return <span className={`${BASE} ${TONE[tone[statut]]}`}><Dot />{statut}</span>;
}
