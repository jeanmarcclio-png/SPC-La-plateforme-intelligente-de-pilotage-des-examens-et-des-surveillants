// Non-régression du chantier 3 — corrige BUG-011, BUG-022 et BUG-024.

import { describe, it, expect } from "vitest";
import { entier, montant, texteRequis, premiereErreurDe, messageMetier } from "../validation-serveur";
import { allowedTransitions, statutOptions, MISSION_STATUTS } from "../mission-status";

function form(champs: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return fd;
}

describe("BUG-022 — les valeurs limites ne sont plus converties en silence", () => {
  it("refuse une saisie NON NUMÉRIQUE au lieu de la remplacer par un repli", () => {
    // Avant : `Number("abc") || 0` → 0 € enregistré sans un mot.
    const r = montant(form({ montant_ht: "abc" }), "montant_ht", { defaut: 0, libelle: "Le montant HT" });
    expect(r).toEqual({ ok: false, erreur: "Le montant HT doit être un montant valide" });
  });

  it("refuse 0 salle au lieu de le transformer en 1", () => {
    // Avant : `Number("0") || 1` → 1 salle enregistrée alors que l'utilisateur a saisi 0.
    const r = entier(form({ nb_salles: "0" }), "nb_salles", { min: 1, defaut: 1, libelle: "Le nombre de salles" });
    expect(r).toEqual({ ok: false, erreur: "Le nombre de salles doit être supérieur ou égal à 1" });
  });

  it("refuse les valeurs négatives", () => {
    expect(entier(form({ n: "-5" }), "n", { min: 1, libelle: "Le nombre" }).ok).toBe(false);
    expect(montant(form({ m: "-999" }), "m", { min: 0, libelle: "Le montant" }).ok).toBe(false);
  });

  it("refuse un décimal là où un entier est attendu", () => {
    expect(entier(form({ n: "2.5" }), "n", { min: 1, libelle: "Le nombre" })).toEqual({
      ok: false, erreur: "Le nombre doit être un nombre entier",
    });
  });

  it("borne les valeurs extrêmes", () => {
    expect(entier(form({ n: "99999" }), "n", { min: 1, max: 500, libelle: "Le nombre" })).toEqual({
      ok: false, erreur: "Le nombre ne peut pas dépasser 500",
    });
  });

  it("accepte la virgule décimale française", () => {
    expect(montant(form({ m: "4042,50" }), "m", { libelle: "Le montant" })).toEqual({ ok: true, valeur: 4042.5 });
  });

  it("applique le défaut sur un champ vide, jamais sur une saisie invalide", () => {
    expect(entier(form({ n: "" }), "n", { min: 1, defaut: 1, libelle: "Le nombre" })).toEqual({ ok: true, valeur: 1 });
    expect(entier(form({ n: "x" }), "n", { min: 1, defaut: 1, libelle: "Le nombre" }).ok).toBe(false);
  });

  it("exige les champs texte obligatoires et borne leur longueur", () => {
    expect(texteRequis(form({ t: "   " }), "t", { libelle: "La référence" }).ok).toBe(false);
    expect(texteRequis(form({ t: "x".repeat(300) }), "t", { libelle: "La référence", maxLongueur: 60 }).ok).toBe(false);
  });

  it("remonte la PREMIÈRE erreur, pour corriger un champ à la fois", () => {
    const e = premiereErreurDe(
      texteRequis(form({}), "reference", { libelle: "La référence" }),
      entier(form({ n: "-1" }), "n", { min: 1, libelle: "Le nombre" }),
    );
    expect(e).toBe("La référence est obligatoire");
  });
});

describe("BUG-011 — la matrice de transitions est la seule source", () => {
  it("« Terminée » ne mène qu'à Facturée ou Archivée", () => {
    expect(allowedTransitions("Terminée")).toEqual(["Facturée", "Archivée"]);
    expect(allowedTransitions("Terminée")).not.toContain("Brouillon");
  });

  it("le sélecteur d'une mission Terminée propose 3 options, pas les 11", () => {
    const opts = statutOptions("Terminée");
    expect(opts).toEqual(["Terminée", "Facturée", "Archivée"]);
    expect(opts.length).toBeLessThan(MISSION_STATUTS.length);
    expect(opts).not.toContain("Brouillon");
  });

  it("les statuts terminaux ne proposent qu'eux-mêmes", () => {
    expect(statutOptions("Archivée")).toEqual(["Archivée"]);
    expect(statutOptions("Annulée")).toEqual(["Annulée"]);
  });
});

describe("BUG-024 — les erreurs base deviennent des messages métier", () => {
  it("traduit une violation d'unicité sans exposer le SQL", () => {
    const m = messageMetier(
      "Création de la mission",
      'duplicate key value violates unique constraint "missions_reference_key"',
    );
    expect(m).toContain("référence");
    expect(m).not.toContain("duplicate key");
    expect(m).not.toContain("missions_reference_key");
  });

  it("traduit une violation de clé étrangère en conseil actionnable", () => {
    const m = messageMetier("Suppression de la salle", "violates foreign key constraint");
    expect(m).toContain("encore utilisé");
    expect(m).toContain("désactivez");
  });

  it("traduit un refus RLS", () => {
    expect(messageMetier("Mise à jour", "new row violates row-level security policy")).toContain("droits");
  });

  it("reste compréhensible sur un message inconnu", () => {
    const m = messageMetier("Création", "quelque chose d'inattendu");
    expect(m).toContain("Réessayez");
    expect(m).not.toContain("inattendu");
  });
});
