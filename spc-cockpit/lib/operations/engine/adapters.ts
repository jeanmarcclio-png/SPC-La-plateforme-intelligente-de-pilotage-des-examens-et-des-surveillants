// Adaptateurs entre les objets applicatifs SPC et les types du moteur.
// Aucune refonte des modèles existants : traduction explicite uniquement.

import type { Affectation, DevisSalle } from "../types";
import type { RoomPlanningInput, SupervisorAssignmentInput } from "./types";

/** DevisSalle (matin / après-midi) → salle du moteur. */
export function devisSalleToRoom(s: DevisSalle): RoomPlanningInput {
  return {
    id: String(s.id),
    period: s.session === "matin" ? "morning" : "afternoon",
    roomCode: s.salle,
    startTime: s.debut ?? null,
    endTime: s.fin ?? null,
    requiredSupervisors: s.surveillants,
    students: s.etudiants,
    isPMR: s.pmr,
    hasExtraTime: s.tiersTemps,
    notes: s.observations ?? null,
  };
}

/**
 * Affectation SPC (une ligne = un surveillant sur une mission, avec créneaux
 * matin et après-midi optionnels) → 0 à 2 affectations du moteur.
 * La session moteur = mission + période, pour que matin et après-midi
 * restent indépendants dans la détection de conflits.
 */
export function affectationToAssignments(a: Affectation): SupervisorAssignmentInput[] {
  const out: SupervisorAssignmentInput[] = [];
  const statut = a.presence === "Absent" ? "absent" : "confirmed";
  if (a.matin) {
    out.push({
      id: `${a.id}-matin`,
      sessionId: `${a.missionId}-matin`,
      roomId: a.salle ?? "",
      supervisorId: String(a.surveillantId),
      startTime: a.matinDebut ?? null,
      endTime: a.matinFin ?? null,
      status: statut,
    });
  }
  if (a.apm) {
    out.push({
      id: `${a.id}-apm`,
      sessionId: `${a.missionId}-apm`,
      roomId: a.salle ?? "",
      supervisorId: String(a.surveillantId),
      startTime: a.apmDebut ?? null,
      endTime: a.apmFin ?? null,
      status: statut,
    });
  }
  return out;
}
