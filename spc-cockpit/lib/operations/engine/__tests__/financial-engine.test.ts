import { describe, it, expect } from "vitest";
import {
  parseTimeToMinutes,
  calculateRoomDurationMinutes,
  calculateRoomDurationHours,
  calculateRoomBillableHours,
  calculatePeriodBillableHours,
  calculateSessionBillableHours,
  calculateMissionBillableHours,
  calculateFinancialEstimate,
  calculateDevisTotals,
  ttcFromHT,
  eurosToCents,
  formatCurrencyFromCents,
  formatHours,
} from "../financial-engine";
import type { RoomPlanningInput } from "../types";

const room = (over: Partial<RoomPlanningInput>): RoomPlanningInput => ({
  id: "r1",
  period: "morning",
  roomCode: "A101",
  startTime: "08:30",
  endTime: "11:30",
  requiredSupervisors: 2,
  ...over,
});

describe("durées", () => {
  it("08:30 → 11:30 = 3 h", () => {
    expect(calculateRoomDurationHours("08:30", "11:30")).toBe(3);
  });
  it("13:30 → 18:10 = 4 h 40 (280 min)", () => {
    expect(calculateRoomDurationMinutes("13:30", "18:10")).toBe(280);
  });
  it("fin avant début = erreur", () => {
    expect(() => calculateRoomDurationMinutes("11:00", "09:00")).toThrow();
  });
  it("fin égale au début = erreur", () => {
    expect(() => calculateRoomDurationMinutes("09:00", "09:00")).toThrow();
  });
  it("format invalide = erreur contrôlée", () => {
    expect(() => parseTimeToMinutes("9h30")).toThrow(/Horaire invalide/);
    expect(() => parseTimeToMinutes("25:00")).toThrow();
  });
});

describe("heures facturables", () => {
  it("3 h × 2 surveillants = 6 h", () => {
    expect(calculateRoomBillableHours(room({}))).toBe(6);
  });
  it("plusieurs salles matin = somme correcte", () => {
    const rooms = [room({}), room({ id: "r2", roomCode: "A102", requiredSupervisors: 1 })];
    expect(calculatePeriodBillableHours(rooms, "morning")).toBe(9);
  });
  it("matin et après-midi indépendants", () => {
    const rooms = [
      room({}),
      room({ id: "r3", period: "afternoon", startTime: "13:30", endTime: "17:30", requiredSupervisors: 3 }),
    ];
    expect(calculatePeriodBillableHours(rooms, "morning")).toBe(6);
    expect(calculatePeriodBillableHours(rooms, "afternoon")).toBe(12);
    expect(calculateSessionBillableHours(rooms)).toBe(18);
  });
  it("0 surveillant = 0 h", () => {
    expect(calculateRoomBillableHours(room({ requiredSupervisors: 0 }))).toBe(0);
  });
  it("salle invalide ne produit pas de faux total", () => {
    const rooms = [room({}), room({ id: "bad", startTime: "11:00", endTime: "09:00" })];
    expect(calculateSessionBillableHours(rooms)).toBe(6);
  });
  it("mission = somme des sessions", () => {
    expect(calculateMissionBillableHours([{ rooms: [room({})] }, { rooms: [room({ id: "r9" })] }])).toBe(12);
  });
});

describe("cas financier de référence", () => {
  // 100 h × 30 € × 1.20 + 50 € frais, TVA 20 %
  const estimate = calculateFinancialEstimate({
    billableHours: 100,
    hourlyRateCents: 3000,
    adjustmentCoefficient: 1.2,
    billableExpensesCents: 5000,
    vatRate: 0.2,
  });
  it("montant brut HT = 3 000,00 €", () => expect(estimate.baseHTCents).toBe(300000));
  it("montant ajusté HT = 3 600,00 €", () => expect(estimate.adjustedHTCents).toBe(360000));
  it("total HT = 3 650,00 €", () => expect(estimate.totalHTCents).toBe(365000));
  it("TVA = 730,00 €", () => expect(estimate.vatCents).toBe(73000));
  it("total TTC = 4 380,00 €", () => expect(estimate.totalTTCents).toBe(438000));
});

describe("règles financières", () => {
  it("coefficient 1.00 = aucun ajustement", () => {
    const e = calculateFinancialEstimate({ billableHours: 10, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 });
    expect(e.adjustedHTCents).toBe(e.baseHTCents);
  });
  it("frais = 0 et TVA = 0", () => {
    const e = calculateFinancialEstimate({ billableHours: 10, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0 });
    expect(e.vatCents).toBe(0);
    expect(e.totalTTCents).toBe(e.totalHTCents);
  });
  it("coefficient invalide = erreur", () => {
    expect(() => calculateFinancialEstimate({ billableHours: 1, hourlyRateCents: 100, adjustmentCoefficient: 0, billableExpensesCents: 0, vatRate: 0.2 })).toThrow();
  });
  it("taux horaire invalide = erreur", () => {
    expect(() => calculateFinancialEstimate({ billableHours: 1, hourlyRateCents: -100, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 })).toThrow();
  });
  it("pas de double application : TTC = HT + TVA exactement", () => {
    const e = calculateFinancialEstimate({ billableHours: 262.3, hourlyRateCents: 2800, adjustmentCoefficient: 1, billableExpensesCents: 0, vatRate: 0.2 });
    expect(e.totalTTCents).toBe(e.totalHTCents + e.vatCents);
  });
  it("pas d'erreur flottante 0.1 + 0.2 : devis ICP Reims 7344,40 € → TTC 8813,28 €", () => {
    const t = calculateDevisTotals({ baseBruteHT: 7344.4 });
    expect(t.tva).toBe(1468.88);
    expect(t.ttc).toBe(8813.28);
  });
  it("ttcFromHT : 4042 → 4850.40", () => {
    expect(ttcFromHT(4042)).toBe(4850.4);
  });
  it("devis avec frais et remise", () => {
    const t = calculateDevisTotals({ baseBruteHT: 5200, fraisDeplacement: 120, fraisCoordination: 80, remise: 100 });
    expect(t.ht).toBe(5300);
    expect(t.ttc).toBe(6360);
  });
});

describe("formatage (séparé des calculs)", () => {
  it("1 250,00 €", () => {
    expect(formatCurrencyFromCents(125000).replace(/ | /g, " ")).toBe("1 250,00 €");
  });
  it("6 h 30 et 3 h", () => {
    expect(formatHours(6.5)).toBe("6 h 30");
    expect(formatHours(3)).toBe("3 h");
  });
  it("eurosToCents évite les flottants", () => {
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
  });
});
