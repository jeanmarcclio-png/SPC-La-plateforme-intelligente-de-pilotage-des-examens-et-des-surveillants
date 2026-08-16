/**
 * RECETTE APPLICATIVE — lots 1 à 4 du plan de retest.
 *
 * CE QUE CE FICHIER PROUVE, ET POURQUOI IL EXISTE
 * ----------------------------------------------
 * L'audit QA forensic V2 s'est arrêté sur un plafond : aucune instance n'était
 * disponible, donc le chemin d'ÉCRITURE n'a jamais été exécuté. Lecture, calculs
 * et rendu étaient prouvés ; persistance, CRUD, cascades et isolation en écriture
 * ne l'étaient pas. C'est ce seul manque qui maintenait le verdict en NO-GO.
 *
 * Ici, ce sont les VRAIES Server Actions qui tournent — `createSalle`,
 * `deleteSurveillant`, `createMission`… importées depuis `app/actions/`, sans
 * réécriture ni doublure. Elles appellent le vrai `createClient()`, donc le vrai
 * `@supabase/ssr`, qui émet de vraies requêtes HTTP vers PostgREST, qui les
 * exécute sur un vrai PostgreSQL où les 30 migrations et toutes les policies RLS
 * sont en place.
 *
 * Trois doublures, toutes hors du périmètre testé :
 *   - `next/cache`      : `revalidatePath` n'a aucun sens hors d'un serveur Next.
 *   - `next/navigation` : une redirection est ici un échec, pas un comportement.
 *   - `next/headers`    : fournit le magasin de cookies, mais avec une VRAIE
 *     session au format `@supabase/ssr` — l'application lit son jeton là où elle
 *     le lit en production, et `auth.getUser()` le valide par un appel HTTP.
 * Rien n'est bouchonné entre l'action et la table. Un test qui passe ici prouve
 * que le code écrit juste ; un test qui échoue désigne un vrai défaut.
 *
 * Lancement : supabase/recette/locale/recette-applicative.sh
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

// --- Doublures d'environnement Next, posées AVANT tout import applicatif ----
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));
// Le cookie de session que verra `@supabase/ssr`. Muté par `devenir()`.
const cookiesCourants: { name: string; value: string }[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => cookiesCourants,
    get: (n: string) => cookiesCourants.find((c) => c.name === n),
    set: () => {},
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirection inattendue vers ${url} — le compte de recette devrait être résolu`);
  },
  notFound: () => {
    throw new Error("notFound() inattendu");
  },
}));

const PASSERELLE = process.env.SPC_RECETTE_URL || "http://127.0.0.1:3001";
const JWT_ADMIN = process.env.SPC_RECETTE_JWT_ADMIN!;
const JWT_TIERS = process.env.SPC_RECETTE_JWT_TIERS!;

/**
 * Bascule l'identité que prendront les prochains appels applicatifs.
 *
 * Le jeton est posé là où l'application le cherchera vraiment : dans le cookie
 * de session, au format exact de `@supabase/ssr` (`sb-<ref>-auth-token`, charge
 * utile JSON préfixée `base64-` et encodée en base64url). Le passer seulement en
 * clé anonyme ne suffirait pas — `auth.getUser()` court-circuite sans session, et
 * toutes les actions répondraient « Non authentifié ».
 */
function devenir(jeton: string, sub: string) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = PASSERELLE;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jeton;

  const session = {
    access_token: jeton,
    refresh_token: "recette-locale-pas-de-rafraichissement",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id: sub,
      aud: "authenticated",
      role: "authenticated",
      email: `${sub}@recette.spc.test`,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  };

  const ref = new URL(PASSERELLE).hostname.split(".")[0];
  const valeur = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");

  cookiesCourants.length = 0;
  cookiesCourants.push({ name: `sb-${ref}-auth-token`, value: valeur });
}

const UID_ADMIN = "11111111-1111-1111-1111-111111111111";
const UID_TIERS = "22222222-2222-2222-2222-222222222222";

