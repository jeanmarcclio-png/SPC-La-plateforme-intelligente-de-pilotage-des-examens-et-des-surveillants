import { describe, it, expect } from "vitest";
import { redactSupervisor, redactSupervisors, containsPII, assertNoPII, maskEmail, maskPhone, removeFreeTextPII, createStablePseudonymousId, redactAssignment, buildPlanningRiskSafePayload } from "../redaction";

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
  it("ne confond pas une date ISO avec un téléphone", () => {
    expect(containsPII("Session du 2026-07-08")).toBe(false);
    expect(containsPII('{"date":"2026-07-08","statut":"Planifiée"}')).toBe(false);
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

describe("maskEmail / maskPhone", () => {
  it("masque un email en conservant la structure", () => {
    const m = maskEmail("mathilde.regnier@icp.fr");
    expect(m).not.toContain("mathilde");
    expect(m).toContain("@");
    expect(m.endsWith(".fr")).toBe(true);
  });
  it("masque un téléphone en ne gardant que 2 chiffres", () => {
    const m = maskPhone("06 12 34 56 78");
    expect(m.endsWith("78")).toBe(true);
    expect(m).not.toContain("06 12");
  });
});

describe("removeFreeTextPII", () => {
  it("neutralise email et téléphone dans un texte libre", () => {
    const out = removeFreeTextPII("Contacter f.benali@spc.fr ou 06 12 34 56 78 pour renfort");
    expect(out).toContain("[email]");
    expect(out).toContain("[téléphone]");
    expect(containsPII(out)).toBe(false);
  });
  it("laisse un texte sans PII intact", () => {
    expect(removeFreeTextPII("Salle renforcée, fin décalée")).toBe("Salle renforcée, fin décalée");
  });
});

describe("createStablePseudonymousId", () => {
  it("est stable et sans PII", () => {
    expect(createStablePseudonymousId("Surveillant", 12)).toBe("S-12");
    expect(createStablePseudonymousId("Surveillant", 12)).toBe(createStablePseudonymousId("Surveillant", 12));
    expect(createStablePseudonymousId("Affectation", 7)).toBe("A-7");
  });
});

describe("redactAssignment", () => {
  it("projette une affectation sans PII, note nettoyée", () => {
    const r = redactAssignment({ id: 7, surveillantId: 12, salle: "A21", matin: true, matinDebut: "08:00", matinFin: "13:00", observations: "appeler 06 12 34 56 78" });
    expect(r.supervisorRef).toBe("S-12");
    expect(r.salle).toBe("A21");
    expect(containsPII(JSON.stringify(r))).toBe(false);
  });
});

describe("buildPlanningRiskSafePayload", () => {
  it("produit un payload sans PII", () => {
    const p = buildPlanningRiskSafePayload({
      supervisors: [{ id: 1, nom: "Fatima Benali", email: "f@spc.fr", telephone: "06 12 34 56 78", role: "Surveillant", statut: "Annulé", heures: 108 }],
      assignments: [{ id: 5, surveillantId: 1, salle: "A21", matin: true, matinDebut: "08:00", matinFin: "13:00" }],
      aggregates: { salles: 4, surveillants: 9 },
    });
    expect(assertNoPII(p).ok).toBe(true);
    expect(p.equipe[0].ref).toBe("S-1");
    expect(p.aggregates.salles).toBe(4);
  });
});
