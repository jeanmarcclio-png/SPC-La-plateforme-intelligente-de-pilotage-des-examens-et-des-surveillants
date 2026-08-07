"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MissionBadge } from "@/components/ops/badges";
import type { Mission } from "@/lib/operations/types";
import { dateFR, euro } from "@/lib/operations/format";
import { ProgressBar } from "./Charts";

// Fiche détaillée d'une mission — lecture seule, sans nouvelle route.
// Utilisée par l'action « voir » du tableau ET par « Détails de la mission »
// du bandeau actif : une seule fiche, donc des chiffres identiques partout.

export interface DetailsMission {
  avancement: number;
  surveillantsAffectes: number;
  /** 0 = affectations non suivies : on n'affiche alors que l'effectif requis. */
  affectationsSuivies: number;
  candidats: number | null;
  heuresLabel?: string;
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[#EDF0F5] last:border-0">
      <dt className="text-[12px] text-[#64708A] flex-shrink-0">{label}</dt>
      <dd className="text-[13px] font-semibold text-[#11182D] text-right">{children}</dd>
    </div>
  );
}

export function MissionDetailsDialog({
  mission,
  details,
  onClose,
}: {
  mission: Mission | null;
  details?: DetailsMission;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!mission} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        {mission && (
          <>
            <DialogHeader>
              <DialogTitle>
                <span className="font-mono text-[12.5px] text-[#8D97AA] mr-2">{mission.reference}</span>
                {mission.client}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2.5 flex-wrap mb-3">
              <MissionBadge statut={mission.statut} />
              {mission.session && <span className="text-[12px] text-[#64708A]">{mission.session}</span>}
            </div>

            {details && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11.5px] text-[#64708A] mb-1.5">
                  <span>Avancement de la préparation</span>
                  <span className="font-bold text-[#11182D]">{details.avancement} %</span>
                </div>
                <ProgressBar valeur={details.avancement} couleur={details.avancement >= 100 ? "#13B979" : "#4F46F5"} />
              </div>
            )}

            <dl className="mt-1">
              <Ligne label="Date de session">{dateFR(mission.dateMission)}</Ligne>
              <Ligne label="Type d'épreuve">{mission.type}</Ligne>
              <Ligne label="Salles">{mission.nbSalles}</Ligne>
              <Ligne label="Surveillants">
                {details && details.affectationsSuivies > 0
                  ? `${details.surveillantsAffectes}/${mission.nbSurveillants} affectés`
                  : `${mission.nbSurveillants} requis`}
              </Ligne>
              {details?.candidats != null && <Ligne label="Candidats attendus">{details.candidats}</Ligne>}
              {details?.heuresLabel && <Ligne label="Heures planifiées">{details.heuresLabel}</Ligne>}
              <Ligne label="Montant HT">{euro(mission.montantHT)}</Ligne>
              {mission.notes && <Ligne label="Notes">{mission.notes}</Ligne>}
            </dl>

            <div className="flex gap-2.5 pt-4">
              <Link
                href="/operations/planification"
                className="flex-1 min-h-[40px] inline-flex items-center justify-center rounded-xl border border-[#E3E8F1] text-[12.5px] font-semibold text-[#11182D] hover:bg-slate-50 transition-colors"
              >
                Ouvrir le planning
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[40px] rounded-xl text-white text-[12.5px] font-semibold bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 transition-opacity"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
