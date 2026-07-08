import { describe, it, expect } from "vitest";
import { buildAgentEvent, filterEventsByOrg, type AgentEvent } from "../agent-events";

const base = {
  tool: "planning-risk",
  userRef: "U-42",
  analysisType: "risk-audit",
  status: "success" as const,
  createdAt: "2026-07-08T10:00:00Z",
};

describe("buildAgentEvent", () => {
  it("crée un événement valide sans PII", () => {
    const e = buildAgentEvent({ ...base, missionRef: "EX-2026-041", resultSummary: "3 risques, 1 critique", argsSummary: { missionRef: "EX-2026-041" } });
    expect(e.status).toBe("success");
    expect(e.missionRef).toBe("EX-2026-041");
    expect(e.orgId).toBeNull();
  });
  it("bloque un événement contenant une PII brute", () => {
    expect(() => buildAgentEvent({ ...base, resultSummary: "contacter f.benali@spc.fr" })).toThrow();
    expect(() => buildAgentEvent({ ...base, argsSummary: { tel: "06 12 34 56 78" } })).toThrow();
  });
  it("statuts métier supportés", () => {
    for (const status of ["success", "error", "blocked", "requires_human_validation"] as const) {
      expect(buildAgentEvent({ ...base, status }).status).toBe(status);
    }
  });
});

describe("filterEventsByOrg", () => {
  const events: AgentEvent[] = [
    buildAgentEvent({ ...base, orgId: "org-A" }),
    buildAgentEvent({ ...base, orgId: "org-B" }),
    buildAgentEvent({ ...base, orgId: null }),
  ];
  it("ne renvoie que les événements de l'organisation demandée", () => {
    expect(filterEventsByOrg(events, "org-A")).toHaveLength(1);
    expect(filterEventsByOrg(events, "org-A")[0].orgId).toBe("org-A");
  });
  it("un membre de org-A ne voit pas org-B", () => {
    expect(filterEventsByOrg(events, "org-A").some((e) => e.orgId === "org-B")).toBe(false);
  });
});
