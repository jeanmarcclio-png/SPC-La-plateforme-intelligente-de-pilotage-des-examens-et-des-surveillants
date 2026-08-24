// Non-régression BUG-016 — « le devis ne réconcilie pas sa grille de salles
// avec ses heures facturées ».
//
// Les données reproduisent EXACTEMENT le devis SPC-20260728-001 (ICP Reims)
// relevé par l'audit : grille de 4 salles le matin et 2 l'après-midi, équipe
// chiffrée à 5 × 23,64 h + 5 × 28,82 h, 10 jours retenus.

import { describe, it, expect } from "vitest";
import {
  heuresGrilleParJour, heuresFactureesDevis, tauxHoraireMoyenDevis,
  reconcilierDevis, effectifsDevis, sallesVersMoteur,
} from "../devis-reconciliation";
import type { Devis, DevisEquipe, DevisLigne, DevisSalle } from "../types";

const SALLES: DevisSalle[] = [
  { id: 1, devisId: 4, session: "matin", salle: "B22", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "12:15", ordre: 1 },
  { id: 2, devisId: 4, session: "matin", salle: "B23", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "12:15", ordre: 2 },
  { id: 3, devisId: 4, session: "matin", salle: "B11 Tiers-temps", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: true, debut: "08:30", fin: "13:15", ordre: 3 },
  { id: 4, devisId: 4, session: "matin", salle: "B21 Isolé", etudiants: 1, surveillants: 1, pmr: false, tiersTemps: false, debut: "08:30", fin: "13:15", ordre: 4 },
  { id: 5, devisId: 4, session: "apres-midi", salle: "B22", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: false, debut: "13:30", fin: "16:15", ordre: 1 },
  { id: 6, devisId: 4, session: "apres-midi", salle: "B11 Tiers-temps", etudiants: 30, surveillants: 1, pmr: false, tiersTemps: true, debut: "13:30", fin: "17:05", ordre: 2 },
];

const EQUIPE: DevisEquipe[] = [
  { id: 1, devisId: 4, role: "Surveillant·e — semaine du 15 au 19 juin", effectif: 5, heuresPers: 23.64, tauxH: 28, ordre: 1 },
  { id: 4, devisId: 4, role: "Surveillant·e — semaine du 22 au 26 juin", effectif: 5, heuresPers: 28.82, tauxH: 28, ordre: 2 },
];

const LIGNES: DevisLigne[] = [
  { id: 1, devisId: 4, designation: "Semaine du 15 au 19 juin", quantite: 118.2, unite: "h", prixUnitaire: 28, ordre: 1 },
  { id: 2, devisId: 4, designation: "Semaine du 22 au 26 juin", quantite: 144.1, unite: "h", prixUnitaire: 28, ordre: 2 },
];

const DEVIS: Devis = {
  id: 4, reference: "SPC-20260728-001", client: "ICP Reims", statut: "Accepté",
  montantHT: 7344.4, montantTTC: 8813.28, nbSurveillants: 6,
  coefficient: 1, fraisDeplacement: 0, fraisCoordination: 0, remise: 0,
};

describe("heures facturables de la grille — via le moteur central", () => {
  it("retrouve les 23,33 h/jour recalculés par l'audit", () => {
    // matin  : 3,75 + 3,75 + 4,75 + 4,75 = 17,00 h
    // après-midi : 2,75 + 3,583… = 6,333… h
    expect(heuresGrilleParJour(SALLES)).toBeCloseTo(23.333, 2);
  });

  it("multiplie bien la durée par le nombre de surveillants de la salle", () => {
    const double = SALLES.map((s) => (s.id === 1 ? { ...s, surveillants: 2 } : s));
    // B22 matin passe de 3,75 h à 7,50 h → +3,75 h sur le total.
    expect(heuresGrilleParJour(double)).toBeCloseTo(23.333 + 3.75, 2);
  });

  it("ignore une salle sans horaires au lieu d'inventer une durée", () => {
    const bancal = [...SALLES, {
      id: 9, devisId: 4, session: "matin" as const, salle: "B99", etudiants: 10,
      surveillants: 1, pmr: false, tiersTemps: false, ordre: 9,
    }];
    expect(heuresGrilleParJour(bancal)).toBeCloseTo(23.333, 2);
  });

  it("traduit matin / après-midi vers les périodes du moteur", () => {
    const rooms = sallesVersMoteur(SALLES);
    expect(rooms.filter((r) => r.period === "morning")).toHaveLength(4);
    expect(rooms.filter((r) => r.period === "afternoon")).toHaveLength(2);
  });
});

