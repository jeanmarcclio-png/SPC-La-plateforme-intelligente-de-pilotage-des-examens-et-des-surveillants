import type { StatutMission, StatutDevis, StatutSurveillant } from "@/lib/operations/types";

export function MissionBadge({ statut }: { statut: StatutMission }) {
  const cls: Record<StatutMission, string> = {
    "Planifiée": "bg-indigo-50 text-indigo-600",
    "En cours":  "bg-amber-50 text-amber-600",
    "Terminée":  "bg-emerald-50 text-emerald-600",
    "Annulée":   "bg-red-50 text-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{statut}
    </span>
  );
}

export function DevisBadge({ statut }: { statut: StatutDevis }) {
  const cls: Record<StatutDevis, string> = {
    "Brouillon": "bg-gray-100 text-gray-500",
    "Envoyé":    "bg-sky-50 text-sky-600",
    "Accepté":   "bg-emerald-50 text-emerald-600",
    "Refusé":    "bg-red-50 text-red-500",
    "Facturé":   "bg-indigo-50 text-indigo-600",
  };
  return <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>{statut}</span>;
}

export function SurvBadge({ statut }: { statut: StatutSurveillant }) {
  const cls: Record<StatutSurveillant, string> = {
    "Disponible":   "bg-emerald-50 text-emerald-600",
    "Planifié":     "bg-indigo-50 text-indigo-600",
    "Annulé":       "bg-red-50 text-red-500",
    "Indisponible": "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${cls[statut]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{statut}
    </span>
  );
}
