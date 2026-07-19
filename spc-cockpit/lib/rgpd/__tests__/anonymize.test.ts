import { describe, it, expect } from "vitest";
import { anonymizedSurveillantFields, PAYROLL_AGGREGATE_COLUMNS } from "../anonymize";

describe("anonymizedSurveillantFields", () => {
  const fields = anonymizedSurveillantFields(42);

  it("efface les données identifiantes", () => {
    expect(fields.nom).toBe("Compte supprimé");
    expect(fields.prenom).toBeNull();
    expect(fields.telephone).toBeNull();
    expect(fields.zone).toBeNull();
    expect(fields.user_id).toBeNull();
  });

  it("remplace l'email par une adresse non résolvable, indexée sur l'id", () => {
    expect(fields.email).toBe("supprime-42@anonymise.invalid");
  });

  it("PRÉSERVE les agrégats de paie (ne les touche pas)", () => {
    // La règle métier : les heures / taux / nb_examens restent conservés 5 ans
    // pour la paie → ces colonnes ne doivent PAS figurer dans l'update.
    for (const col of PAYROLL_AGGREGATE_COLUMNS) {
      expect(fields).not.toHaveProperty(col);
    }
  });

  it("ne laisse aucune valeur identifiante en clair", () => {
    const serialized = JSON.stringify(fields);
    expect(serialized).not.toMatch(/@(?!anonymise\.invalid)/); // seul le domaine .invalid autorisé
  });
});
