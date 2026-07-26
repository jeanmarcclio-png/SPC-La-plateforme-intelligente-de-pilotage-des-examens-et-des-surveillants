import { describe, it, expect } from "vitest";
import { validatePortailPayload, emptyPortailPayload, portailEtatMessage, type PortailPayload } from "../portail-constants";

function complet(): PortailPayload {
  return {
    ...emptyPortailPayload(),
    etablissement: "EM Lyon",
    demandeur_nom: "Bonnet",
    demandeur_email: "c.bonnet@x.fr",
    salles: [
      { creneau: "matin", salle: "A21", etudiants: 120, surveillants: 3, pmr: false, tiers_temps: false, date_examen: "2026-01-12", debut_surveillance: "08:30", fin_surveillance: "11:30" },
    ],
  };
}

describe("validatePortailPayload", () => {
  it("ne bloque pas une soumission complète", () => {
    expect(validatePortailPayload(complet())).toEqual([]);
  });

  it("exige établissement, demandeur (nom+email) et au moins une salle", () => {
    const p = { ...emptyPortailPayload() };
    const errs = validatePortailPayload(p);
    expect(errs.some((e) => /établissement/i.test(e))).toBe(true);
    expect(errs.some((e) => /demandeur/i.test(e))).toBe(true);
    expect(errs.some((e) => /salle/i.test(e))).toBe(true);
  });

  it("rejette un email demandeur invalide", () => {
    const p = complet();
    p.demandeur_email = "pas-un-email";
    expect(validatePortailPayload(p).some((e) => /email/i.test(e))).toBe(true);
  });

  it("exige une date d'examen et des effectifs positifs", () => {
    const p = complet();
    p.salles = [{ creneau: "matin", salle: "B14", etudiants: 0, surveillants: 0, pmr: false, tiers_temps: false }];
    const errs = validatePortailPayload(p);
    expect(errs.some((e) => /date/i.test(e))).toBe(true);
    expect(errs.some((e) => /effectif/i.test(e))).toBe(true);
    expect(errs.some((e) => /surveillant/i.test(e))).toBe(true);
  });

  it("détecte un horaire de surveillance incohérent", () => {
    const p = complet();
    p.salles[0].debut_surveillance = "11:30";
    p.salles[0].fin_surveillance = "08:30";
    expect(validatePortailPayload(p).some((e) => /incohérent/i.test(e))).toBe(true);
  });

  it("exige un effectif si PMR/tiers-temps signalés", () => {
    const p = complet();
    p.pmr_present = true; p.pmr_nombre = 0;
    p.tiers_temps_present = true; p.tiers_temps_nombre = 0;
    const errs = validatePortailPayload(p);
    expect(errs.some((e) => /PMR/i.test(e))).toBe(true);
    expect(errs.some((e) => /tiers-temps/i.test(e))).toBe(true);
  });
});

describe("portailEtatMessage", () => {
  it("mappe chaque état sur un message client", () => {
    expect(portailEtatMessage("expire")).toMatch(/expiré/i);
    expect(portailEtatMessage("revoque")).toMatch(/désactivé/i);
    expect(portailEtatMessage("soumis")).toMatch(/déjà été transmise/i);
    expect(portailEtatMessage("invalide")).toMatch(/pas valide/i);
    expect(portailEtatMessage(undefined)).toMatch(/erreur/i);
  });
});