describe("BUG-016 — l'écart entre la grille et les heures facturées est affiché", () => {
  const r = reconcilierDevis({ salles: SALLES, equipe: EQUIPE, lignes: LIGNES, joursRetenus: 10 });

  it("retrouve le relevé de l'audit : 233,33 h projetées contre 262,30 h facturées", () => {
    expect(r.heuresGrilleProjetees).toBeCloseTo(233.33, 1);
    expect(r.heuresFacturees).toBeCloseTo(262.3, 2);
  });

  it("chiffre l'écart en heures ET en euros", () => {
    expect(r.statut).toBe("ecart");
    expect(r.ecartHeures).toBeCloseTo(28.97, 1);
    // 28,97 h × 28 €/h ≈ 811 € HT — le montant relevé par l'audit.
    expect(Math.abs(r.ecartMontantHT!)).toBeGreaterThan(800);
    expect(Math.abs(r.ecartMontantHT!)).toBeLessThan(820);
  });

  it("dit ce qui a été comparé et ce qu'il faut faire", () => {
    expect(r.message).toContain("journée");
    expect(r.message).toContain("10 jours retenus");
    expect(r.message).toMatch(/journée type|corrigez/);
  });

  it("le taux horaire moyen est PONDÉRÉ par les heures", () => {
    // Les deux lignes sont à 28 €/h : la moyenne pondérée vaut 28, pas autre chose.
    expect(tauxHoraireMoyenDevis(EQUIPE, LIGNES)).toBeCloseTo(28, 2);
    const melange: DevisEquipe[] = [
      { ...EQUIPE[0], effectif: 1, heuresPers: 100, tauxH: 30 },
      { ...EQUIPE[1], effectif: 1, heuresPers: 10, tauxH: 10 },
    ];
    // Moyenne de taux = 20 ; moyenne pondérée = (100×30 + 10×10) / 110 ≈ 28,18.
    expect(tauxHoraireMoyenDevis(melange, [])).toBeCloseTo(28.18, 1);
  });

  it("ne crie pas au loup pour un écart d'arrondi", () => {
    const equipeAlignee: DevisEquipe[] = [
      { id: 1, devisId: 4, role: "x", effectif: 1, heuresPers: 233.4, tauxH: 28, ordre: 1 },
    ];
    const ok = reconcilierDevis({ salles: SALLES, equipe: equipeAlignee, lignes: [], joursRetenus: 10 });
    expect(ok.statut).toBe("aligne");
    expect(ok.message).toBeNull();
  });

  it("refuse de comparer plutôt que d'inventer, quand une donnée manque", () => {
    const sansJours = reconcilierDevis({ salles: SALLES, equipe: EQUIPE, lignes: LIGNES, joursRetenus: null });
    expect(sansJours.statut).toBe("non-comparable");
    expect(sansJours.ecartHeures).toBeNull();
  });

  it("signale une facturation sans aucune grille exploitable", () => {
    const sansGrille = reconcilierDevis({ salles: [], equipe: EQUIPE, lignes: LIGNES, joursRetenus: 10 });
    expect(sansGrille.statut).toBe("non-comparable");
    expect(sansGrille.message).toContain("Aucune grille");
  });

  it("retombe sur les lignes en « h » quand l'équipe n'est pas chiffrée", () => {
    expect(heuresFactureesDevis([], LIGNES)).toBeCloseTo(262.3, 2);
    // Une ligne au forfait n'est pas un volume horaire.
    const forfait: DevisLigne[] = [{ id: 3, devisId: 4, designation: "Coordination", quantite: 1, unite: "forfait", prixUnitaire: 500, ordre: 3 }];
    expect(heuresFactureesDevis([], [...LIGNES, ...forfait])).toBeCloseTo(262.3, 2);
  });
});

describe("BUG-016 (second constat) — trois effectifs, trois périmètres", () => {
  const e = effectifsDevis({ devis: DEVIS, equipe: EQUIPE, salles: SALLES });

  it("retrouve les trois nombres relevés : 6, 10 et 4", () => {
    expect(e.annonce.valeur).toBe(6);
    expect(e.equipeTotale.valeur).toBe(10);
    expect(e.simultaneMax.valeur).toBe(4);
  });

  it("nomme le périmètre de chacun — leur différence n'est pas la faute", () => {
    expect(e.equipeTotale.perimetre).toContain("toute la prestation");
    expect(e.simultaneMax.perimetre).toContain("simultanément");
  });

  it("signale que l'effectif ANNONCÉ ne correspond à aucun des deux", () => {
    // C'est le nombre qui figure sur le document contractuel.
    expect(e.annonceIncoherent).toBe(true);
    expect(e.message).toContain("6");
    expect(e.message).toContain("avant l'envoi au client");
  });

  it("ne signale rien quand l'annonce s'aligne sur un périmètre existant", () => {
    const aligne = effectifsDevis({ devis: { ...DEVIS, nbSurveillants: 10 }, equipe: EQUIPE, salles: SALLES });
    expect(aligne.annonceIncoherent).toBe(false);
    expect(aligne.message).toBeNull();

    const surSimultane = effectifsDevis({ devis: { ...DEVIS, nbSurveillants: 4 }, equipe: EQUIPE, salles: SALLES });
    expect(surSimultane.annonceIncoherent).toBe(false);
  });

  it("ne crie pas sur un devis sans équipe ni grille — il manque de l'information, pas de la cohérence", () => {
    const nu = effectifsDevis({ devis: DEVIS, equipe: [], salles: [] });
    expect(nu.annonceIncoherent).toBe(false);
    expect(nu.message).toBeNull();
  });
});
