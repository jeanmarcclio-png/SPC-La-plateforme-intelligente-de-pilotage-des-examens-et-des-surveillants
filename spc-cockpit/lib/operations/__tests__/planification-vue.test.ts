import { describe, it, expect } from "vitest";
import type { Affectation, Mission, Surveillant } from "../types";
import { mockAffectations, mockMissions, mockSurveillants } from "../mock";
import {
  compteursFiltres, construireVueSession, correspondFiltre, creneauxDe, dureeMinutes,
  equilibrageCharge, filtrerLignes, heuresFR, minutes, minutesAffectation,
  sessionsSelectionnables, sousEffectifsParSalle, totalHeures,
} from "../planification-vue";

const MISSION_REF = 6; // session de référence ICP Paris

function aff(p: Partial<Affectation> & { id: number; missionId: number; surveillantId: number }): Affectation {
  return { statut: "Confirmé", matin: false, apm: false, presence: "En attente", ...p };
}

describe("durées — minutes exactes", () => {
  it("convertit les horaires en minutes", () => {
    expect(minutes("08:30")).toBe(510);
    expect(minutes("00:00")).toBe(0);
    expect(minutes("23:59")).toBe(1439);
    expect(minutes("24:00")).toBeNull();
    expect(minutes("8h30")).toBeNull();
    expect(minutes(undefined)).toBeNull();
  });

  it("refuse une durée nulle ou négative", () => {
    expect(dureeMinutes({ debut: "09:00", fin: "09:00" })).toBe(0);
    expect(dureeMinutes({ debut: "14:00", fin: "08:00" })).toBe(0);
    expect(dureeMinutes({ debut: "09:15", fin: "12:00" })).toBe(165);
  });

  it("somme les minutes exactes, jamais des valeurs arrondies", () => {
    // 2,75 h s'affiche « 2,8 h » : sommer l'affichage donnerait un total faux.
    const a = aff({ id: 1, missionId: 1, surveillantId: 1, matin: true, matinDebut: "09:15", matinFin: "12:00" });
    const b = aff({ id: 2, missionId: 1, surveillantId: 2, matin: true, matinDebut: "09:15", matinFin: "12:00" });
    expect(heuresFR(minutesAffectation(a) / 60)).toBe("2,8 h");
    expect(totalHeures([a, b])).toBe(5.5); // et non 5,6 h
  });

  it("cumule plusieurs créneaux par demi-journée", () => {
    const a = aff({
      id: 1, missionId: 1, surveillantId: 9,
      matinCreneaux: [{ debut: "08:00", fin: "09:45" }, { debut: "10:00", fin: "13:00" }],
      apmCreneaux: [{ debut: "13:30", fin: "18:00" }],
    });
    expect(minutesAffectation(a)).toBe(105 + 180 + 270);
    expect(minutesAffectation(a) / 60).toBe(9.25);
  });

  it("retombe sur le créneau unique quand la liste est absente", () => {
    const a = aff({ id: 1, missionId: 1, surveillantId: 1, apm: true, apmDebut: "13:00", apmFin: "19:00" });
    expect(creneauxDe(a, "matin")).toEqual([]);
    expect(creneauxDe(a, "apres-midi")).toEqual([{ debut: "13:00", fin: "19:00" }]);
    expect(minutesAffectation(a)).toBe(360);
  });
});

describe("session de référence ICP Paris", () => {
  const mission = mockMissions.find((m) => m.id === MISSION_REF)!;
  const vue = construireVueSession({
    mission, missions: mockMissions, affectations: mockAffectations, surveillants: mockSurveillants,
  });

  it("totalise exactement 66,25 h", () => {
    expect(vue.heuresTotal).toBe(66.25);
    expect(heuresFR(vue.heuresTotal, 2)).toBe("66,25 h");
  });

  it("couvre 10 surveillants sur 14 requis, soit 71 %", () => {
    expect(vue.couverture.affectes).toBe(10);
    expect(vue.couverture.requis).toBe(14);
    expect(vue.couverture.manque).toBe(4);
    expect(Math.round(vue.couverture.tauxCouverture * 100)).toBe(71);
  });

  it("conserve les indicateurs financiers de référence", () => {
    expect(vue.rentabilite.caHT).toBe(4042);
    expect(Math.round(vue.rentabilite.tauxMarge * 100)).toBe(69);
    expect(vue.rentabilite.margeHT).toBe(Math.round((vue.rentabilite.caHT - vue.rentabilite.coutHT) * 100) / 100);
  });

  it("affiche une moyenne par surveillant cohérente avec le total", () => {
    expect(vue.heuresMoyenne).toBeCloseTo(66.25 / 10, 6);
    expect(heuresFR(vue.heuresMoyenne, 2)).toBe("6,63 h");
  });

  it("les compteurs de filtres correspondent aux lignes réelles", () => {
    expect(vue.compteurs.tous).toBe(vue.lignes.length);
    expect(vue.compteurs.alertes).toBe(vue.lignes.filter((l) => l.alertes.length > 0).length);
    expect(vue.compteurs["sans-salle"]).toBe(vue.lignes.filter((l) => !l.salle).length);
  });

  it("le nombre de salles et de créneaux dérive des affectations", () => {
    expect(vue.nbSalles).toBe(new Set(vue.lignes.map((l) => l.salle).filter(Boolean)).size);
    expect(vue.nbCreneaux).toBe(vue.lignes.reduce((n, l) => n + l.matin.length + l.apm.length, 0));
  });
});

