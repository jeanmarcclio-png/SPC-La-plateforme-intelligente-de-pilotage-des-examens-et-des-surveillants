import { describe, it, expect } from "vitest";
import { redactSupervisor, redactSupervisors, containsPII, assertNoPII } from "../redaction";

describe("redactSupervisor", () => {
  it("remplace le nom par un identifiant et ne conserve aucune PII", () => {
    const r = redactSupervisor({ id: 12, nom: "Fatima Benali", email: "f.benali@spc.fr", telephone: "06 12 34 56 78", role: "Surveillant salle", statut: "Planifié", heures: 108 });
    expect(r.ref).toBe("S-12");
    expect(JSON.stringify(r)).not.toContain("Fatima");
    expect(JSON.stringify(r)).not.toContain("@");
    expect(r.heures).toBe(108);
  });
  it("mappe une liste", () => {
    expect(redactSupervisors([{ id: 1 }, { id: 2 }]).map((s) => s.ref)).toEqual(["S-1", "S-2"]);
  });
});

describe("containsPII", () => {
  it("détecte email et téléphone", () => {
    expect(containsPII("contact f.benali@spc.fr")).toBe(true);
    expect(containsPII("appelle le 06 12 34 56 78")).toBe(true);
    expect(containsPII("Salle A101 sous-dotée")).toBe(false);
  });
});

describe("assertNoPII", () => {
  it("bloque un payload contenant une PII", () => {
    expect(assertNoPII({ note: "email f.benali@spc.fr" }).ok).toBe(false);
  });
  it("laisse passer un payload propre", () => {
    expect(assertNoPII({ ref: "S-12", role: "Surveillant", heures: 108 }).ok).toBe(true);
  });
});
