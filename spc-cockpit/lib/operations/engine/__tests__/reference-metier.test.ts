// Tests de SCÉNARIO (acceptation) — enchaînent plusieurs briques du moteur
// comme un vrai parcours métier : planning des salles → heures facturables →
// devis HT/TVA/TTC, et validation de session (sous-effectif, conflit).
// Complètent les tests unitaires ; servent de spécification exécutable.

import { describe, it, expect } from "vitest";
import {
  calculateSessionBillableHours,
  calculateMissionBillableHours,
  calculateFinancialEstimate,
  calculateDevisTotals,
  validateSessionForApproval,
  type RoomPlanningInput,
  type SupervisorAssignmentInput,
} from "../index";

const room = (o: Partial<RoomPlanningInput>): RoomPlanningInput => ({
  id: "r1", period: "morning", roomCode: "A101",
  startTime: "08:30", endTime: "11:30", requiredSupervisors: 2, ...o,
});

const assign = (o: Partial<SupervisorAssignmentInput>): SupervisorAssignmentInput => ({
  id: "a1", sessionId: "s1", roomId: "A101", supervisorId: "1",
  startTime: "08:30", endTime: "11:30", ...o,
});

describe("Scénario — devis à partir du planning réel", () => {
  it("2 salles (matin + après-midi) → heures → HT/TVA/TTC cohérents", () => {
    const rooms: RoomPlanningInput[] = [
      room({ startTime: "08:00", endTime: "12:00", requiredSupervisors: 3 }), // 4 h × 3 = 12
      room({ id: "r2", roomCode: "B202", period: "afternoon", startTime: "14:00", endTime: "18:00", requiredSupervisors: 2 }), // 4 h × 2 = 8
    ];
    const heures = calculateSessionBillableHours(rooms);
    expect(heures).toBe(20);

    const devis = calculateFinancialEstimate({
      billableHours: heures, hourlyRateCents: 3000, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2,
    });
    expect(devis.totalHTCents).toBe(60000); // 20 h × 30 € = 600,00 €
    expect(devis.totalTTCents).toBe(72000); // 600 × 1.20 = 720,00 €
    expect(devis.totalTTCents).toBe(devis.totalHTCents + devis.vatCents); // jamais de double TVA
  });
});

describe("Scénario — modification d'un horaire recalcule le devis", () => {
  it("prolonger une salle d'1 h augmente proportionnellement les heures et le HT", () => {
    const avant = calculateSessionBillableHours([room({ startTime: "08:00", endTime: "11:00", requiredSupervisors: 2 })]); // 3 h × 2 = 6
    const apres = calculateSessionBillableHours([room({ startTime: "08:00", endTime: "12:00", requiredSupervisors: 2 })]); // 4 h × 2 = 8
    expect(avant).toBe(6);
    expect(apres).toBe(8);

    const htAvant = calculateFinancialEstimate({ billableHours: avant, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 }).totalHTCents;
    const htApres = calculateFinancialEstimate({ billableHours: apres, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 }).totalHTCents;
    expect(htApres).toBeGreaterThan(htAvant);
    expect(htApres - htAvant).toBe(2 * 2800); // +2 h × 28 €
  });
});

describe("Scénario — mission sur plusieurs jours", () => {
  it("total mission = somme des sessions journalières", () => {
    const jour1 = [room({ requiredSupervisors: 2 })]; // 3 h × 2 = 6
    const jour2 = [room({ id: "r2", startTime: "09:00", endTime: "12:00", requiredSupervisors: 1 })]; // 3 h × 1 = 3
    expect(calculateMissionBillableHours([{ rooms: jour1 }, { rooms: jour2 }])).toBe(9);
  });
});

describe("Scénario — devis complet avec coefficient, frais et remise", () => {
  it("base 5 000 € × 1,15 + 200 frais − 150 remise → TTC exact", () => {
    const t = calculateDevisTotals({
      baseBruteHT: 5000, coefficient: 1.15, fraisDeplacement: 120, fraisCoordination: 80, remise: 150,
    });
    expect(t.baseAjustee).toBe(5750); // 5000 × 1.15, appliqué une seule fois
    expect(t.ht).toBe(5800); // 5750 + 120 + 80 − 150
    expect(t.tva).toBe(1160); // 20 %
    expect(t.ttc).toBe(6960); // 5800 + 1160
  });
});

describe("Scénario — une session ne se valide pas si elle est risquée", () => {
  it("salle sous-effectif → validation bloquée", () => {
    const r = validateSessionForApproval({
      rooms: [room({ requiredSupervisors: 2 })],
      assignments: [assign({})], // 1 seul surveillant pour 2 requis
    });
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.code === "ROOM_UNDERSTAFFED")).toBe(true);
  });

  it("double affectation du même surveillant → validation bloquée", () => {
    const r = validateSessionForApproval({
      rooms: [room({ requiredSupervisors: 1 }), room({ id: "r2", roomCode: "B202", requiredSupervisors: 1 })],
      assignments: [assign({}), assign({ id: "a2", roomId: "B202" })], // même supervisorId "1", même créneau
    });
    expect(r.isValid).toBe(false);
    expect(r.issues.some((i) => i.code === "SUPERVISOR_CONFLICT")).toBe(true);
  });
});
