import { describe, it, expect } from "vitest";
import {
  detectRoomCoverageRisks,
  detectConflictRisks,
  detectAccessibilityRisks,
  getJ48Risks,
  buildSessionRiskReport,
  detectCrossMissionConflicts,
  auditQuotePlanningConsistency,
  auditRoomCountConsistency,
} from "../risk";
import type { RoomPlanningInput, SupervisorAssignmentInput } from "../types";

const room = (over: Partial<RoomPlanningInput>): RoomPlanningInput => ({
  id: "r1", period: "morning", roomCode: "A101", startTime: "08:30", endTime: "11:30", requiredSupervisors: 1, ...over,
});
const assign = (over: Partial<SupervisorAssignmentInput>): SupervisorAssignmentInput => ({
  id: "a1", sessionId: "s1", roomId: "A101", supervisorId: "sup1", startTime: "08:30", endTime: "11:30", status: "confirmed", ...over,
});

describe("detectRoomCoverageRisks", () => {
  it("salle correctement dotée = aucun risque", () => {
    expect(detectRoomCoverageRisks([room({ requiredSupervisors: 1 })], [assign({})])).toHaveLength(0);
  });
  it("salle vide = risque critique", () => {
    const r = detectRoomCoverageRisks([room({ requiredSupervisors: 2 })], []);
    expect(r[0].type).toBe("salle_sous_dotee");
    expect(r[0].severity).toBe("critique");
    expect(r[0].evidence.manquants).toBe(2);
  });
  it("salle partiellement dotée = avertissement", () => {
    const r = detectRoomCoverageRisks([room({ requiredSupervisors: 2 })], [assign({})]);
    expect(r[0].severity).toBe("avertissement");
  });
  it("salle sur-dotée = information avec surplus", () => {
    const r = detectRoomCoverageRisks(
      [room({ requiredSupervisors: 1 })],
      [assign({}), assign({ id: "a2", supervisorId: "sup2" })]
    );
    expect(r[0].type).toBe("salle_sur_dotee");
    expect(r[0].evidence.surplus).toBe(1);
  });
  it("affectations absentes/remplacées exclues du décompte", () => {
    const r = detectRoomCoverageRisks([room({ requiredSupervisors: 1 })], [assign({ status: "absent" })]);
    expect(r[0].type).toBe("salle_sous_dotee");
  });
});

describe("detectConflictRisks", () => {
  it("double affectation chevauchante = risque critique", () => {
    const r = detectConflictRisks([assign({}), assign({ id: "a2", roomId: "B202" })]);
    expect(r).toHaveLength(1);
    expect(r[0].severity).toBe("critique");
  });
});

describe("detectAccessibilityRisks", () => {
  it("salle PMR sans surveillant = critique", () => {
    const r = detectAccessibilityRisks([room({ isPMR: true })], []);
    expect(r[0].type).toBe("pmr_non_couvert");
  });
  it("salle tiers-temps sans surveillant = avertissement", () => {
    const r = detectAccessibilityRisks([room({ hasExtraTime: true })], []);
    expect(r[0].type).toBe("tiers_temps_incoherent");
  });
  it("salle PMR couverte = aucun risque d'accessibilité", () => {
    expect(detectAccessibilityRisks([room({ isPMR: true })], [assign({})])).toHaveLength(0);
  });
});

describe("getJ48Risks", () => {
  it("J-0 avec salle non couverte = critique", () => {
    expect(getJ48Risks({ daysUntilSession: 0, uncoveredRooms: 1, missionLabel: "ICP" })[0].severity).toBe("critique");
  });
  it("J-2 = avertissement", () => {
    expect(getJ48Risks({ daysUntilSession: 2, uncoveredRooms: 1, missionLabel: "ICP" })[0].severity).toBe("avertissement");
  });
  it("J-6 = information", () => {
    expect(getJ48Risks({ daysUntilSession: 6, uncoveredRooms: 1, missionLabel: "ICP" })[0].severity).toBe("information");
  });
  it("aucune salle non couverte = aucun risque", () => {
    expect(getJ48Risks({ daysUntilSession: 0, uncoveredRooms: 0, missionLabel: "ICP" })).toHaveLength(0);
  });
  it("session lointaine (> J-7) = aucun risque J-48", () => {
    expect(getJ48Risks({ daysUntilSession: 30, uncoveredRooms: 3, missionLabel: "ICP" })).toHaveLength(0);
  });
});

describe("buildSessionRiskReport", () => {
  it("agrège et trie par gravité, compte par niveau", () => {
    const rooms = [room({ roomCode: "A101", requiredSupervisors: 2, isPMR: true }), room({ roomCode: "B202", requiredSupervisors: 1 })];
    const assignments = [assign({ roomId: "A101" })]; // A101 sous-dotée + B202 vide
    const { risks, counts } = buildSessionRiskReport({ rooms, assignments, daysUntilSession: 1, missionLabel: "ICP Paris" });
    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].severity).toBe("critique"); // tri : critiques en tête
    expect(counts.critique + counts.avertissement + counts.information).toBe(risks.length);
    expect(risks.every((r) => r.requiresHumanAction === true)).toBe(true);
  });
});

describe("detectCrossMissionConflicts", () => {
  it("même surveillant, deux missions, même jour, chevauchement = conflit inter-missions", () => {
    const a = [
      { id: "m1", sessionId: "2026-07-08-matin", roomId: "3:A21", supervisorId: "S-1", startTime: "08:00", endTime: "12:00", status: "confirmed" as const },
      { id: "m2", sessionId: "2026-07-08-matin", roomId: "9:B10", supervisorId: "S-1", startTime: "10:00", endTime: "13:00", status: "confirmed" as const },
    ];
    const r = detectCrossMissionConflicts(a);
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe("conflit_inter_missions");
  });
  it("même mission = pas un conflit inter-missions", () => {
    const a = [
      { id: "m1", sessionId: "2026-07-08-matin", roomId: "3:A21", supervisorId: "S-1", startTime: "08:00", endTime: "12:00", status: "confirmed" as const },
      { id: "m2", sessionId: "2026-07-08-matin", roomId: "3:B10", supervisorId: "S-1", startTime: "10:00", endTime: "13:00", status: "confirmed" as const },
    ];
    expect(detectCrossMissionConflicts(a)).toHaveLength(0);
  });
});

describe("auditQuotePlanningConsistency", () => {
  it("planning aligné sur le devis = aucun risque", () => {
    expect(auditQuotePlanningConsistency({ devisNbSalles: 4, planningNbSalles: 4, devisNbSurveillants: 9, planningNbSurveillants: 9 })).toHaveLength(0);
  });
  it("écart de salles et de surveillants = deux risques", () => {
    const r = auditQuotePlanningConsistency({ devisNbSalles: 4, planningNbSalles: 3, devisNbSurveillants: 9, planningNbSurveillants: 7 });
    expect(r).toHaveLength(2);
    expect(r.every((x) => x.type === "incoherence_devis_planning")).toBe(true);
  });
});

describe("auditRoomCountConsistency", () => {
  it("aligné = aucun risque", () => {
    expect(auditRoomCountConsistency({ declaredRooms: 4, distinctAssignedRooms: 4 })).toHaveLength(0);
  });
  it("écart = risque incoherence_nb_salles", () => {
    const r = auditRoomCountConsistency({ declaredRooms: 4, distinctAssignedRooms: 2 });
    expect(r[0].type).toBe("incoherence_nb_salles");
  });
});