describe("alertes de ligne", () => {
  const mission: Mission = { id: 99, reference: "EX-T", client: "Test", type: "Examen écrit", nbSalles: 2, nbSurveillants: 4, montantHT: 1000, statut: "Planifiée", dateMission: "2026-07-08" };
  const surveillants: Surveillant[] = [1, 2, 3, 4].map((id) => ({ id, nom: `S${id}`, role: "Surveillant salle", statut: "Disponible", nbExamens: 0, heures: 0, note: 4, tauxHoraire: 20 }));

  function vueAvec(affs: Affectation[]) {
    return construireVueSession({ mission, missions: [mission], affectations: affs, surveillants });
  }

  it("signale une affectation sans créneau", () => {
    const v = vueAvec([aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A" })]);
    expect(v.lignes[0].alertes.map((a) => a.code)).toContain("sans-creneau");
  });

  it("signale une salle manquante", () => {
    const v = vueAvec([aff({ id: 1, missionId: 99, surveillantId: 1, matin: true, matinDebut: "08:00", matinFin: "12:00" })]);
    expect(v.lignes[0].alertes.map((a) => a.code)).toContain("sans-salle");
  });

  it("signale des créneaux qui se chevauchent", () => {
    const v = vueAvec([aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A", matinCreneaux: [{ debut: "08:00", fin: "11:00" }, { debut: "10:30", fin: "12:00" }] })]);
    expect(v.lignes[0].alertes.map((a) => a.code)).toContain("chevauchement");
  });

  it("signale une charge supérieure au seuil quotidien", () => {
    const v = vueAvec([aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "13:00", apm: true, apmDebut: "13:30", apmFin: "18:00" })]);
    const surcharge = v.lignes[0].alertes.find((a) => a.code === "surcharge");
    expect(surcharge?.niveau).toBe("avertissement");
    expect(surcharge?.texte).toContain("9,50 h");
  });

  it("aucune alerte sur une ligne saine", () => {
    const v = vueAvec([aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" })]);
    expect(v.lignes[0].alertes).toEqual([]);
  });

  it("détecte une double affectation le même jour sur deux missions", () => {
    const autre: Mission = { ...mission, id: 100, reference: "EX-U" };
    const affs = [
      aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
      aff({ id: 2, missionId: 100, surveillantId: 1, salle: "B", matin: true, matinDebut: "09:00", matinFin: "11:00" }),
    ];
    const v = construireVueSession({ mission, missions: [mission, autre], affectations: affs, surveillants });
    expect(v.lignes[0].alertes.map((a) => a.code)).toContain("double-affectation");
  });
});

describe("filtres de la page Planning", () => {
  const mission: Mission = { id: 99, reference: "EX-T", client: "T", type: "Examen écrit", nbSalles: 2, nbSurveillants: 3, montantHT: 900, statut: "Planifiée", dateMission: "2026-07-08" };
  const surveillants: Surveillant[] = [
    { id: 1, nom: "Alice Martin", role: "Coordinatrice", statut: "Disponible", nbExamens: 0, heures: 0, note: 5, tauxHoraire: 22 },
    { id: 2, nom: "Bob Durand", role: "Surveillant salle", statut: "Disponible", nbExamens: 0, heures: 0, note: 4, tauxHoraire: 18 },
    { id: 3, nom: "Chloé Petit", role: "Surveillant volant", statut: "Disponible", nbExamens: 0, heures: 0, note: 4, tauxHoraire: 18 },
  ];
  const affs = [
    aff({ id: 1, missionId: 99, surveillantId: 1, salle: "A21", matin: true, matinDebut: "08:00", matinFin: "12:00" }),
    aff({ id: 2, missionId: 99, surveillantId: 2, salle: "A22", apm: true, apmDebut: "13:00", apmFin: "17:00" }),
    aff({ id: 3, missionId: 99, surveillantId: 3 }), // sans salle ni créneau
  ];
  const vue = construireVueSession({ mission, missions: [mission], affectations: affs, surveillants });

  it("compte chaque catégorie", () => {
    const c = compteursFiltres(vue.lignes);
    expect(c.tous).toBe(3);
    expect(c.matin).toBe(1);
    expect(c.apm).toBe(1);
    expect(c.coordination).toBe(1);
    expect(c.volant).toBe(1);
    expect(c["sans-salle"]).toBe(1);
    expect(c.alertes).toBe(1);
  });

  it("filtre et recherche se combinent", () => {
    expect(filtrerLignes(vue.lignes, "matin").map((l) => l.id)).toEqual([1]);
    expect(filtrerLignes(vue.lignes, "tous", "bob").map((l) => l.id)).toEqual([2]);
    expect(filtrerLignes(vue.lignes, "matin", "bob")).toEqual([]);
    expect(filtrerLignes(vue.lignes, "tous", "a2").map((l) => l.id)).toEqual([1, 2]);
  });

  it("« Tous » ne retire rien", () => {
    expect(vue.lignes.every((l) => correspondFiltre(l, "tous"))).toBe(true);
  });
});

describe("contrôle : sous-effectifs et équilibrage", () => {
  it("repère une salle moins couverte l'après-midi que le matin", () => {
    const lignes = [
      { id: 1, surveillantId: 1, nom: "A", role: "salle", salle: "B21", matin: [{ debut: "08:00", fin: "12:00" }], apm: [], minutes: 240, heures: 4, alertes: [] },
      { id: 2, surveillantId: 2, nom: "B", role: "salle", salle: "B21", matin: [{ debut: "08:00", fin: "12:00" }], apm: [{ debut: "13:00", fin: "17:00" }], minutes: 480, heures: 8, alertes: [] },
    ];
    const se = sousEffectifsParSalle(lignes);
    expect(se).toHaveLength(1);
    expect(se[0]).toMatchObject({ salle: "B21", periode: "apres-midi", presents: 1, reference: 2, manque: 1 });
  });

  it("ne signale rien quand les deux demi-journées sont équilibrées", () => {
    const lignes = [
      { id: 1, surveillantId: 1, nom: "A", role: "salle", salle: "C1", matin: [{ debut: "08:00", fin: "12:00" }], apm: [{ debut: "13:00", fin: "17:00" }], minutes: 480, heures: 8, alertes: [] },
    ];
    expect(sousEffectifsParSalle(lignes)).toEqual([]);
  });

  it("mesure l'écart de charge et ce qu'il faut transférer", () => {
    const lignes = [
      { id: 1, surveillantId: 1, nom: "Chargé", role: "salle", salle: "A", matin: [], apm: [], minutes: 570, heures: 9.5, alertes: [] },
      { id: 2, surveillantId: 2, nom: "Léger", role: "salle", salle: "B", matin: [], apm: [], minutes: 174, heures: 2.9, alertes: [] },
    ];
    const e = equilibrageCharge(lignes);
    expect(e.ecartMax).toBeCloseTo(6.6, 5);
    expect(e.cible).toBe(2);
    expect(e.plusCharge?.nom).toBe("Chargé");
    expect(e.moinsCharge?.nom).toBe("Léger");
    expect(e.aRepartir).toBeCloseTo(2.3, 5);
  });

  it("aucun écart avec moins de deux lignes actives", () => {
    expect(equilibrageCharge([]).ecartMax).toBe(0);
  });
});

describe("suggestions du copilote", () => {
  const mission = mockMissions.find((m) => m.id === MISSION_REF)!;
  const vue = construireVueSession({
    mission, missions: mockMissions, affectations: mockAffectations, surveillants: mockSurveillants,
  });

  it("propose de mobiliser exactement le nombre de surveillants manquants", () => {
    const s = vue.suggestions.find((x) => x.id === "mobiliser");
    expect(s?.titre).toContain(String(vue.couverture.manque));
    expect(s?.priorite).toBe("haute");
  });

  it("chiffre un gain de marge cohérent avec la marge après optimisation", () => {
    const marge = vue.suggestions.find((x) => x.id === "marge");
    if (marge?.gainEuros) {
      expect(vue.tauxMargeApres).toBeGreaterThanOrEqual(vue.rentabilite.tauxMarge);
      expect(vue.tauxMargeApres).toBeLessThanOrEqual(1);
    }
  });

  it("ne propose rien à mobiliser quand la couverture est complète", () => {
    const complete: Mission = { ...mission, id: 500, nbSurveillants: 1 };
    const affs = [aff({ id: 1, missionId: 500, surveillantId: 1, salle: "A", matin: true, matinDebut: "08:00", matinFin: "12:00" })];
    const v = construireVueSession({ mission: complete, missions: [complete], affectations: affs, surveillants: mockSurveillants });
    expect(v.couverture.manque).toBe(0);
    expect(v.suggestions.find((s) => s.id === "mobiliser")).toBeUndefined();
  });
});

describe("sélecteur de sessions", () => {
  it("place la session engagée en tête et exclut les annulées", () => {
    const list: Mission[] = [
      { id: 1, reference: "A", client: "A", type: "t", nbSalles: 1, nbSurveillants: 1, montantHT: 0, statut: "Terminée", dateMission: "2026-01-01" },
      { id: 2, reference: "B", client: "B", type: "t", nbSalles: 1, nbSurveillants: 1, montantHT: 0, statut: "Annulée", dateMission: "2026-02-01" },
      { id: 3, reference: "C", client: "C", type: "t", nbSalles: 1, nbSurveillants: 1, montantHT: 0, statut: "En cours", dateMission: "2026-03-01" },
      { id: 4, reference: "D", client: "D", type: "t", nbSalles: 1, nbSurveillants: 1, montantHT: 0, statut: "Planifiée", dateMission: "2026-04-01" },
    ];
    const s = sessionsSelectionnables(list);
    expect(s.map((m) => m.id)).toEqual([3, 4, 1]);
  });
});
