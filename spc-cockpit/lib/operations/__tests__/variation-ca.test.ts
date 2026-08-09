// Non-régression BUG-007 — « le −56,2 % n'est pas la variation du CA affiché ».
//
// Deux défauts étaient superposés :
//   1. la valeur affichée (portefeuille de devis acceptés) et le delta (CA
//      réalisé des missions) venaient de séries différentes ;
//   2. la comparaison opposait un mois PARTIEL à un mois COMPLET, ce qui la
//      rend structurellement négative en début de mois.
//
// Ce fichier verrouille le point 2 ; le point 1 est verrouillé dans
// `dashboard.test.ts` (la variation porte son propre libellé et ne décrit plus
// `caConfirmeHT`).

import { describe, it, expect } from "vitest";
import { variationCAMensuelle } from "../stats";
import type { Mission } from "../types";

function mission(id: number, dateMission: string, montantHT: number, statut: Mission["statut"] = "Terminée"): Mission {
  return {
    id, reference: `EX-${id}`, client: "ICP", dateMission, type: "Examen",
    nbSalles: 1, nbSurveillants: 1, montantHT, statut,
  };
}

describe("BUG-007 — comparaison à période équivalente", () => {
  it("ne compare PAS un début de mois à un mois complet", () => {
    // Juillet : 1 000 € le 2, puis 9 000 € le 20 — soit 10 000 € sur le mois.
    // Août : 1 100 € le 2. Au 9 août, l'activité est en HAUSSE sur la période
    // comparable (1 100 vs 1 000), alors que la comparaison mois partiel contre
    // mois complet donnait −89 %.
    const missions = [
      mission(1, "2026-07-02", 1000),
      mission(2, "2026-07-20", 9000),
      mission(3, "2026-08-02", 1100),
    ];
    const v = variationCAMensuelle(missions, new Date("2026-08-09T12:00:00"))!;
    expect(v.precedent).toBe(1000); // 1–9 juillet, pas juillet entier
    expect(v.courant).toBe(1100);
    expect(v.pourcentage).toBeCloseTo(10, 1);
    expect(v.periodePartielle).toBe(true);
  });

  it("reproduit le relevé de l'audit et le corrige", () => {
    // L'audit relevait juillet 13 986,40 € → août 6 125,00 € = −56,2 %, calculé
    // sur juillet ENTIER. À période équivalente (1–8), le verdict change.
    const missions = [
      mission(1, "2026-07-03", 2600),
      mission(2, "2026-07-10", 3672.2),
      mission(3, "2026-07-16", 3672.2),
      mission(4, "2026-07-30", 4042),
      mission(5, "2026-08-01", 6125),
    ];
    const v = variationCAMensuelle(missions, new Date("2026-08-08T13:48:00"))!;
    expect(v.precedent).toBeCloseTo(2600, 2); // seule la session du 3 juillet
    expect(v.courant).toBeCloseTo(6125, 2);
    expect(v.pourcentage).toBeGreaterThan(0); // hausse, et non « −56,2 % »
  });

  it("écrit la période comparée en toutes lettres", () => {
    const missions = [mission(1, "2026-07-02", 1000), mission(2, "2026-08-02", 1100)];
    const v = variationCAMensuelle(missions, new Date("2026-08-09T12:00:00"))!;
    expect(v.libelle).toBe("CA réalisé · 1–9 août vs 1–9 juillet");
  });

  it("ne tronque plus une fois le mois terminé", () => {
    const missions = [mission(1, "2026-07-02", 1000), mission(2, "2026-08-20", 1100)];
    const v = variationCAMensuelle(missions, new Date("2026-08-31T23:00:00"))!;
    expect(v.periodePartielle).toBe(false);
    expect(v.libelle).toBe("CA réalisé · août vs juillet");
  });

  it("ne déborde pas sur le mois suivant quand le mois de référence est plus court", () => {
    // Au 31 mars, le mois de référence (février) s'arrête au 28 : la session du
    // 1er mars ne doit JAMAIS être comptée dans la référence de février.
    const missions = [
      mission(1, "2026-02-10", 500),
      mission(2, "2026-03-01", 9999),
      mission(3, "2026-03-15", 700),
    ];
    const v = variationCAMensuelle(missions, new Date("2026-03-31T12:00:00"))!;
    expect(v.precedent).toBe(500);
    expect(v.courant).toBeCloseTo(10699, 2);
  });

  it("retourne null plutôt qu'un pourcentage inventé quand la référence est nulle", () => {
    const missions = [mission(1, "2026-08-02", 1100)];
    expect(variationCAMensuelle(missions, new Date("2026-08-09T12:00:00"))).toBeNull();
  });

  it("exclut les missions annulées des deux côtés de la comparaison", () => {
    const missions = [
      mission(1, "2026-07-02", 1000),
      mission(2, "2026-07-03", 5000, "Annulée"),
      mission(3, "2026-08-02", 1000),
      mission(4, "2026-08-03", 5000, "Annulée"),
    ];
    const v = variationCAMensuelle(missions, new Date("2026-08-09T12:00:00"))!;
    expect(v.precedent).toBe(1000);
    expect(v.courant).toBe(1000);
    expect(v.pourcentage).toBe(0);
  });
});
