import { describe, expect, it } from "vitest";
import {
  completudeDemande,
  echeanceDemande,
  estUrgente,
  fraicheurDemande,
  ligneCockpit,
  potentielIndicatifHT,
  prochaineActionDemande,
  synthesePortefeuille,
} from "../cockpit";
import { demandesDemo } from "../mock";
import type { DemandeClient, LigneSalleDemande } from "../types";

const MAINTENANT = new Date("2026-06-14T10:00:00Z");

function ligne(p: Partial<LigneSalleDemande> = {}): LigneSalleDemande {
  return { id: Math.random().toString(36).slice(2), ...p };
}

function demande(p: Partial<DemandeClient> = {}): DemandeClient {
  return {
    id: "1",
    reference: "DC-20260614-001",
    etablissement: "ICP Paris",
    campus: "Campus Bauer",
    demandeur: { prenom: "Marie", nom: "Lecomte", email: "marie@icp.fr" },
    responsableClient: { prenom: "Paul", nom: "Durand", email: "paul@icp.fr" },
    responsableSpc: "Jean-Marc Clio",
    lignes: [ligne({ date: "2026-06-16", salle: "B22", etudiants: 30, surveillants: 1, debutExamen: "08:30", finExamen: "11:30" })],
    pmrPresence: false,
    ttPresence: false,
    observations: "RAS",
    statut: "À vérifier",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-06-14T08:00:00Z",
    historique: [],
    ...p,
  };
}

describe("complétude", () => {
  it("atteint 100 % quand les 11 blocs métier sont renseignés", () => {
    expect(completudeDemande(demande()).pct).toBe(100);
  });

  it("ne compte pas une question de besoin jamais tranchée", () => {
    const sansPmr = demande({ pmrPresence: undefined });
    // Bloc PMR (poids 6) perdu intégralement.
    expect(completudeDemande(sansPmr).pct).toBe(94);
  });

  it("accorde un crédit partiel proportionnel aux lignes renseignées", () => {
    const d = demande({
      lignes: [
        ligne({ date: "2026-06-16", salle: "B22", etudiants: 30, surveillants: 1, debutExamen: "08:30", finExamen: "11:30" }),
        ligne({ date: "2026-06-16", creneau: "Matin" }),
      ],
    });
    const c = completudeDemande(d);
    // Salles, effectifs et horaires tombent à 1/2 : −(14 + 12 + 12)/2 = −19.
    expect(c.pct).toBe(81);
    expect(c.blocs.find((b) => b.cle === "salles")?.score).toBe(0.5);
  });

  it("classe les blocs manquants du plus pénalisant au moins pénalisant", () => {
    const d = demande({ pmrPresence: undefined, observations: "", besoinsParticuliers: [], campus: "", ville: "" });
    const cles = completudeDemande(d).manquants.map((b) => b.cle);
    expect(cles).toEqual(["campus", "pmr", "infos"]);
  });

  it("reste à 0 % de lignes quand aucune ligne n'est exploitable", () => {
    const c = completudeDemande(demande({ lignes: [] }));
    expect(c.blocs.find((b) => b.cle === "periode")?.score).toBe(0);
    expect(c.blocs.find((b) => b.cle === "salles")?.score).toBe(0);
  });
});

describe("échéance et urgence", () => {
  it("compte les jours restants jusqu'à la première épreuve", () => {
    expect(echeanceDemande(demande(), MAINTENANT)?.jours).toBe(2);
  });

  it("renvoie null sans aucune date d'épreuve", () => {
    expect(echeanceDemande(demande({ lignes: [ligne({ creneau: "Matin" })] }), MAINTENANT)).toBeNull();
  });

  it("signale une épreuve dépassée", () => {
    const d = demande({ lignes: [ligne({ date: "2026-06-10", salle: "B22", etudiants: 10 })] });
    const e = echeanceDemande(d, MAINTENANT);
    expect(e?.jours).toBe(-4);
    expect(e?.depassee).toBe(true);
  });

  it("déclare urgente une demande proche ET non validée", () => {
    expect(estUrgente(demande(), MAINTENANT)).toBe(true);
  });

  it("n'est pas urgente si l'épreuve est lointaine", () => {
    const d = demande({ lignes: [ligne({ date: "2026-07-30", salle: "B22", etudiants: 30 })] });
    expect(estUrgente(d, MAINTENANT)).toBe(false);
  });

  it("n'est pas urgente si le dossier est complet et validé SPC", () => {
    expect(estUrgente(demande({ statut: "Validée SPC" }), MAINTENANT)).toBe(false);
  });

  it("n'est jamais urgente une fois close ou convertie", () => {
    expect(estUrgente(demande({ statut: "Archivée" }), MAINTENANT)).toBe(false);
    expect(estUrgente(demande({ statut: "Convertie en mission" }), MAINTENANT)).toBe(false);
  });
});

