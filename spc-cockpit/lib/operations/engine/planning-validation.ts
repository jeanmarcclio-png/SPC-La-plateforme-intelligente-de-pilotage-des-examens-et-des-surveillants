// Validations de planification SPC — fonctions pures, résultats structurés.

import { parseTimeToMinutes } from "./financial-engine";
import type {
  FinancialInput,
  RoomPlanningInput,
  SupervisorAssignmentInput,
  SupervisorConflict,
  ValidationIssue,
  ValidationResult,
} from "./types";

function safeMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  try {
    return parseTimeToMinutes(time);
  } catch {
    return null;
  }
}

function result(issues: ValidationIssue[]): ValidationResult {
  return { isValid: !issues.some((i) => i.severity === "error"), issues };
}

// ---------------------------------------------------------------------------
// Validation de salle
// ---------------------------------------------------------------------------

export function validateRoom(room: RoomPlanningInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (code: string, severity: "error" | "warning", message: string, field?: string) =>
    issues.push({ code, severity, message, entityId: room.id, field });

  if (!room.roomCode?.trim()) add("ROOM_CODE_MISSING", "error", "Code de salle absent", "roomCode");
  if (!room.startTime) add("ROOM_START_MISSING", "error", `Salle ${room.roomCode || room.id} : heure de début absente`, "startTime");
  else if (safeMinutes(room.startTime) === null) add("ROOM_START_INVALID", "error", `Salle ${room.roomCode} : heure de début invalide (${room.startTime})`, "startTime");
  if (!room.endTime) add("ROOM_END_MISSING", "error", `Salle ${room.roomCode || room.id} : heure de fin absente`, "endTime");
  else if (safeMinutes(room.endTime) === null) add("ROOM_END_INVALID", "error", `Salle ${room.roomCode} : heure de fin invalide (${room.endTime})`, "endTime");

  const start = safeMinutes(room.startTime);
  const end = safeMinutes(room.endTime);
  if (start !== null && end !== null && end <= start)
    add("ROOM_TIME_ORDER", "error", `Salle ${room.roomCode} : la fin (${room.endTime}) doit être après le début (${room.startTime})`, "endTime");

  if (room.requiredSupervisors < 0)
    add("ROOM_SUPERVISORS_NEGATIVE", "error", `Salle ${room.roomCode} : nombre de surveillants négatif`, "requiredSupervisors");
  else if (room.requiredSupervisors === 0)
    add("ROOM_NO_SUPERVISOR", "warning", `Salle ${room.roomCode} : active mais aucun surveillant requis (0 h facturée)`, "requiredSupervisors");

  return result(issues);
}

export function validateRooms(rooms: RoomPlanningInput[]): ValidationResult {
  return result(rooms.flatMap((r) => validateRoom(r).issues));
}

// ---------------------------------------------------------------------------
// Validation financière
// ---------------------------------------------------------------------------

export function validateFinancialInput(input: FinancialInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (input.billableHours < 0) issues.push({ code: "FIN_HOURS_NEGATIVE", severity: "error", message: "Heures facturables négatives", field: "billableHours" });
  if (input.hourlyRateCents < 0) issues.push({ code: "FIN_RATE_NEGATIVE", severity: "error", message: "Taux horaire négatif", field: "hourlyRateCents" });
  if (!(input.adjustmentCoefficient > 0)) issues.push({ code: "FIN_COEF_INVALID", severity: "error", message: "Le coefficient d'ajustement doit être supérieur à zéro", field: "adjustmentCoefficient" });
  if (input.vatRate < 0) issues.push({ code: "FIN_VAT_INVALID", severity: "error", message: "Taux de TVA négatif", field: "vatRate" });
  if (input.billableExpensesCents < 0) issues.push({ code: "FIN_EXPENSES_NEGATIVE", severity: "warning", message: "Frais facturables négatifs — vérifier qu'il s'agit bien d'une déduction autorisée", field: "billableExpensesCents" });
  return result(issues);
}

// ---------------------------------------------------------------------------
// Conflits de surveillants
// ---------------------------------------------------------------------------

const toHM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/**
 * Détecte les doubles affectations : même surveillant, même session, deux
 * salles dont les créneaux se chevauchent. Les affectations sans horaires
 * exploitables sont ignorées (elles relèvent de validateRoom / des alertes).
 */
export function detectSupervisorConflicts(assignments: SupervisorAssignmentInput[]): SupervisorConflict[] {
  const conflicts: SupervisorConflict[] = [];
  const usable = assignments
    .filter((a) => a.status !== "absent" && a.status !== "replaced")
    .map((a) => ({ a, start: safeMinutes(a.startTime), end: safeMinutes(a.endTime) }))
    .filter((x): x is { a: SupervisorAssignmentInput; start: number; end: number } => x.start !== null && x.end !== null && x.end > x.start);

  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const A = usable[i];
      const B = usable[j];
      if (A.a.supervisorId !== B.a.supervisorId || A.a.sessionId !== B.a.sessionId) continue;
      if (A.a.roomId === B.a.roomId && A.a.id === B.a.id) continue;
      const overlapStart = Math.max(A.start, B.start);
      const overlapEnd = Math.min(A.end, B.end);
      if (overlapStart < overlapEnd) {
        conflicts.push({
          supervisorId: A.a.supervisorId,
          assignmentIdA: A.a.id,
          assignmentIdB: B.a.id,
          startTime: toHM(overlapStart),
          endTime: toHM(overlapEnd),
          message: `Surveillant ${A.a.supervisorId} affecté simultanément à ${A.a.roomId} et ${B.a.roomId} (${toHM(overlapStart)}–${toHM(overlapEnd)})`,
        });
      }
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------
// Validation de session (avant approbation)
// ---------------------------------------------------------------------------

export function validateSessionForApproval(input: {
  rooms: RoomPlanningInput[];
  assignments: SupervisorAssignmentInput[];
}): ValidationResult {
  const issues: ValidationIssue[] = [...validateRooms(input.rooms).issues];

  // Couverture : chaque salle requérant des surveillants doit avoir assez d'affectations actives.
  for (const room of input.rooms) {
    if (room.requiredSupervisors <= 0) continue;
    const assigned = input.assignments.filter(
      (a) => a.roomId === room.roomCode && a.status !== "absent" && a.status !== "replaced"
    ).length;
    if (assigned < room.requiredSupervisors) {
      issues.push({
        code: "ROOM_UNDERSTAFFED",
        severity: "error",
        message: `Salle ${room.roomCode} : ${assigned}/${room.requiredSupervisors} surveillant(s) affecté(s)`,
        entityId: room.id,
      });
    }
  }

  for (const c of detectSupervisorConflicts(input.assignments)) {
    issues.push({ code: "SUPERVISOR_CONFLICT", severity: "error", message: c.message, entityId: c.supervisorId });
  }

  return result(issues);
}
