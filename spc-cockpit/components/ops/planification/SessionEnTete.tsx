"use client";

import { useTransition } from "react";
import { Building2, CalendarCheck, CalendarDays, Clock, Layers, Send, ShieldCheck } from "lucide-react";
import type { Mission, Surveillant } from "@/lib/operations/types";
import { estPlanifiable } from "@/lib/operations/mission-status";
import { dateFR } from "@/lib/operations/format";
import { addAffectation } from "@/app/actions/affectations";
import { validerSession } from "@/app/actions/missions";
import { showToast } from "@/components/Toast";
import { Button } from "@/components/ops/Button";
import { SurveillantPicker } from "@/components/ops/SurveillantPicker";

// En-tête de session commun aux trois pages (prompt §5.1 / §6.1 / §7.1).
// Variante « complet » sur la page PILOTER, « compact » sur les deux autres :
// même bloc, même code, jamais deux implémentations qui divergent.

export interface EtatSession {
  nbSalles: number;
  nbCreneaux: number;
  nbAlertes: number;
  nbLignes: number;
  nbModifiees: number;
}

function Meta({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#667085]">
      <span aria-hidden className="text-[#98A2B3]">{icone}</span>
      {children}
    </span>
  );
}

export function SessionEnTete({
  mission,
  etat,
  disponibles,
  variante = "complet",
  titre,
  sousTitre,
  actionsSupplementaires,
}: {
  mission: Mission;
  etat: EtatSession;
  disponibles: Surveillant[];
  variante?: "complet" | "compact";
  titre?: string;
  sousTitre?: string;
  actionsSupplementaires?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const validable = estPlanifiable(mission.statut) && mission.statut !== "Validée";

  const tonStatut =
    mission.statut === "En cours" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
    : mission.statut === "Validée" ? "bg-indigo-50 text-indigo-700 ring-indigo-600/15"
    : "bg-sky-50 text-sky-700 ring-sky-600/15";

  function ajouter(s: Surveillant) {
    startTransition(async () => {
      const r = await addAffectation(mission.id, s.id, s.role || "Surveillant salle");
      if (r.error) showToast(r.error, "error");
      else showToast(`${s.nom} ajouté à la session`);
    });
  }

  function convocations() {
    if (etat.nbLignes === 0) return showToast("Aucun surveillant affecté à convoquer.", "error");
    showToast(`Convocations préparées pour ${etat.nbLignes} surveillant(s) — ${mission.client}.`);
  }

  function confirmerJ48() {
    showToast(`Confirmation J-48 envoyée à l'équipe — ${mission.client}.`);
  }

  // Validation (Master Prompt §15.4) : toute alerte est bloquante, et une
  // modification non enregistrée l'est aussi — on ne fige pas un planning
  // dont l'écran et la base divergent.
  function valider() {
    if (etat.nbLignes === 0) return showToast("Impossible de valider : aucun surveillant affecté à la session", "error");
    if (etat.nbModifiees > 0) return showToast("Des modifications ne sont pas enregistrées — enregistre chaque ligne avant de valider.", "error");
    if (etat.nbAlertes > 0) return showToast(`Impossible de valider : ${etat.nbAlertes} alerte(s) à corriger sur cette session.`, "error");
    startTransition(async () => {
      const r = await validerSession(mission.id);
      if (r.error) showToast(r.error, "error");
      else showToast(`Session ${mission.client} validée — planning verrouillé pour le terrain`);
    });
  }

  const compact = variante === "compact";

  return (
    <div className={`bg-white rounded-2xl border border-[#E6EAF0] shadow-sm ${compact ? "px-5 py-4" : "px-5 py-5 md:px-6"} mb-4`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {!compact && (
            <div className="text-[10.5px] font-bold uppercase tracking-[1.5px] text-[#155EEF]">Session principale</div>
          )}
          {compact && titre && (
            <h1 className="text-[20px] md:text-[23px] font-extrabold text-[#0F1F3D] tracking-tight">{titre}</h1>
          )}
          <div className={`flex items-center gap-2.5 flex-wrap ${compact ? "mt-0.5" : "mt-1"}`}>
            {compact ? (
              <p className="text-[14px] font-semibold text-[#667085]">{sousTitre ?? `${mission.client} — ${dateFR(mission.dateMission)}`}</p>
            ) : (
              <h1 className="text-[24px] md:text-[27px] font-extrabold text-[#0F1F3D] tracking-tight">
                {mission.client} — {dateFR(mission.dateMission)}
              </h1>
            )}
            <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${tonStatut}`}>
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {mission.statut}
            </span>
          </div>
          <div className="flex items-center gap-3.5 mt-2 flex-wrap">
            <Meta icone={<CalendarDays className="w-3.5 h-3.5" />}>{dateFR(mission.dateMission)}</Meta>
            <Meta icone={<Building2 className="w-3.5 h-3.5" />}>{mission.client}</Meta>
            <Meta icone={<Layers className="w-3.5 h-3.5" />}>{etat.nbSalles} salles</Meta>
            <Meta icone={<Clock className="w-3.5 h-3.5" />}>{etat.nbCreneaux} créneaux</Meta>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {actionsSupplementaires}
          {disponibles.length > 0 && <SurveillantPicker surveillants={disponibles} onSelect={ajouter} disabled={pending} />}
          <Button variant="secondary" onClick={convocations}>
            <Send className="w-4 h-4" aria-hidden />Convocations
          </Button>
          <Button variant="secondary" onClick={confirmerJ48}>
            <CalendarCheck className="w-4 h-4" aria-hidden />Confirmer J-48
          </Button>
          {validable && (
            <Button
              variant="accent"
              onClick={valider}
              disabled={pending}
              className="!bg-[#039855] hover:!bg-[#027A48] focus-visible:!ring-emerald-400"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden />Valider la session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
