import { describe, it, expect } from "vitest";
import { validateDemande, generateDemandeReference } from "../demandes-constants";
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
