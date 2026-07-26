import { describe, it, expect } from "vitest";
import { buildDemandeSheets, buildDemandePrintHtml, demandeFileBase, dossierFileBase, buildDossierReadme, periodeDemande, buildModeleSheets, MODELE_SHEET_INFOS, MODELE_SHEET_SALLES } from "../demande-export";
import { parseSallesFromText, parseModeleInfos } from "../demandes-constants";
import type { DemandeClient } from "../types";

function demande(): DemandeClient {
  return {
    id: 1,
    reference: "DC-2026-0420",
    statut: "À vérifier SPC",
    etablissement: "EM Lyon Business School",
    campus: "Écully",
    ville: "Lyon",
    referenceClient: "EML-1",
    typeEtablissement: "Business school",
    demandeur: { prenom: "Claire", nom: "Bonnet", fonction: "Resp. examens", email: "c.bonnet@x.fr", telephone: "0478" },
    responsableClient: { prenom: "Marc", nom: "Delaunay", email: "m.delaunay@x.fr" },
    responsableSpc: { nom: "Julien Mercier", role: "Coordinateur", email: "jm@spc.fr" },
    pmrPresent: true, pmrNombre: 3, pmrDetails: "Ascenseur B",
    tiersTempsPresent: true, tiersTempsNombre: 5,
    besoinsSpecifiques: ["Émargement", "Contrôle d'identité"],
    observations: "Session S1",
    salles: [
      { dateExamen: "2026-01-12", creneau: "matin", salle: "A21", batiment: "A", etudiants: 120, surveillants: 3, pmr: true, tiersTemps: true, debutSurveillance: "08:30", finSurveillance: "11:30", observations: "renforcée", ordre: 1 },
      { dateExamen: "2026-01-13", creneau: "apres-midi", salle: "B14", etudiants: 90, surveillants: 2, pmr: false, tiersTemps: false, debutSurveillance: "13:30", finSurveillance: "16:30", ordre: 2 },
    ],
  };
}

const now = new Date("2026-07-25T09:00:00Z");

describe("demandeFileBase", () => {
  it("produit un nom de fichier sanitisé et daté", () => {
    expect(demandeFileBase(demande(), now)).toBe("SPC_Demande_Client_EM-Lyon-Business-School_2026-07-25");
  });
});

describe("buildDemandeSheets", () => {
  const sheets = buildDemandeSheets(demande(), now);

  it("génère les 5 feuilles attendues", () => {
    expect(sheets.map((s) => s.name)).toEqual([
      "Synthèse demande", "Salles et horaires", "Responsables", "Besoins spécifiques", "Observations",
    ]);
  });

  it("calcule les totaux dans la synthèse (2 salles, 210 étud., 2 créneaux)", () => {
    const synth = Object.fromEntries(sheets[0].rows.map((r) => [r[0], r[1]]));
    expect(synth["Nombre total salles"]).toBe(2);
    expect(synth["Nombre total étudiants"]).toBe(210);
    expect(synth["Nombre total créneaux"]).toBe(2);
    expect(synth["Statut"]).toBe("À vérifier SPC");
  });

  it("liste une ligne d'en-tête + une ligne par salle", () => {
    expect(sheets[1].rows).toHaveLength(3); // header + 2 salles
    expect(sheets[1].rows[1][2]).toBe("A21");
  });

  it("reporte PMR et tiers-temps dans les besoins", () => {
    const types = sheets[3].rows.slice(1).map((r) => r[0]);
    expect(types).toContain("PMR");
    expect(types).toContain("Tiers-temps");
    expect(types).toContain("Émargement");
  });
});

describe("buildDemandePrintHtml", () => {
  const html = buildDemandePrintHtml(demande(), { nom: "Survéo", emoji: "🛡", couleur: "#0f766e" }, now);

  it("inclut la mention légale obligatoire", () => {
    expect(html).toContain("sous réserve de validation SPC");
    expect(html).toContain("ne constitue pas un devis définitif");
  });

  it("échappe le HTML des champs saisis", () => {
    const d = demande();
    d.observations = "<script>alert(1)</script>";
    const out = buildDemandePrintHtml(d, { nom: "Survéo", couleur: "#0f766e" }, now);
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("buildModeleSheets (modèle client)", () => {
  const sheets = buildModeleSheets();

  it("expose les onglets mode d'emploi, infos et salles", () => {
    const names = sheets.map((s) => s.name);
    expect(names).toContain("Mode d'emploi");
    expect(names).toContain(MODELE_SHEET_INFOS);
    expect(names).toContain(MODELE_SHEET_SALLES);
  });

  it("l'en-tête de l'onglet Salles est ignoré et la ligne d'exemple se parse en une salle valide", () => {
    const salles = sheets.find((s) => s.name === MODELE_SHEET_SALLES)!;
    const csv = salles.rows.map((r) => r.join("\t")).join("\n");
    const { salles: parsed } = parseSallesFromText(csv);
    expect(parsed).toHaveLength(1); // en-tête ignoré, 1 ligne d'exemple
    expect(parsed[0]).toMatchObject({ dateExamen: "2026-01-12", salle: "A21", etudiants: 120, surveillants: 3, pmr: true });
  });

  it("l'onglet infos vierge se parse sans établissement (à remplir par le client)", () => {
    const infosSheet = sheets.find((s) => s.name === MODELE_SHEET_INFOS)!;
    const infos = parseModeleInfos(infosSheet.rows);
    expect(infos.etablissement).toBe("");
  });
});

describe("dossierFileBase / buildDossierReadme (dossier ZIP)", () => {
  it("nomme le dossier SPC_Dossier_Demande_Client_[Client]_[date]", () => {
    expect(dossierFileBase(demande(), now)).toBe("SPC_Dossier_Demande_Client_EM-Lyon-Business-School_2026-07-25");
  });

  it("liste le contenu, les pièces incluses et les pièces manquantes", () => {
    const txt = buildDossierReadme(demande(), { pieces: ["01-plan.pdf"], manquantes: ["convocation.pdf"], now });
    expect(txt).toContain("EM Lyon Business School");
    expect(txt).toContain("DC-2026-0420");
    expect(txt).toContain(".xlsx");
    expect(txt).toContain("Fiche_");
    expect(txt).toContain("01-plan.pdf");
    expect(txt).toContain("convocation.pdf");
    expect(txt).toContain("sous réserve de validation SPC");
  });

  it("indique l'absence de pièce jointe", () => {
    const txt = buildDossierReadme(demande(), { pieces: [], now });
    expect(txt).toContain("aucune pièce jointe");
  });
});

describe("periodeDemande", () => {
  it("affiche une plage quand les dates diffèrent", () => {
    expect(periodeDemande(demande())).toContain("→");
  });
});
