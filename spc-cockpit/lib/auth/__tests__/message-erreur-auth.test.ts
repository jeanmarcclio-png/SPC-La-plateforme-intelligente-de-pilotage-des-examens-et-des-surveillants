import { describe, it, expect } from "vitest";
import { diagnostiquerErreurAuth } from "../message-erreur-auth";

/**
 * Le contrôle central de ce fichier n'est pas la formulation des messages, mais
 * la FRONTIÈRE : ce qui relève de la saisie ne doit jamais être confondu avec ce
 * qui relève de la configuration. C'est cette confusion qui faisait ressaisir un
 * mot de passe correct pendant qu'une instance absente restait invisible.
 */
describe("diagnostiquerErreurAuth", () => {
  it("ne dit rien quand il n'y a pas d'erreur", () => {
    expect(diagnostiquerErreurAuth(null).message).toBe("");
    expect(diagnostiquerErreurAuth(undefined).configuration).toBe(false);
  });

  describe("ce qui relève de la SAISIE", () => {
    it("identifiants refusés — le seul cas où l'on parle de mot de passe", () => {
      const d = diagnostiquerErreurAuth({ code: "invalid_credentials", status: 400 });
      expect(d.message).toBe("Email ou mot de passe incorrect.");
      expect(d.configuration).toBe(false);
    });

    it("n'indique pas si le compte existe — cela permettrait de les énumérer", () => {
      const d = diagnostiquerErreurAuth({ code: "invalid_credentials", status: 400 });
      expect(d.message).not.toMatch(/inconnu|introuvable|n'existe pas|compte/i);
    });

    it("trop de tentatives est bien une limite d'usage, pas une panne", () => {
      const d = diagnostiquerErreurAuth({ status: 429 });
      expect(d.configuration).toBe(false);
      expect(d.message).toMatch(/tentatives/i);
    });
  });

  describe("ce qui relève de la CONFIGURATION", () => {
    it("service injoignable (projet en pause, URL erronée, réseau coupé)", () => {
      for (const erreur of [
        { name: "AuthRetryableFetchError", message: "Failed to fetch" },
        { message: "TypeError: NetworkError when attempting to fetch resource." },
        { status: 503 },
      ]) {
        const d = diagnostiquerErreurAuth(erreur);
        expect(d.configuration, JSON.stringify(erreur)).toBe(true);
        expect(d.message).toMatch(/injoignable/i);
      }
    });

    it("clé d'API invalide — et le message nomme la variable à corriger", () => {
      const d = diagnostiquerErreurAuth({ message: "Invalid API key", status: 401 });
      expect(d.configuration).toBe(true);
      expect(d.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    });

    it("compte non confirmé — piège classique de mise en service", () => {
      const d = diagnostiquerErreurAuth({ code: "email_not_confirmed", status: 400 });
      expect(d.configuration).toBe(true);
      expect(d.message).toMatch(/Auto Confirm User/);
    });

    it("aucune instance raccordée — le message couvre démo ET oubli de variables", () => {
      const d = diagnostiquerErreurAuth({ code: "SPC_DEMO" });
      expect(d.configuration).toBe(true);
      expect(d.message).toMatch(/démonstration/i);
      expect(d.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    });

    it("cause inconnue : on affiche le code plutôt que d'inventer", () => {
      const d = diagnostiquerErreurAuth({ code: "quelque_chose_de_neuf" });
      expect(d.configuration).toBe(true);
      expect(d.message).toContain("quelque_chose_de_neuf");
    });
  });

  it("AUCUNE erreur de configuration ne doit accuser le mot de passe", () => {
    const causesDeConfiguration = [
      { name: "AuthRetryableFetchError", message: "Failed to fetch" },
      { message: "Invalid API key", status: 401 },
      { code: "email_not_confirmed" },
      { status: 500 },
      { code: "cas_imprevu" },
    ];
    for (const erreur of causesDeConfiguration) {
      const d = diagnostiquerErreurAuth(erreur);
      expect(d.configuration, JSON.stringify(erreur)).toBe(true);
      // Le message peut mentionner « ce n'est pas votre mot de passe », mais
      // jamais affirmer qu'il est incorrect.
      expect(d.message, JSON.stringify(erreur)).not.toBe("Email ou mot de passe incorrect.");
    }
  });
});