/** Client direct — RÉSERVÉ à la pose et au constat de fixtures, jamais au test. */
async function clientDirect(jeton: string) {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(PASSERELLE, jeton, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function form(champs: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return fd;
}

const marque = `RECETTE-APP-${Date.now()}`;

describe("Recette applicative — le chemin d'écriture réel", () => {
  beforeAll(() => {
    expect(JWT_ADMIN, "SPC_RECETTE_JWT_ADMIN doit être fourni").toBeTruthy();
    expect(JWT_TIERS, "SPC_RECETTE_JWT_TIERS doit être fourni").toBeTruthy();
    devenir(JWT_ADMIN, UID_ADMIN);
  });

  // -------------------------------------------------------------------------
  // LOT 1 — PERSISTANCE ET CRUD
  //
  // Le point aveugle nº1 de l'audit : rien ne prouvait qu'une écriture partait
  // et revenait. On écrit, on relit dans une AUTRE connexion, on modifie, on
  // supprime, et on vérifie la disparition.
  // -------------------------------------------------------------------------
  describe("Lot 1 — persistance et CRUD", () => {
    let idSalle: number;

    it("createSalle écrit réellement en base et la ligne est relue", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { createSalle } = await import("@/app/actions/salles");
      const r = await createSalle(
        form({ nom: `${marque} S1`, capacite: "40", etudiants: "30", nb_surveillants: "2" })
      );
      expect(r.error, `createSalle a refusé : ${r.error}`).toBeUndefined();

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("salles").select("*").eq("nom", `${marque} S1`).single();
      expect(data, "la salle n'a pas été persistée").toBeTruthy();
      expect(data!.capacite).toBe(40);
      expect(data!.etudiants).toBe(30);
      expect(data!.nb_surveillants).toBe(2);
      expect(data!.org_id, "org_id doit être renseigné, sinon la RLS ne protège rien").toBeTruthy();
      idSalle = data!.id;
    });

    it("updateSalle modifie réellement la ligne", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { updateSalle } = await import("@/app/actions/salles");
      const r = await updateSalle(
        idSalle,
        form({ nom: `${marque} S1`, capacite: "60", etudiants: "55", nb_surveillants: "3" })
      );
      expect(r.error, `updateSalle a refusé : ${r.error}`).toBeUndefined();

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("salles").select("capacite, etudiants").eq("id", idSalle).single();
      expect(data!.capacite).toBe(60);
      expect(data!.etudiants).toBe(55);
    });

    it("la validation métier tient AUSSI sur le chemin réel (étudiants > capacité)", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { createSalle } = await import("@/app/actions/salles");
      const r = await createSalle(
        form({ nom: `${marque} REFUS`, capacite: "10", etudiants: "40", nb_surveillants: "1" })
      );
      expect(r.error, "une salle sur-remplie doit être refusée").toBeTruthy();

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("salles").select("id").eq("nom", `${marque} REFUS`);
      expect(data ?? [], "aucune ligne ne doit avoir été écrite").toHaveLength(0);
    });

    it("deleteSalle supprime réellement la ligne", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { deleteSalle } = await import("@/app/actions/salles");
      const r = await deleteSalle(idSalle);
      expect(r.error, `deleteSalle a refusé : ${r.error}`).toBeUndefined();

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("salles").select("id").eq("id", idSalle);
      expect(data ?? [], "la salle devait disparaître").toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // LOT 2 — CASCADES RÉELLES (P1 nº3 de l'audit)
  //
  // Le schéma porte `on delete cascade` sur `affectations`. L'audit reprochait
  // une suppression silencieuse. Le correctif exige une confirmation explicite
  // et journalise. On vérifie les DEUX temps sur une vraie cascade.
  // -------------------------------------------------------------------------
  describe("Lot 2 — cascades réelles et garde-fou de suppression", () => {
    let idSurv: number;
    let idMission: number;

    beforeAll(async () => {
      const db = await clientDirect(JWT_ADMIN);

      // Une fixture qui échoue en silence rend le test suivant ININTERPRÉTABLE :
      // « 0 affectation » se lit alors comme « le garde-fou n'a rien vu » alors
      // que c'est la pose qui a raté. Chaque écriture est donc vérifiée ici.
      const org = await db.from("organization_members").select("org_id").limit(1).single();
      if (org.error) throw new Error(`fixture — organisation illisible : ${org.error.message}`);
      const orgId = org.data.org_id;

      const s = await db
        .from("surveillants")
        .insert({ nom: `${marque} SURV`, org_id: orgId })
        .select("id")
        .single();
      if (s.error) throw new Error(`fixture — surveillant : ${s.error.message}`);
      idSurv = s.data.id;

      const m = await db
        .from("missions")
        .insert({ reference: `${marque}-M1`, client: "Recette", statut: "Planifiée", org_id: orgId })
        .select("id")
        .single();
      if (m.error) throw new Error(`fixture — mission : ${m.error.message}`);
      idMission = m.data.id;

      const a = await db
        .from("affectations")
        .insert({ mission_id: idMission, surveillant_id: idSurv, matin: true, org_id: orgId })
        .select("id")
        .single();
      if (a.error) throw new Error(`fixture — affectation : ${a.error.message}`);
    });

    it("une suppression non confirmée est REFUSÉE et n'efface rien", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { deleteSurveillant } = await import("@/app/actions/surveillants");
      const r = await deleteSurveillant(idSurv); // confirme = false
      expect(r.error, "la suppression devait être refusée faute de confirmation").toBeTruthy();
      expect(r.error).toMatch(/affectation/i);

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("surveillants").select("id").eq("id", idSurv);
      expect(data ?? [], "le surveillant ne devait pas être supprimé").toHaveLength(1);
    });

    it("confirmée, elle supprime ET la cascade détruit bien les affectations", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { deleteSurveillant } = await import("@/app/actions/surveillants");
      const r = await deleteSurveillant(idSurv, true);
      expect(r.error, `suppression confirmée refusée : ${r.error}`).toBeUndefined();

      const db = await clientDirect(JWT_ADMIN);
      const { data: surv } = await db.from("surveillants").select("id").eq("id", idSurv);
      expect(surv ?? []).toHaveLength(0);

      const { data: aff } = await db.from("affectations").select("id").eq("surveillant_id", idSurv);
      expect(aff ?? [], "la cascade devait détruire les affectations").toHaveLength(0);
    });

    it("la suppression en cascade laisse une trace au journal", async () => {
      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db
        .from("journal_sessions")
        .select("objet, ancienne")
        .ilike("objet", `%${marque} SURV%`);
      expect((data ?? []).length, "aucune trace au journal — la cascade serait silencieuse").toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // LOT 3 — DOUBLE CLIC ET UNICITÉ
  //
  // L'audit a prouvé au navigateur que 3 clics rapides émettaient 3 POST. La
  // seule barrière fiable est en base. On la met à l'épreuve pour de vrai, en
  // parallèle, à travers l'action complète.
  // -------------------------------------------------------------------------
  describe("Lot 3 — double clic et unicité", () => {
    it("trois créations simultanées de même référence n'en laissent qu'UNE", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { createMission } = await import("@/app/actions/missions");
      const champs = {
        reference: `${marque}-DBL`,
        client: "Client Recette",
        nb_salles: "2",
        nb_surveillants: "4",
        montant_ht: "1200",
        statut: "Planifiée",
      };

      const resultats = await Promise.all([
        createMission(form(champs)),
        createMission(form(champs)),
        createMission(form(champs)),
      ]);

      const db = await clientDirect(JWT_ADMIN);
      const { data } = await db.from("missions").select("id").eq("reference", `${marque}-DBL`);
      expect(data ?? [], "la contrainte d'unicité doit laisser exactement une ligne").toHaveLength(1);

      const refus = resultats.filter((r) => r.error);
      expect(refus.length, "les tentatives perdantes doivent être refusées").toBe(2);
      for (const r of refus) {
        expect(r.error, "le refus doit être un message métier, pas une fuite technique").not.toMatch(
          /duplicate key|violates|23505|constraint/i
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // LOT 4 — ISOLATION RLS SUR LE CHEMIN D'ÉCRITURE
  //
  // La recette SQL prouvait déjà l'isolation en lecture et en écriture directe.
  // Ce qui n'était pas prouvé : que l'APPLICATION ne la contourne pas — par un
  // `service_role` mal placé, un org_id deviné, ou une action sans garde.
  // -------------------------------------------------------------------------
  describe("Lot 4 — isolation entre organisations, vue de l'application", () => {
    it("un tiers ne voit aucune salle de l'organisation d'en face", async () => {
      const db = await clientDirect(JWT_TIERS);
      const { data } = await db.from("salles").select("nom").ilike("nom", "RECETTE %");
      const fuites = (data ?? []).filter((s: { nom: string }) => s.nom !== "RECETTE A21");
      expect(fuites, `fuite inter-organisation : ${JSON.stringify(fuites)}`).toHaveLength(0);
    });

    it("l'APPLICATION ne permet pas à un tiers de modifier une salle d'en face", async () => {
      const admin = await clientDirect(JWT_ADMIN);
      const { data: cible } = await admin
        .from("salles")
        .select("id, capacite")
        .eq("nom", "RECETTE AMPHI")
        .single();

      // Le passage par la Server Action est le cœur du contrôle : une action qui
      // utiliserait `service_role`, ou qui ferait confiance à un identifiant reçu
      // du client, contournerait la RLS sans que la recette SQL le voie jamais.
      devenir(JWT_TIERS, UID_TIERS);
      const { updateSalle } = await import("@/app/actions/salles");
      await updateSalle(
        cible!.id,
        form({ nom: "PIRATÉ", capacite: "1", etudiants: "0", nb_surveillants: "0" })
      );

      const { data: apres } = await admin
        .from("salles")
        .select("nom, capacite")
        .eq("id", cible!.id)
        .single();
      expect(apres!.capacite, "écriture inter-organisation passée par l'application").toBe(cible!.capacite);
      expect(apres!.nom, "le nom a été écrasé par un tiers").toBe("RECETTE AMPHI");
    });

    it("une salle créée par l'application porte l'org de son auteur, pas une autre", async () => {
      devenir(JWT_ADMIN, UID_ADMIN);
      const { createSalle } = await import("@/app/actions/salles");
      await createSalle(form({ nom: `${marque} ORG`, capacite: "10", etudiants: "5", nb_surveillants: "1" }));

      const admin = await clientDirect(JWT_ADMIN);
      const { data: creee } = await admin.from("salles").select("org_id").eq("nom", `${marque} ORG`).single();
      const { data: moi } = await admin.from("organization_members").select("org_id").limit(1).single();
      expect(creee!.org_id).toBe(moi!.org_id);

      const tiers = await clientDirect(JWT_TIERS);
      const { data: vueTiers } = await tiers.from("salles").select("id").eq("nom", `${marque} ORG`);
      expect(vueTiers ?? [], "le tiers ne doit pas voir la salle créée en face").toHaveLength(0);
    });
  });
});
