// Non-régression du chantier 4 — corrige BUG-004 (intégrité référentielle).
//
// Les données de ce fichier reproduisent EXACTEMENT le relevé de l'audit :
//   référentiel : A21, A22, E31, Grand Amphithéâtre, B11
//   planning    : A21, C14, E31, AMP, A22, F11, F12, E32
// L'audit comptait 5 salles fantômes et 1 orpheline ; le test l'exige.

import { describe, it, expect } from "vitest";
import {
  normaliserNomSalle, rapprocherSalles, usageSalle, messageIncoherence,
} from "../referentiel-salles";
import type { Affectation, Salle } from "../types";

function salle(id: number, nom: string): Salle {
  return { id, nom, capacite: 30, etudiants: 20, nbSurveillants: 2, pmr: false, tiersTemps: false };
}
function aff(id: number, nomSalle: string | undefined): Affectation {
  return {
    id, missionId: 1, surveillantId: id, statut: "Confirmée", salle: nomSalle,
    matin: true, matinDebut: "08:30", matinFin: "12:30", apm: false, presence: "En attente",
  };
}

const referentiel: Salle[] = [
  salle(1, "Salle A21"), salle(2, "Salle A22"), salle(3, "Salle E31"),
  salle(4, "Grand Amphithéâtre"), salle(5, "Salle B11"),
];
const planning: Affectation[] = [
  aff(1, "A21"), aff(2, "C14"), aff(3, "E31"), aff(4, "AMP"),
  aff(5, "A22"), aff(6, "F11"), aff(7, "F12"), aff(8, "E32"),
];

describe("normaliserNomSalle", () => {
  it("neutralise la casse, le préfixe « Salle », la ponctuation et les accents", () => {
    expect(normaliserNomSalle("Salle A21")).toBe("a21");
    expect(normaliserNomSalle("salle a-21")).toBe("a21");
    expect(normaliserNomSalle("A21")).toBe("a21");
    expect(normaliserNomSalle("  SALLES   A21 ")).toBe("a21");
    expect(normaliserNomSalle("Amphithéâtre")).toBe("amphitheatre");
  });

  it("ne devine PAS les alias métier — « AMP » n'est pas « Grand Amphithéâtre »", () => {
    // Les rapprocher automatiquement fabriquerait une correspondance fausse :
    // ce sont peut-être deux salles distinctes. L'arbitrage revient à un humain.
    expect(normaliserNomSalle("AMP")).not.toBe(normaliserNomSalle("Grand Amphithéâtre"));
  });

  it("retourne une chaîne vide pour une salle absente", () => {
    expect(normaliserNomSalle(undefined)).toBe("");
    expect(normaliserNomSalle("   ")).toBe("");
  });
});

describe("BUG-004 — le rapprochement rend l'invariant INV-004 vérifiable", () => {
  it("retrouve les 5 salles fantômes relevées par l'audit", () => {
    const r = rapprocherSalles(referentiel, planning);
    expect(r.fantomes.map((f) => f.nom).sort()).toEqual(["AMP", "C14", "E32", "F11", "F12"]);
  });

  it("retrouve la salle orpheline B11 — et signale « Grand Amphithéâtre » avec elle", () => {
    const r = rapprocherSalles(referentiel, planning);
    // L'audit ne comptait qu'UNE orpheline (B11) parce qu'un lecteur humain lit
    // « AMP » comme « Grand Amphithéâtre ». La machine ne fait pas ce
    // rapprochement, volontairement : ce sont peut-être deux salles distinctes.
    // Elle en signale donc deux, ce qui est le comportement voulu — un écart
    // signalé à tort se corrige d'un clic, un alias deviné à tort fausse les
    // capacités, le PMR et le tiers-temps sans que personne le voie.
    expect(r.orphelines.map((s) => s.nom).sort()).toEqual(["Grand Amphithéâtre", "Salle B11"]);
    expect(r.fantomes.map((f) => f.nom)).toContain("AMP");
  });

  it("rapproche malgré le préfixe « Salle » du référentiel", () => {
    const r = rapprocherSalles(referentiel, planning);
    expect(r.utilisees.map((s) => s.nom).sort()).toEqual(["Salle A21", "Salle A22", "Salle E31"]);
  });

  it("déclare l'incohérence dès qu'une salle fantôme existe", () => {
    expect(rapprocherSalles(referentiel, planning).incoherent).toBe(true);
  });

  it("ne déclare AUCUNE incohérence sur un planning propre", () => {
    const r = rapprocherSalles([salle(1, "A21")], [aff(1, "Salle A21")]);
    expect(r.incoherent).toBe(false);
    expect(r.fantomes).toEqual([]);
    expect(messageIncoherence(r)).toBeNull();
  });

  it("compte les affectations planifiées sans aucune salle", () => {
    const r = rapprocherSalles([salle(1, "A21")], [aff(1, "A21"), aff(2, undefined), aff(3, "  ")]);
    expect(r.sansSalle).toBe(2);
    expect(r.incoherent).toBe(true);
  });

  it("agrège plusieurs affectations sur la même salle fantôme", () => {
    const r = rapprocherSalles([], [aff(1, "C14"), aff(2, "C14"), aff(3, "F11")]);
    expect(r.fantomes[0]).toEqual({ nom: "C14", affectations: 2 });
  });

  it("le message d'incohérence nomme les salles et dit quoi faire", () => {
    const m = messageIncoherence(rapprocherSalles(referentiel, planning))!;
    expect(m).toContain("C14");
    expect(m).toContain("référentiel");
    expect(m).toMatch(/Créez ces salles|corrigez le planning/);
  });
});

describe("usageSalle — fonde le refus de suppression", () => {
  it("compte les affectations qui référencent la salle, préfixe compris", () => {
    expect(usageSalle(salle(1, "Salle A21"), planning)).toBe(1);
    expect(usageSalle(salle(5, "Salle B11"), planning)).toBe(0);
  });

  it("une salle orpheline est supprimable, une salle utilisée ne l'est pas", () => {
    // INV-004 : « une salle supprimée ne doit plus apparaître au planning ».
    // Tant que l'usage est > 0, la supprimer laisserait le planning pointer
    // vers une salle inexistante — la situation exacte relevée par l'audit.
    expect(usageSalle(salle(5, "Salle B11"), planning)).toBe(0);
    expect(usageSalle(salle(3, "Salle E31"), planning)).toBeGreaterThan(0);
  });
});