describe("prochaine action", () => {
  it("propose la conversion sur une demande validée SPC", () => {
    expect(prochaineActionDemande(demande({ statut: "Validée SPC" }))).toEqual({
      label: "Convertir en mission",
      detail: "Proposition prête",
    });
  });

  it("nomme les deux blocs les plus pénalisants sur une demande à vérifier", () => {
    const d = demande({
      lignes: [
        ligne({ date: "2026-06-16", etudiants: 30, surveillants: 1, debutExamen: "08:30", finExamen: "11:30" }),
        ligne({ date: "2026-06-16", etudiants: 20, surveillants: 1, debutExamen: "08:30", finExamen: "11:30" }),
      ],
      pmrPresence: undefined,
    });
    expect(prochaineActionDemande(d)).toEqual({
      label: "Vérifier les salles",
      detail: "Compléter le volet PMR",
    });
  });

  it("renvoie vers la saisie sur un brouillon", () => {
    const action = prochaineActionDemande(demande({ statut: "Brouillon", lignes: [] }));
    expect(action.label).toBe("Compléter les infos");
    expect(action.detail).toBe("Salles & Période");
  });

  it("ne propose plus rien sur un dossier clos", () => {
    expect(prochaineActionDemande(demande({ statut: "Archivée" })).label).toBe("Aucune action");
  });
});

describe("potentiel indicatif", () => {
  it("pondère le pipeline par l'effectif étudiant (30 € HT indicatifs)", () => {
    const d = demande({ lignes: [ligne({ date: "2026-06-16", salle: "Amphi A", etudiants: 180, surveillants: 6 })] });
    expect(potentielIndicatifHT(d)).toBe(5400);
  });
});

describe("fraîcheur", () => {
  it("exprime l'ancienneté en heures puis en jours", () => {
    expect(fraicheurDemande(demande({ updatedAt: "2026-06-14T08:00:00Z" }), MAINTENANT).label).toBe("Il y a 2 h");
    expect(fraicheurDemande(demande({ updatedAt: "2026-06-13T08:00:00Z" }), MAINTENANT).label).toBe("Il y a 1 j");
  });

  it("passe en vigilance au-delà de 24 h puis en obsolète au-delà de 72 h", () => {
    expect(fraicheurDemande(demande({ updatedAt: "2026-06-14T08:00:00Z" }), MAINTENANT).ton).toBe("frais");
    expect(fraicheurDemande(demande({ updatedAt: "2026-06-12T08:00:00Z" }), MAINTENANT).ton).toBe("attention");
    expect(fraicheurDemande(demande({ updatedAt: "2026-06-01T08:00:00Z" }), MAINTENANT).ton).toBe("obsolete");
  });
});

describe("ligne de portefeuille", () => {
  it("formate une période sur un seul jour", () => {
    expect(ligneCockpit(demande(), MAINTENANT).periodeLabel).toBe("16 juin 2026");
  });

  it("formate une période bornée dans le même mois", () => {
    const d = demande({
      lignes: [
        ligne({ date: "2026-06-16", salle: "B22", etudiants: 30 }),
        ligne({ date: "2026-06-18", salle: "B23", etudiants: 30 }),
      ],
    });
    expect(ligneCockpit(d, MAINTENANT).periodeLabel).toBe("16–18 juin 2026");
  });

  it("affiche un tiret sans date", () => {
    expect(ligneCockpit(demande({ lignes: [ligne({ creneau: "Matin" })] }), MAINTENANT).periodeLabel).toBe("—");
  });
});

