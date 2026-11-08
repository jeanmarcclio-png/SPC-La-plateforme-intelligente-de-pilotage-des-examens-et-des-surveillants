import { describe, expect, it } from "vitest";
import { appliquerTotauxDevis } from "../devis-totaux";
import {
  calculateDevisBaseBruteCents,
  calculateDevisTotauxComplets,
  calculateEquipeLigneEuros,
  calculateEquipeTotalEuros,
  calculatePlageHoraire,
} from "../engine";
import type { Devis, DevisEquipe, DevisLigne } from "../types";

function devis(p: Partial<Devis> = {}): Devis {
  return {
    id: 1,
    reference: "D1",
    client: "Client test",
    statut: "Brouillon",
    montantHT: 1000,
    montantTTC: 0,
    nbSurveillants: 0,
    coefficient: 1,
    fraisDeplacement: 0,
    fraisCoordination: 0,
    remise: 0,
    ...p,
  } as Devis;
}

describe("base brute d'un devis (équipe > lignes > montant saisi)", () => {
  it("l'équipe prime sur les lignes : 2 × 3 h × 20 € = 120,00 €", () => {
    const cents = calculateDevisBaseBruteCents({
      montantHTBase: 999,
      lignes: [{ quantite: 5, prixUnitaire: 10 }],
      equipe: [{ effectif: 2, heuresPers: 3, tauxH: 20 }],
    });
    expect(cents).toBe(12000);
  });

  it("à défaut d'équipe, les lignes : 3 × 33,33 € = 99,99 € (arrondi au centime)", () => {
    const cents = calculateDevisBaseBruteCents({
      montantHTBase: 0,
      lignes: [{ quantite: 3, prixUnitaire: 33.33 }],
      equipe: [],
    });
    expect(cents).toBe(9999);
  });

  it("à défaut de détail, le montant saisi", () => {
    expect(calculateDevisBaseBruteCents({ montantHTBase: 1000, lignes: [], equipe: [] })).toBe(100000);
  });
});

describe("totaux complets : coefficient, frais, remise, TVA", () => {
  it("coefficient, frais et remise appliqués une seule fois", () => {
    const t = calculateDevisTotauxComplets({
      montantHTBase: 1000,
      coefficient: 1.2,
      fraisDeplacement: 50,
      remise: 100,
    });
    expect(t.baseAjustee).toBe(1200);
    expect(t.ht).toBe(1150);
    expect(t.tva).toBe(230);
    expect(t.ttc).toBe(1380);
  });

  it("référence ICP Reims : 7 344,40 € HT → TVA 1 468,88 € → TTC 8 813,28 €", () => {
    const t = calculateDevisTotauxComplets({ montantHTBase: 7344.4 });
    expect(t.ht).toBe(7344.4);
    expect(t.tva).toBe(1468.88);
    expect(t.ttc).toBe(8813.28);
  });
});

describe("appliquerTotauxDevis : une seule source pour liste, KPI et fiche", () => {
  it("recalcule le TTC même si la valeur stockée est fausse", () => {
    const r = appliquerTotauxDevis(devis({ montantHT: 1000, montantTTC: 99999 }), [], []);
    expect(r.montantTTC).toBe(1200);
    expect(r.montantHT).toBe(1000);
    expect(r.montantHTBase).toBe(1000);
  });

  it("garde la base saisie à part : le coefficient n'est pas appliqué deux fois", () => {
    const r = appliquerTotauxDevis(
      devis({ montantHT: 1000, coefficient: 1.2, fraisDeplacement: 50, remise: 100 }),
      [],
      [],
    );
    expect(r.montantHTBase).toBe(1000);
    expect(r.montantHT).toBe(1150);
  });

  it("ne prend que les lignes et l'équipe du devis concerné", () => {
    const lignes = [
      { id: 1, devisId: 1, designation: "A", quantite: 1, unite: "forfait", prixUnitaire: 500, ordre: 1 },
      { id: 2, devisId: 2, designation: "B", quantite: 1, unite: "forfait", prixUnitaire: 9999, ordre: 1 },
    ] as DevisLigne[];
    const r = appliquerTotauxDevis(devis({ montantHT: 1000 }), lignes, []);
    expect(r.montantHT).toBe(500);
  });
});

describe("plage horaire et équipe", () => {
  it("plage du premier début au dernier fin", () => {
    const p = calculatePlageHoraire([
      { debut: "08:30", fin: "11:30" },
      { debut: "13:30", fin: "16:00" },
    ]);
    expect(p).toEqual({ debutMinutes: 510, finMinutes: 960, heures: 7.5 });
  });

  it("ignore les horaires invalides", () => {
    const p = calculatePlageHoraire([
      { debut: "xx", fin: "11:30" },
      { debut: "09:00", fin: "10:00" },
    ]);
    expect(p?.debutMinutes).toBe(540);
    expect(p?.finMinutes).toBe(690);
  });

  it("null sans horaire exploitable ou si fin ≤ début", () => {
    expect(calculatePlageHoraire([{ debut: null, fin: null }])).toBeNull();
    expect(calculatePlageHoraire([{ debut: "12:00", fin: "11:00" }])).toBeNull();
  });

  it("total d'équipe : 2 × 3 h × 20 € + 1 × 4 h × 25 € = 220 €", () => {
    const equipe = [
      { effectif: 2, heuresPers: 3, tauxH: 20 },
      { effectif: 1, heuresPers: 4, tauxH: 25 },
    ] as DevisEquipe[];
    expect(calculateEquipeTotalEuros(equipe)).toBe(220);
    expect(calculateEquipeLigneEuros(equipe[0])).toBe(120);
  });
});
