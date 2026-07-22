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
  // Un item par créneau (§30) — repli sur le créneau unique matin*/apm*.
  const matin: Array<readonly [string | null, string | null]> = a.matinCreneaux?.length
    ? a.matinCreneaux.map((c) => [c.debut, c.fin] as const)
    : a.matin ? [[a.matinDebut ?? null, a.matinFin ?? null] as const] : [];
  const apm: Array<readonly [string | null, string | null]> = a.apmCreneaux?.length
    ? a.apmCreneaux.map((c) => [c.debut, c.fin] as const)
    : a.apm ? [[a.apmDebut ?? null, a.apmFin ?? null] as const] : [];
  matin.forEach(([debut, fin], i) => {
    out.push({ id: `${a.id}-matin-${i}`, sessionId: `${a.missionId}-matin`, roomId: a.salle ?? "", supervisorId: String(a.surveillantId), startTime: debut, endTime: fin, status: statut });
  });
  apm.forEach(([debut, fin], i) => {
    out.push({ id: `${a.id}-apm-${i}`, sessionId: `${a.missionId}-apm`, roomId: a.salle ?? "", supervisorId: String(a.surveillantId), startTime: debut, endTime: fin, status: statut });
  });
  return out;
}
