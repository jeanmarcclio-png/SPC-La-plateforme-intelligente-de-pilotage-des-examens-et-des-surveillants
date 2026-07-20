import { describe, it, expect } from "vitest";
import { parseCSV, toCSV, detectDelimiter } from "../csv";
import { buildImportPreview, normalizeStatut, isValidEmail, splitFullName, looksLikeName } from "../surveillants-import";

describe("CSV parse", () => {
  it("détecte le séparateur ; et ,", () => {
    expect(detectDelimiter("a;b;c")).toBe(";");
    expect(detectDelimiter("a,b,c")).toBe(",");
  });
  it("gère guillemets, accents, virgule interne", () => {
    const rows = parseCSV('Prénom;Nom;Observations\nÉlodie;Renard;"Amphi, salle A"');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(["Élodie", "Renard", "Amphi, salle A"]);
  });
  it("ignore les lignes vides et le BOM", () => {
    const rows = parseCSV("﻿a;b\n\n1;2\n");
    expect(rows).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("toCSV échappe les valeurs sensibles", () => {
    expect(toCSV([["a;b", 'c"d']])).toBe('"a;b";"c""d"');
  });
});

describe("normalizeStatut", () => {
  it("mappe les libellés courants", () => {
    expect(normalizeStatut("Actif")).toBe("Disponible");
    expect(normalizeStatut("")).toBe("Disponible");
    expect(normalizeStatut("planifié")).toBe("Planifié");
    expect(normalizeStatut("Indisponible")).toBe("Indisponible");
    expect(normalizeStatut("annulé")).toBe("Annulé");
  });
});

describe("isValidEmail", () => {
  it("valide/invalide correctement", () => {
    expect(isValidEmail("a@b.fr")).toBe(true);
    expect(isValidEmail("")).toBe(true); // non obligatoire
    expect(isValidEmail("pasunmail")).toBe(false);
  });
});

describe("buildImportPreview", () => {
  const existing = [{ nom: "Marie Lecomte", email: "marie@spc.fr", telephone: "06 11 22 33 44" }];

  it("mappe par en-têtes, valide et détecte doublon par nom", () => {
    const rows = parseCSV("Prénom;Nom;Téléphone;Email;Rôle;Statut\nMarie;Lecomte;;;Coordinatrice;Actif\nKarim;Osei;06 99 88 77 66;k@spc.fr;Surveillant;Disponible");
    const p = buildImportPreview(rows, existing);
    expect(p.total).toBe(2);
    expect(p.rows[0].duplicate).toBe(true);      // Marie Lecomte existe
    expect(p.rows[1].valid).toBe(true);
    expect(p.rows[1].duplicate).toBe(false);
    expect(p.valides).toBe(1);
  });

  it("signale email invalide et nom manquant", () => {
    const rows = parseCSV("Prénom;Nom;Email\n;;bad\nJean;Val;j@v.fr");
    const p = buildImportPreview(rows, []);
    expect(p.rows[0].errors).toContain("Nom manquant");
    expect(p.rows[0].errors).toContain("Email invalide");
    expect(p.rows[1].valid).toBe(true);
  });

  it("détecte doublon par email et par téléphone", () => {
    const rows = parseCSV("Prénom;Nom;Téléphone;Email\nX;Y;;marie@spc.fr\nZ;W;06 11 22 33 44;");
    const p = buildImportPreview(rows, existing);
    expect(p.rows[0].duplicate).toBe(true);
    expect(p.rows[1].duplicate).toBe(true);
  });

  it("repli positionnel si en-têtes non reconnus", () => {
    const rows = parseCSV("colA;colB;colC\nAlice;Martin;06 00 00 00 00");
    const p = buildImportPreview(rows, []);
    expect(p.rows[0].nomComplet).toBe("Alice Martin");
  });

  it("minimisation RGPD : liste les colonnes non reconnues et n'importe pas leur contenu", () => {
    const rows = parseCSV(
      "Prénom;Nom;Numéro de sécurité sociale;IBAN;Email\n" +
      "Jean;Val;1 85 12 75 116 001 42;FR76 3000 4000 05;j@v.fr"
    );
    const p = buildImportPreview(rows, []);
    // en-têtes hors HEADER_MAP → listés
    expect(p.colonnesIgnorees).toEqual(["Numéro de sécurité sociale", "IBAN"]);
    // colonnes reconnues bien importées
    expect(p.rows[0].nomComplet).toBe("Jean Val");
    expect(p.rows[0].data.email).toBe("j@v.fr");
    // aucun champ ne contient le NIR ou l'IBAN (non importés)
    const serialized = JSON.stringify(p.rows[0].data);
    expect(serialized).not.toContain("116 001 42");
    expect(serialized).not.toContain("FR76");
  });

  it("colonnesIgnorees vide quand toutes les colonnes sont reconnues", () => {
    const rows = parseCSV("Prénom;Nom;Email\nJean;Val;j@v.fr");
    const p = buildImportPreview(rows, []);
    expect(p.colonnesIgnorees).toEqual([]);
  });
});

import { stripCivility } from "../surveillants-import";

describe("import format PLANNING (colonne SURVEILLANT)", () => {
  it("stripCivility retire M./Mme/Mlle", () => {
    expect(stripCivility("M. Clio Jean Marc")).toBe("Clio Jean Marc");
    expect(stripCivility("Mme Ben Sassi")).toBe("Ben Sassi");
    expect(stripCivility("M.Auguste Miguel")).toBe("Auguste Miguel");
    expect(stripCivility("Lainé Myriam")).toBe("Lainé Myriam");
  });

  it("trouve l'en-tête décalé, extrait la colonne SURVEILLANT, déduplique et retire la civilité", () => {
    const rows = [
      ["PLANNING DES SURVEILLANCES", "", "", "", "", "", "", "", ""],
      ["Sessions : 15-19 juin", "", "", "", "", "", "", "", ""],
      ["JOUR / DATE", "DÉBUT", "FIN", "FORMATION", "SALLE", "ÉTUDIANTS", "SURVEILLANT", "REMARQUES", "PRÉSENCE"],
      ["Lundi 15/06", "8h30", "12h15", "Rattrapage", "B22", "30", "M. Clio Jean Marc", "", "Présent"],
      ["Lundi 15/06", "13h30", "16h15", "Rattrapage", "B23", "30", "M. Clio Jean Marc", "", "Présent"], // répété
      ["Mardi 16/06", "8h30", "12h15", "Rattrapage", "B22", "30", "Mme Ben Sassi", "", "Présent"],
      ["Lundi 15/06", "8h30", "13h15", "Surveillant volant", "—", "—", "—", "", ""], // pas de nom
    ];
    const p = buildImportPreview(rows, []);
    expect(p.total).toBe(4);
    // Clio (1×) + Ben Sassi (1×) = 2 uniques valides ; 1 répétition + 1 sans nom
    expect(p.valides).toBe(2);
    const noms = p.rows.filter((r) => r.valid && !r.duplicate).map((r) => r.nomComplet);
    expect(noms).toEqual(["Clio Jean Marc", "Ben Sassi"]);
    expect(p.rows[1].duplicate).toBe(true); // 2e Clio
    expect(p.rows[3].errors).toContain("Nom manquant"); // ligne « — »
  });
});

describe("nettoyage marqueur d'absence", () => {
  it("retire le suffixe ABS et fusionne le doublon", () => {
    expect(stripCivility("M. Clio Jean Marc ABS")).toBe("Clio Jean Marc");
    expect(stripCivility("Cériac Matéo (abs)")).toBe("Cériac Matéo");
  });
});

describe("splitFullName (extraction prénom + nom)", () => {
  it("nom en tête, prénom composé", () => {
    expect(splitFullName("Meunier Jean Louis")).toEqual({ nom: "Meunier", prenom: "Jean Louis" });
    expect(splitFullName("Clio Jean Marc")).toEqual({ nom: "Clio", prenom: "Jean Marc" });
  });
  it("nettoie la civilité avant de découper", () => {
    expect(splitFullName("M. Auguste Miguel")).toEqual({ nom: "Auguste", prenom: "Miguel" });
  });
  it("nom seul → prénom vide", () => {
    expect(splitFullName("Volant")).toEqual({ nom: "Volant", prenom: "" });
  });
});

describe("looksLikeName (rejet des lignes d'en-tête / titres)", () => {
  it("accepte les vrais noms", () => {
    expect(looksLikeName("Marie Lecomte")).toBe(true);
    expect(looksLikeName("Ben Sassi Faouzia")).toBe(true);
    expect(looksLikeName("Nolleau Gilbert")).toBe(true);
  });
  it("rejette les lignes d'en-tête / titres de planning", () => {
    expect(looksLikeName("Sessions : 15-19 juin | 22-26 juin 2026 — Filtres ▼ disponibles sur chaque colonne")).toBe(false);
    expect(looksLikeName("Salle B22")).toBe(false); // chiffre + mot « salle »
    expect(looksLikeName("Date / Jour")).toBe(false); // séparateur + mot d'en-tête
    expect(looksLikeName("Total heures planifiées")).toBe(false); // mot d'en-tête
  });
});

describe("buildImportPreview rejette la ligne parasite", () => {
  it("marque la ligne d'en-tête comme à corriger et ne la compte pas comme valide", () => {
    const rows = [
      ["SURVEILLANT"],
      ["Meunier Jean Louis"],
      ["Sessions : 15-19 juin | 22-26 juin 2026 — Filtres ▼ disponibles sur chaque colonne"],
    ];
    const p = buildImportPreview(rows, []);
    expect(p.rows[0].valid).toBe(true); // Meunier Jean Louis
    expect(p.rows[1].valid).toBe(false); // ligne parasite
    expect(p.rows[1].errors[0]).toMatch(/en-tête ou titre/);
    expect(p.valides).toBe(1);
  });
});

describe("cross-check des affectations existantes", () => {
  it("signale les salles déjà affectées pour un nom importé", () => {
    const existing = [
      { nom: "Clio Jean Marc", salles: ["B22", "B23"] },
      { nom: "Ben Sassi Faouzia", salles: [] },
    ];
    const rows = [
      ["SURVEILLANT"],
      ["Clio Jean Marc"],
      ["Ben Sassi Faouzia"],
      ["Nouveau Venu"],
    ];
    const p = buildImportPreview(rows, existing);
    expect(p.rows[0].dejaAffecte).toEqual(["B22", "B23"]);
    expect(p.rows[0].prenom).toBe("Jean Marc");
    expect(p.rows[0].nom).toBe("Clio");
    expect(p.rows[1].dejaAffecte).toEqual([]); // présent mais aucune salle
    expect(p.rows[2].dejaAffecte).toEqual([]); // inconnu
  });
});
