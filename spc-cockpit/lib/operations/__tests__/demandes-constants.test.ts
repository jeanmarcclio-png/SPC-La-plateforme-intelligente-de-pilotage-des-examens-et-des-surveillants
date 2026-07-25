import { describe, it, expect } from "vitest";
import { validateDemande, generateDemandeReference, buildMissionFromDemande, parseSallesFromText, normalizeDate } from "../demandes-constants";
import type { DemandeClient } from "../types";

function demandeComplete(): DemandeClient {
  return {
    id: 1,
    reference: "DC-2026-0001",
    statut: "À vérifier",
    etablissement: "EM Lyon",
    demandeur: { nom: "Bonnet", email: "c.bonnet@x.fr" },
    responsableClient: { nom: "Delaunay", email: "m.delaunay@x.fr" },
    responsableSpc: { nom: "Julien Mercier" },
    pmrPresent: false,
    pmrNombre: 0,
    tiersTempsPresent: false,
    tiersTempsNombre: 0,
    besoinsSpecifiques: [],
    salles: [
      { dateExamen: "2026-01-12", creneau: "matin", salle: "A21", etudiants: 120, surveillants: 3, pmr: false, tiersTemps: false, debutSurveillance: "08:30", finSurveillance: "11:30", ordre: 1 },
    ],
  };
}

describe("validateDemande", () => {
  it("ne renvoie aucun blocage sur une demande complète", () => {
    expect(validateDemande(demandeComplete())).toEqual([]);
  });

  it("bloque une demande sans établissement, sans contacts, sans salle", () => {
    const d = demandeComplete();
    d.etablissement = "";
    d.demandeur = { nom: "", email: "" };
    d.responsableClient = { nom: "", email: "" };
    d.responsableSpc = {};
    d.salles = [];
    const errors = validateDemande(d);
    expect(errors).toContain("Établissement non renseigné");
    expect(errors).toContain("Demandeur incomplet (nom + email requis)");
    expect(errors).toContain("Responsable client incomplet (nom + email requis)");
    expect(errors).toContain("Responsable SPC non renseigné");
    expect(errors).toContain("Aucune salle renseignée");
  });

  it("détecte un horaire de surveillance incohérent", () => {
    const d = demandeComplete();
    d.salles[0].debutSurveillance = "11:30";
    d.salles[0].finSurveillance = "08:30";
    expect(validateDemande(d)).toContain("Salle A21 : horaire de surveillance incohérent");
  });

  it("exige un effectif PMR si PMR est signalé", () => {
    const d = demandeComplete();
    d.pmrPresent = true;
    d.pmrNombre = 0;
    expect(validateDemande(d)).toContain("PMR signalé mais effectif non renseigné");
  });

  it("exige des effectifs et surveillants positifs par salle", () => {
    const d = demandeComplete();
    d.salles[0].etudiants = 0;
    d.salles[0].surveillants = 0;
    const errors = validateDemande(d);
    expect(errors).toContain("Salle A21 : effectif étudiants manquant");
    expect(errors).toContain("Salle A21 : nombre de surveillants manquant");
  });
});

describe("generateDemandeReference", () => {
  it("produit une référence DC-AAAA-XXXX déterministe", () => {
    const ref = generateDemandeReference(new Date("2026-07-25T10:00:00Z"));
    expect(ref).toMatch(/^DC-2026-\d{4}$/);
  });
});

describe("normalizeDate", () => {
  it("accepte l'ISO et le format français", () => {
    expect(normalizeDate("2026-01-12")).toBe("2026-01-12");
    expect(normalizeDate("12/01/2026")).toBe("2026-01-12");
    expect(normalizeDate("5/3/2026")).toBe("2026-03-05");
    expect(normalizeDate("pas une date")).toBe("");
  });
});

describe("buildMissionFromDemande", () => {
  it("mappe vers une mission « À chiffrer » avec totaux et sans montant", () => {
    const m = buildMissionFromDemande(demandeComplete());
    expect(m.statut).toBe("À chiffrer");
    expect(m.client).toBe("EM Lyon");
    expect(m.reference).toBe("DC-2026-0001");
    expect(m.nb_salles).toBe(1);
    expect(m.nb_surveillants).toBe(3);
    expect(m.montant_ht).toBe(0);
    expect(m.date_mission).toBe("2026-01-12");
    expect(m.notes).toContain("DC-2026-0001");
  });
});

describe("parseSallesFromText", () => {
  it("parse un collage tabulé et convertit dates/booléens", () => {
    const txt = "12/01/2026\tMatin\tA21\tA\t120\t3\toui\toui\t09:00\t11:00\t08:30\t11:30\tsalle renforcée";
    const { salles, errors } = parseSallesFromText(txt);
    expect(errors).toEqual([]);
    expect(salles).toHaveLength(1);
    expect(salles[0]).toMatchObject({ dateExamen: "2026-01-12", creneau: "matin", salle: "A21", etudiants: 120, surveillants: 3, pmr: true, tiersTemps: true, debutSurveillance: "08:30" });
  });

  it("ignore l'en-tête, signale les lignes invalides sans les importer", () => {
    const txt = ["Date;Créneau;Salle;Bât;Étud;Surv", "13/01/2026;apres-midi;B14;B;90;2", ";matin;;;", "13/01/2026;matin;C02;C;0;1"].join("\n");
    const { salles, errors } = parseSallesFromText(txt);
    expect(salles.map((s) => s.salle)).toEqual(["B14", "C02"]);
    expect(errors.some((e) => /salle manquante/i.test(e))).toBe(true);
    expect(errors.some((e) => /effectif/i.test(e))).toBe(true);
  });
});
