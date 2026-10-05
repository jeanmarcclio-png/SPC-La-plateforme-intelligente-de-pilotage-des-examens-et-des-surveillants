import { describe, it, expect } from "vitest";
import {
  validerInvitation,
  controlerActionMembre,
  cheminInterneSur,
  construireLienAcces,
  emailInvitation,
  estRoleSurveillant,
  roleCollaborateur,
  CHEMIN_MOT_DE_PASSE,
} from "../collaborateurs";

describe("validerInvitation", () => {
  it("normalise email, rôle et nom", () => {
    const r = validerInvitation({ email: "  Frederic.Pradines@Gmail.com ", role: "Lecteur", nom: "  Frédéric  " });
    expect(r).toEqual({ ok: true, email: "frederic.pradines@gmail.com", role: "lecteur", nom: "Frédéric" });
  });
  it("nom vide → null", () => {
    const r = validerInvitation({ email: "a@b.fr", role: "administrateur", nom: "   " });
    expect(r.ok && r.nom).toBe(null);
  });
  it("refuse un email manquant ou invalide", () => {
    expect(validerInvitation({ email: "", role: "lecteur" }).ok).toBe(false);
    expect(validerInvitation({ email: "pas-un-email", role: "lecteur" }).ok).toBe(false);
    expect(validerInvitation({ email: "a@b", role: "lecteur" }).ok).toBe(false);
  });
  it("refuse un rôle inconnu ou surveillant", () => {
    expect(validerInvitation({ email: "a@b.fr", role: "superadmin" }).ok).toBe(false);
    expect(validerInvitation({ email: "a@b.fr", role: "surveillant" }).ok).toBe(false);
  });
});

describe("controlerActionMembre", () => {
  it("interdit d'agir sur son propre compte (pas d'auto-verrouillage)", () => {
    const r = controlerActionMembre({ acteurId: "u1", cibleId: "u1", cibleRoleBrut: "administrateur" });
    expect(r.ok).toBe(false);
  });
  it("renvoie les comptes surveillant vers l'écran Surveillants", () => {
    const r = controlerActionMembre({ acteurId: "u1", cibleId: "u2", cibleRoleBrut: "surveillant" });
    expect(r.ok).toBe(false);
  });
  it("autorise sur un autre collaborateur", () => {
    expect(controlerActionMembre({ acteurId: "u1", cibleId: "u2", cibleRoleBrut: "lecteur" }).ok).toBe(true);
    expect(controlerActionMembre({ acteurId: "u1", cibleId: "u2", cibleRoleBrut: "administrateur" }).ok).toBe(true);
  });
});

describe("cheminInterneSur", () => {
  it("garde les chemins internes", () => {
    expect(cheminInterneSur("/compte/mot-de-passe")).toBe("/compte/mot-de-passe");
  });
  it("bloque les redirections externes (open redirect)", () => {
    expect(cheminInterneSur("https://evil.com")).toBe("/operations");
    expect(cheminInterneSur("//evil.com")).toBe("/operations");
    expect(cheminInterneSur("/\\evil.com")).toBe("/operations");
    expect(cheminInterneSur(null, "/x")).toBe("/x");
  });
});

describe("construireLienAcces", () => {
  it("pointe vers /auth/confirm puis l'écran mot de passe", () => {
    const lien = construireLienAcces("https://spc-cockpit.vercel.app/", "abc123", "invite");
    const url = new URL(lien);
    expect(url.origin + url.pathname).toBe("https://spc-cockpit.vercel.app/auth/confirm");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("invite");
    expect(url.searchParams.get("next")).toBe(CHEMIN_MOT_DE_PASSE);
  });
});

describe("emailInvitation", () => {
  it("contient le lien, le rôle et l'organisation", () => {
    const { sujet, texte } = emailInvitation({
      lien: "https://x/auth/confirm?t=1",
      role: "lecteur",
      organisation: "SPC",
      invitant: "Jean-Marc",
    });
    expect(sujet).toBe("Votre accès à Survéo");
    expect(texte).toContain("https://x/auth/confirm?t=1");
    expect(texte).toContain("Lecteur");
    expect(texte).toContain("SPC");
    expect(texte).toContain("Jean-Marc");
  });
  it("adapte le sujet en cas de relance", () => {
    expect(emailInvitation({ lien: "l", role: "coordinateur", organisation: "SPC", relance: true }).sujet).toBe(
      "Votre lien d'accès à Survéo"
    );
  });
});

describe("rôles", () => {
  it("détecte les comptes surveillant", () => {
    expect(estRoleSurveillant("surveillant")).toBe(true);
    expect(estRoleSurveillant("Surveillante")).toBe(true);
    expect(estRoleSurveillant("lecteur")).toBe(false);
    expect(estRoleSurveillant(null)).toBe(false);
  });
  it("normalise le rôle collaborateur", () => {
    expect(roleCollaborateur("admin")).toBe("administrateur");
    expect(roleCollaborateur("lecteur")).toBe("lecteur");
  });
});
