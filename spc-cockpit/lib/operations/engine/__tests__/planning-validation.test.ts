import { describe, it, expect } from "vitest";
import { validateRoom, validateRooms, validateFinancialInput, validateSessionForApproval, detectSupervisorConflicts } from "../planning-validation";
import { affectationToAssignments } from "../adapters";
import type { RoomPlanningInput, SupervisorAssignmentInput } from "../types";
import type { Affectation } from "../../types";

const room = (over: Partial<RoomPlanningInput>): RoomPlanningInput => ({
  id: "r1",
  period: "morning",
  roomCode: "A101",
  startTime: "08:30",
  endTime: "11:30",
  requiredSupervisors: 2,
  ...over,
});

const assign = (over: Partial<SupervisorAssignmentInput>): SupervisorAssignmentInput => ({
  id: "a1",
  sessionId: "s1",
  roomId: "A101",
  supervisorId: "sup1",
  startTime: "08:30",
  endTime: "11:30",
  status: "confirmed",
  ...over,
});

describe("validateRoom", () => {
  it("salle complète = valide", () => {
    expect(validateRoom(room({})).isValid).toBe(true);
  });
  it("code absent = erreur", () => {
    const r = validateRoom(room({ roomCode: "" }));
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.code === "ROOM_CODE_MISSING")).toBe(true);
  });
  it("début / fin absents = erreurs", () => {
    const r = validateRoom(room({ startTime: null, endTime: null }));
    expect(r.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["ROOM_START_MISSING", "ROOM_END_MISSING"]));
  });
  it("fin ≤ début = erreur", () => {
    expect(validateRoom(room({ startTime: "11:00", endTime: "09:00" })).isValid).toBe(false);
    expect(validateRoom(room({ startTime: "09:00", endTime: "09:00" })).isValid).toBe(false);
  });
  it("surveillants négatifs = erreur ; 0 surveillant = avertissement non bloquant", () => {
    expect(validateRoom(room({ requiredSupervisors: -1 })).isValid).toBe(false);
    const zero = validateRoom(room({ requiredSupervisors: 0 }));
    expect(zero.isValid).toBe(true);
    expect(zero.issues.some((i) => i.code === "ROOM_NO_SUPERVISOR" && i.severity === "warning")).toBe(true);
  });
  it("validateRooms agrège toutes les anomalies", () => {
    const r = validateRooms([room({}), room({ id: "r2", roomCode: "" })]);
    expect(r.isValid).toBe(false);
    expect(r.issues).toHaveLength(1);
  });
});

describe("validateFinancialInput", () => {
  it("entrée saine = valide", () => {
    expect(validateFinancialInput({ billableHours: 10, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 }).isValid).toBe(true);
  });
  it("coefficient nul = erreur", () => {
    expect(validateFinancialInput({ billableHours: 10, hourlyRateCents: 2800, adjustmentCoefficient: 0, billableExpensesCents: 0, vatRate: 0.2 }).isValid).toBe(false);
  });
});

describe("detectSupervisorConflicts", () => {
  it("deux affectations non chevauchantes : aucun conflit", () => {
    expect(detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202", startTime: "13:30", endTime: "17:00" })])).toHaveLength(0);
  });
  it("deux affectations chevauchantes : conflit", () => {
    const c = detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202", startTime: "10:00", endTime: "12:00" })]);
    expect(c).toHaveLength(1);
    expect(c[0].startTime).toBe("10:00");
    expect(c[0].endTime).toBe("11:30");
  });
  it("même surveillant, deux salles, même créneau : conflit", () => {
    expect(detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202" })])).toHaveLength(1);
  });
  it("deux surveillants différents : aucun conflit", () => {
    expect(detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202", supervisorId: "sup2" })])).toHaveLength(0);
  });
  it("sessions différentes : aucun conflit", () => {
    expect(detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202", sessionId: "s2" })])).toHaveLength(0);
  });
  it("horaires invalides ignorés sans crash", () => {
    expect(detectSupervisorConflicts([assign({ startTime: "9h" }), assign({ id: "a2", roomId: "B202" })])).toHaveLength(0);
  });
  it("affectation absente/remplacée exclue", () => {
    expect(detectSupervisorConflicts([assign({}), assign({ id: "a2", roomId: "B202", status: "absent" })])).toHaveLength(0);
  });
});

describe("validateSessionForApproval", () => {
  it("session couverte sans conflit = valide", () => {
    const rooms = [room({ requiredSupervisors: 1 })];
    const assignments = [assign({})];
    expect(validateSessionForApproval({ rooms, assignments }).isValid).toBe(true);
  });
  it("salle sous-staffée = bloquant", () => {
    const r = validateSessionForApproval({ rooms: [room({ requiredSupervisors: 2 })], assignments: [assign({})] });
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.code === "ROOM_UNDERSTAFFED")).toBe(true);
  });
  it("conflit surveillant = bloquant", () => {
    const r = validateSessionForApproval({
      rooms: [room({ requiredSupervisors: 1 }), room({ id: "r2", roomCode: "B202", requiredSupervisors: 1 })],
      assignments: [assign({}), assign({ id: "a2", roomId: "B202" })],
    });
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.code === "SUPERVISOR_CONFLICT")).toBe(true);
  });
});

describe("adaptateurs SPC", () => {
  const aff: Affectation = {
    id: 7,
    missionId: 3,
    surveillantId: 12,
    statut: "Confirmé",
    salle: "Amphi B",
    matin: true,
    matinDebut: "08:00",
    matinFin: "13:00",
    apm: true,
    apmDebut: "13:30",
    apmFin: "18:00",
    presence: "Non pointé",
  };
  it("affectation matin + après-midi → deux sessions moteur indépendantes", () => {
    const out = affectationToAssignments(aff);
    expect(out).toHaveLength(2);
    expect(out[0].sessionId).toBe("3-matin");
    expect(out[1].sessionId).toBe("3-apm");
    expect(detectSupervisorConflicts(out)).toHaveLength(0);
  });
  it("double affectation même créneau détectée après adaptation", () => {
    const double = [...affectationToAssignments(aff), ...affectationToAssignments({ ...aff, id: 8, salle: "Amphi C", apm: false })];
    const conflicts = detectSupervisorConflicts(double);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].message).toContain("Amphi");
  });
});
