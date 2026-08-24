import { describe, it, expect } from "vitest";
import { cleTelephone, memeTelephone } from "@/lib/operations/telephone";

/**
 * Ces tests figent le comportement que la recette Supabase a rendu nécessaire.
 *
 * La sonde D-4b a établi, sur une vraie base, qu'un même numéro entrait deux
 * fois : « +33 6 12 00 00 01 » et « 06 12 00 00 01 » produisaient deux clés
 * distinctes. `cleTelephone()` est le pendant TypeScript de `spc_tel_cle()`
 * (migration 33) — les deux doivent renvoyer la même clé pour la même saisie,
 * sans quoi l'écran et la base se contrediront.
 */
describe("cleTelephone", () => {
  it("rapproche la forme internationale et la forme nationale du même numéro", () => {
    expect(cleTelephone("+33 6 12 00 00 01")).toBe("0612000001");
    expect(cleTelephone("06 12 00 00 01")).toBe("0612000001");
    expect(cleTelephone("0033612000001")).toBe("0612000001");
    expect(cleTelephone("+33612000001")).toBe("0612000001");
  });

  it("ignore les séparateurs, quels qu'ils soient", () => {
    for (const saisie of ["0612000001", "06.12.00.00.01", "06-12-00-00-01", " 06 12 00 00 01 "]) {
      expect(cleTelephone(saisie)).toBe("0612000001");
    }
  });

  it("renvoie une clé vide quand il n'y a aucun chiffre", () => {
    expect(cleTelephone(null)).toBe("");
    expect(cleTelephone(undefined)).toBe("");
    expect(cleTelephone("")).toBe("");
    expect(cleTelephone("non renseigné")).toBe("");
  });

  it("ne mutile pas un numéro étranger commençant par 33", () => {
    // 33 suivi d'autre chose que 9 chiffres : ce n'est pas un numéro français,
    // on ne lui retire pas son indicatif. Sans cette garde, un numéro étranger
    // serait transformé en un faux numéro national et pourrait entrer en
    // collision avec une vraie fiche.
    expect(cleTelephone("3312345")).toBe("3312345");
    expect(cleTelephone("331234567890123")).toBe("331234567890123");
  });
});

describe("memeTelephone", () => {
  it("reconnaît deux écritures du même numéro", () => {
    expect(memeTelephone("+33 6 12 00 00 01", "0612000001")).toBe(true);
  });

  it("distingue deux numéros différents", () => {
    expect(memeTelephone("0612000001", "0612000002")).toBe(false);
  });

  it("ne déclare JAMAIS doublon deux fiches sans téléphone", () => {
    // Le point métier : deux surveillants sans numéro ne sont pas la même
    // personne. Une clé vide qui se comparerait à elle-même fusionnerait tout
    // le référentiel des fiches incomplètes.
    expect(memeTelephone(null, null)).toBe(false);
    expect(memeTelephone("", "")).toBe(false);
    expect(memeTelephone("pas de tel", null)).toBe(false);
  });
});
