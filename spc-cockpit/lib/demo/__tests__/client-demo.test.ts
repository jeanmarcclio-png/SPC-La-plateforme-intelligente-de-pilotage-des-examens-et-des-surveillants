import { describe, it, expect } from "vitest";
import { clientDemo } from "../client-demo";
import { DEMO_ORG_ID, DEMO_EMAIL, DEMO_MESSAGE_ECRITURE } from "../identite";

/**
 * Ce que ce fichier protège n'est pas le confort de la démonstration, mais ses
 * deux INVARIANTS : aucune écriture ne doit jamais paraître réussie, et aucune
 * méthode du constructeur de requêtes ne doit faire tomber un écran. Une démo
 * qui plante ou qui ment devant un prospect coûte plus cher que pas de démo.
 */
describe("client de démonstration", () => {
  describe("les gardes d'authentification obtiennent de quoi passer", () => {
    it("sert une appartenance à l'organisation de démonstration", async () => {
      const { data, error } = await clientDemo()
        .from("organization_members")
        .select("org_id, role, organizations(nom, slug)")
        .eq("user_id", "peu importe");

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data as { org_id: string }[])[0].org_id).toBe(DEMO_ORG_ID);
    });

    it("sert un utilisateur — sans quoi le layout redirige vers /login", async () => {
      const { data } = await clientDemo().auth.getUser();
      expect(data.user?.email).toBe(DEMO_EMAIL);
    });
  });

  describe("AUCUNE écriture ne doit paraître réussie", () => {
    it.each(["insert", "update", "upsert", "delete"] as const)("%s est refusé explicitement", async (methode) => {
      const { error } = await clientDemo().from("missions")[methode]({ client: "X" });
      expect(error).not.toBeNull();
      expect(error?.code).toBe("SPC_DEMO");
      expect(error?.message).toBe(DEMO_MESSAGE_ECRITURE);
    });

    it("un filtre posé APRÈS l'écriture ne la rend pas soudainement licite", () => {
      // `.update({…}).eq("id", 1)` est la forme réelle : le refus doit survivre
      // au chaînage, sinon toute écriture filtrée passerait pour un succès.
      return clientDemo()
        .from("missions")
        .update({ statut: "terminee" })
        .eq("id", "1")
        .then(({ error }) => {
          expect(error?.code).toBe("SPC_DEMO");
        });
    });

    it("les procédures stockées aussi — ce sont des écritures", async () => {
      const { error } = await clientDemo().rpc("spc_create_organization", { p_nom: "X" });
      expect(error?.code).toBe("SPC_DEMO");
    });

    it("le refus est lisible par un humain, pas un code technique", () => {
      expect(DEMO_MESSAGE_ECRITURE).toMatch(/n'est pas enregistrée/);
      expect(DEMO_MESSAGE_ECRITURE).toMatch(/fictives/);
    });
  });

  describe("dégradation sûre", () => {
    it("une table inconnue rend un écran VIDE, jamais une erreur", async () => {
      const { data, error } = await clientDemo().from("table_qui_nexiste_pas").select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("une méthode de filtrage jamais prévue ne fait pas tomber l'écran", async () => {
      // C'est tout l'intérêt du Proxy : `overlaps`, `textSearch`, `rangeGt`…
      // n'ont pas été écrits à la main et fonctionnent quand même.
      const { error, data } = await clientDemo()
        .from("organizations")
        .select("*")
        .overlaps("zones", ["A"])
        .textSearch("nom", "démo");
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it("single() rend un objet et non un tableau", async () => {
      const { data } = await clientDemo().from("organizations").select("*").single();
      expect(Array.isArray(data)).toBe(false);
      expect((data as { id: string }).id).toBe(DEMO_ORG_ID);
    });

    it("single() sur une table vide rend null, pas une erreur", async () => {
      const { data, error } = await clientDemo().from("missions").select("*").single();
      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    it("le temps réel s'abonne et se désabonne sans lever", () => {
      // RealtimeRefresh emportait tout l'écran en 500 sans ces méthodes.
      const client = clientDemo();
      const canal = client.channel("realtime-missions");
      expect(() => canal.on("postgres_changes", {}, () => {})).not.toThrow();
      expect(() => canal.subscribe()).not.toThrow();
      expect(() => client.removeChannel(canal)).not.toThrow();
    });

    it("la connexion par mot de passe est refusée : il n'y a aucun compte", async () => {
      const { error } = await clientDemo().auth.signInWithPassword();
      expect(error?.code).toBe("SPC_DEMO");
    });
  });
});
