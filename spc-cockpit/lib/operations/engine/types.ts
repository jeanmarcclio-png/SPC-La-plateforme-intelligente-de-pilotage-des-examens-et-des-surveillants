// Types du moteur de calcul métier SPC — source de vérité unique.
// Durées en minutes entières, montants en centimes entiers.

export type Period = "morning" | "afternoon";

export interface RoomPlanningInput {
  id: string;
  period: Period;
  roomCode: string;
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  requiredSupervisors: number;
  students?: number;
  isPMR?: boolean;
  hasExtraTime?: boolean;
  notes?: string | null;
}

export interface SupervisorAssignmentInput {
  id: string;
  sessionId: string;
  roomId: string;
  supervisorId: string;
  startTime: string | null; // HH:mm
  endTime: string | null; // HH:mm
  status?: "pending" | "confirmed" | "absent" | "replaced";
}

export interface FinancialInput {
  billableHours: number;
  hourlyRateCents: number;
  adjustmentCoefficient: number; // 1.00 = aucun ajustement
  billableExpensesCents: number;
  vatRate: number; // 0.20 = 20 %
}

export interface FinancialEstimate {
  billableHours: number;
  baseHTCents: number;
  adjustedHTCents: number;
  expensesCents: number;
  totalHTCents: number;
  vatCents: number;
  totalTTCents: number;
}

export interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  entityId?: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface SupervisorConflict {
  supervisorId: string;
  assignmentIdA: string;
  assignmentIdB: string;
  startTime: string; // début du chevauchement (HH:mm)
  endTime: string; // fin du chevauchement (HH:mm)
  message: string;
}
