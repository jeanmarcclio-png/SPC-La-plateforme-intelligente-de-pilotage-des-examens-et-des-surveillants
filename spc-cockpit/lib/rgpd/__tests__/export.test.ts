import { describe, it, expect } from "vitest";
import { buildExportDossier, buildAffectationsCsv } from "../export";

describe("buildExportDossier (droit d'accès / portabilité)", () => {
  const s = {
    nom: "Marie Lecomte", prenom: "Marie", email: "marie@spc.fr",
    telephone: "0612345678", role: "Coordinatrice", zone: "Paris",
    heures: 120.5, taux_horaire: 30, nb_examens: 14,
  };
  const affectations = [
    { id: 1, mission_id: 7, session_id: "S-1", salle: "B22", statut: "confirmé", matin: true, apm: false, presence: "présent" },
  ];
  const dispo = [{ id: 3, jour: "2026-06-15", matin: true }];

  it("assemble identité + heures + affectations + disponibilités", () => {
    const d = buildExportDossier(s, affectations, dispo, new Date("2026-07-19T10:00:00Z"));
    expect(d.exporte_le).toBe("2026-07-19T10:00:00.000Z");
    expect(d.identite).toEqual({
      nom: "Marie Lecomte", prenom: "Marie", email: "marie@spc.fr",
      telephone: "0612345678", role: "Coordinatrice", zone: "Paris",
    });
    expect(d.heures).toEqual({ total_heures: 120.5, taux_horaire: 30, nb_examens: 14 });
    expect(d.affectations).toHaveLength(1);
    expect(d.disponibilites).toHaveLength(1);
  });

  it("gère les champs manquants sans casser (valeurs par défaut)", () => {
    const d = buildExportDossier({ nom: "X" }, [], []);
    expect(d.identite.email).toBeNull();
    expect(d.heures.total_heures).toBe(0);
    expect(d.heures.nb_examens).toBe(0);
    expect(d.affectations).toEqual([]);
  });
});

describe("buildAffectationsCsv", () => {
  it("produit un CSV avec en-tête et échappe les guillemets", () => {
    const csv = buildAffectationsCsv([
      { id: 1, mission_id: 7, session_id: "S-1", salle: 'B"22', statut: "ok", matin: true, apm: false, presence: "p" },
    ]);
    const [head, row] = csv.split("\n");
    expect(head).toBe("id,mission_id,session_id,salle,statut,matin,apm,presence");
    expect(row).toContain('"B""22"'); // guillemet interne échappé
  });

  it("en-tête seul si aucune affectation", () => {
    expect(buildAffectationsCsv([])).toBe("id,mission_id,session_id,salle,statut,matin,apm,presence");
  });
});
