import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone, scrub } from "../log";

describe("maskEmail", () => {
  it("masque la locale en conservant le domaine", () => {
    expect(maskEmail("jean.dupont@ecole.fr")).toBe("j***@ecole.fr");
    expect(maskEmail("a@b.fr")).toBe("a***@b.fr");
  });
  it("masque un email au milieu d'un texte libre", () => {
    expect(maskEmail("contact: marie.l@spc.fr svp")).toBe("contact: m***@spc.fr svp");
  });
  it("chaîne vide / null → vide", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
  });
});

describe("maskPhone", () => {
  it("ne garde que les 2 premiers et 2 derniers chiffres", () => {
    expect(maskPhone("0612345678")).toBe("06******78");
  });
  it("gère les séparateurs", () => {
    expect(maskPhone("06 12 34 56 78")).toBe("06******78");
  });
});

describe("scrub (défense en profondeur logs)", () => {
  it("masque email et téléphone dans un objet imbriqué", () => {
    const input = {
      nom: "Marie Lecomte",
      email: "marie@spc.fr",
      telephone: "06 12 34 56 78",
      meta: { note: "rappeler au 0699887766 ou marie@spc.fr" },
    };
    const out = scrub(input) as Record<string, unknown>;
    const serialized = JSON.stringify(out);
    // aucun email ni numéro complet en clair
    expect(serialized).not.toContain("marie@spc.fr");
    expect(serialized).not.toContain("0699887766");
    expect(serialized).not.toContain("0612345678");
    // le nom (non ciblé) reste lisible
    expect(out.nom).toBe("Marie Lecomte");
  });
  it("masque par nom de champ sensible", () => {
    const out = scrub({ mail: "x@y.fr", mobile: "0612345678" }) as Record<string, string>;
    expect(out.mail).toBe("x***@y.fr");
    expect(out.mobile).toBe("06******78");
  });
});