describe("synthèse du portefeuille", () => {
  it("exclut les demandes archivées et annulées", () => {
    const s = synthesePortefeuille([demande(), demande({ id: "2", statut: "Archivée" }), demande({ id: "3", statut: "Annulée" })], MAINTENANT);
    expect(s.total).toBe(1);
  });

  it("mesure la conversion sur les demandes ayant franchi la validation SPC", () => {
    const s = synthesePortefeuille(
      [demande({ id: "1" }), demande({ id: "2", statut: "Validée SPC" }), demande({ id: "3", statut: "Brouillon" })],
      MAINTENANT,
    );
    expect(s.tauxConversion).toBe(33);
    expect(s.objectifConversion).toBe(60);
  });

  it("ne compte le potentiel HT que sur les demandes prêtes à convertir", () => {
    const validee = demande({
      id: "2",
      statut: "Validée SPC",
      lignes: [ligne({ date: "2026-06-22", salle: "Amphi A", etudiants: 180, surveillants: 6 })],
    });
    const s = synthesePortefeuille([demande(), validee], MAINTENANT);
    expect(s.potentielHT).toBe(5400);
    expect(s.opportuniteEtudiants).toBe(180);
    expect(s.nbEtudiants).toBe(210);
  });

  it("retient l'échéance la plus proche comme demande urgente", () => {
    const proche = demande({ id: "2", lignes: [ligne({ date: "2026-06-15", salle: "B1", etudiants: 10 })] });
    expect(synthesePortefeuille([demande(), proche], MAINTENANT).urgente?.demande.id).toBe("2");
  });

  it("ne calcule aucun délai moyen sans demande traitée", () => {
    expect(synthesePortefeuille([demande({ statut: "Brouillon" })], MAINTENANT).delaiMoyenJours).toBeNull();
  });
});

describe("jeu de démonstration", () => {
  const demo = demandesDemo(MAINTENANT);
  const s = synthesePortefeuille(demo, MAINTENANT);

  it("expose trois dossiers contrastés", () => {
    expect(demo.map((d) => d.statut)).toEqual(["À vérifier", "Validée SPC", "Brouillon"]);
    expect(s.total).toBe(3);
    expect(s.brouillons).toBe(1);
    expect(s.aVerifier).toBe(1);
    expect(s.valides).toBe(1);
    expect(s.converties).toBe(0);
  });

  it("totalise 250 étudiants et 5 400 € HT de potentiel", () => {
    expect(s.nbEtudiants).toBe(250);
    expect(s.potentielHT).toBe(5400);
    expect(s.tauxConversion).toBe(33);
  });

  it("place ICP Paris en urgence à J+2 avec un dossier incomplet", () => {
    const icp = ligneCockpit(demo[0], MAINTENANT);
    expect(icp.urgente).toBe(true);
    expect(icp.echeance?.jours).toBe(2);
    expect(icp.completude.pct).toBe(65);
    expect(icp.action.label).toBe("Vérifier les salles");
    expect(s.urgente?.demande.etablissement).toBe("ICP Paris");
  });

  it("place Dauphine PSL à 100 % de complétude, prête à convertir", () => {
    const dauphine = ligneCockpit(demo[1], MAINTENANT);
    expect(dauphine.completude.pct).toBe(100);
    expect(dauphine.urgente).toBe(false);
    expect(dauphine.action.label).toBe("Convertir en mission");
    expect(s.opportunite?.demande.etablissement).toBe("Dauphine PSL");
  });

  it("laisse ESSEC en brouillon très incomplet et sans période", () => {
    const essec = ligneCockpit(demo[2], MAINTENANT);
    expect(essec.completude.pct).toBeLessThan(25);
    expect(essec.periodeLabel).toBe("—");
    expect(essec.echeance).toBeNull();
  });

  it("affiche un délai moyen de traitement de 2,4 jours", () => {
    expect(s.delaiMoyenJours).toBe(2.4);
  });
});
