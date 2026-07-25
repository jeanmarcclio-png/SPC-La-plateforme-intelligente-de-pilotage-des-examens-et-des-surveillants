import { describe, it, expect } from "vitest";
import { validateDemande, evaluateDemande, generateDemandeReference, buildMissionFromDemande, parseSallesFromText, normalizeDate, sanitizeFilename, validatePieceMeta, piecePath, formatTaille, PIECES_MAX_BYTES } from "../demandes-constants";
import type { DemandeClient } from "../types";

function demandeComplete(): DemandeClient {
  return {
    id: 1,
    reference: "DC-2026-0001",
    statut: "À vérifier SPC",
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

describe("evaluateDemande (3 niveaux)", () => {
  it("aucune erreur sur une demande conforme, mais des avertissements non bloquants", () => {
    const ev = evaluateDemande(demandeComplete());
    expect(ev.erreurs).toEqual([]);
    expect(ev.avertissements).toContain("Téléphone du demandeur absent");
    expect(ev.avertissements).toContain("Référence client absente");
  });

  it("classe un email invalide en erreur bloquante", () => {
    const d = demandeComplete();
    d.demandeur.email = "pas-un-email";
    expect(evaluateDemande(d).erreurs).toContain("Email du demandeur invalide");
  });

  it("range campus/service absents en information (non bloquant)", () => {
    const ev = evaluateDemande(demandeComplete());
    expect(ev.infos).toContain("Campus / site non précisé");
    expect(ev.erreurs).not.toContain("Campus / site non précisé");
  });
});

describe("pièces jointes", () => {
  it("sanitise un nom de fichier (chemin, accents, espaces retirés)", () => {
    expect(sanitizeFilename("../Plan Salles Été.pdf")).toBe("Plan-Salles-Ete.pdf");
    expect(sanitizeFilename("C:\\dossier\\a b.png")).toBe("a-b.png");
  });

  it("construit un chemin org/demande/timestamp-fichier", () => {
    const p = piecePath("org-1", 42, "plan salles.pdf", new Date("2026-07-25T00:00:00Z"));
    expect(p).toBe(`org-1/42/${new Date("2026-07-25T00:00:00Z").getTime()}-plan-salles.pdf`);
  });

  it("valide taille et extension", () => {
    expect(validatePieceMeta({ name: "x.pdf", size: 1000 })).toBeNull();
    expect(validatePieceMeta({ name: "x.exe", size: 1000 })).toMatch(/non accepté/i);
    expect(validatePieceMeta({ name: "x.pdf", size: PIECES_MAX_BYTES + 1 })).toMatch(/volumineux/i);
    expect(validatePieceMeta({ name: "x.pdf", size: 0 })).toMatch(/vide/i);
  });

  it("formate la taille", () => {
    expect(formatTaille(500)).toBe("500 o");
    expect(formatTaille(2048)).toBe("2 Ko");
    expect(formatTaille(1572864)).toBe("1.5 Mo");
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
