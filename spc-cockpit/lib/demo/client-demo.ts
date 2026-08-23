// Client Supabase de DÉMONSTRATION — actif uniquement sous SPC_DEMO=1.
//
// POURQUOI CE MODULE EXISTE
// -------------------------
// `lib/operations/queries.ts` sait déjà servir un jeu fictif sans toucher à la
// base (cf. `source()`), mais TROIS portes d'authentification construisaient un
// client Supabase avant tout test de mode :
//   · proxy.ts                → redirection vers /login faute de session ;
//   · lib/auth/org.ts         → requireActiveOrgId() → /onboarding ;
//   · lib/auth/session.ts     → getCurrentUser() / getCurrentRole().
// Sans variables d'environnement, `createServerClient` lève, et l'écran rendait
// une 500. Une démonstration ne pouvait donc pas tourner seule.
//
// LE CHOIX RETENU
// ---------------
// Plutôt que de semer des `if (demoActif())` dans les 33 fichiers qui appellent
// `createClient()`, on substitue le client au POINT D'ENTRÉE UNIQUE. Les gardes
// d'authentification continuent de s'exécuter telles quelles et obtiennent des
// réponses cohérentes. Aucune ligne de `org.ts` ni de `session.ts` n'a changé.
//
// LES DEUX INVARIANTS
// -------------------
// 1. AUCUN accès réseau. Rien n'est jamais émis vers un serveur.
// 2. AUCUNE écriture silencieuse. `insert` / `update` / `upsert` / `delete` /
//    `rpc` retournent une ERREUR explicite, jamais un succès simulé. Une démo
//    qui laisse croire qu'un enregistrement a eu lieu est un mensonge coûteux :
//    c'est le vice que l'audit a corrigé sous BUG-002, on ne le réintroduit pas
//    par la porte de la démonstration.

import {
  DEMO_ORG_ID,
  DEMO_ORG_NOM,
  DEMO_ORG_SLUG,
  DEMO_USER_ID,
  DEMO_ROLE,
  DEMO_MESSAGE_ECRITURE,
  utilisateurDemo,
  sessionDemo,
} from "./identite";

type ErreurDemo = { message: string; details: string; hint: string; code: string };

type ResultatDemo = {
  data: unknown;
  error: ErreurDemo | null;
  count: number | null;
  status: number;
  statusText: string;
};

function lecture(data: unknown): ResultatDemo {
  return { data, error: null, count: Array.isArray(data) ? data.length : null, status: 200, statusText: "OK" };
}

function refusEcriture(): ResultatDemo {
  return {
    data: null,
    error: { message: DEMO_MESSAGE_ECRITURE, details: "", hint: "", code: "SPC_DEMO" },
    count: null,
    status: 403,
    statusText: "Forbidden",
  };
}

/**
 * Lignes servies par table.
 *
 * Seules les tables d'APPARTENANCE sont peuplées : ce sont les seules dont les
 * gardes d'authentification ont besoin pour laisser passer le visiteur. Tout le
 * reste retourne un tableau vide — car en mode démonstration ces lectures-là
 * passent par `source()`, qui sert le jeu fictif sans jamais venir jusqu'ici.
 * Une table inconnue rend donc un écran VIDE, jamais une erreur : c'est la
 * dégradation qu'on veut devant un prospect.
 */
function lignes(table: string): unknown[] {
  switch (table) {
    case "organization_members":
      return [
        {
          org_id: DEMO_ORG_ID,
          user_id: DEMO_USER_ID,
          role: DEMO_ROLE,
          organizations: { nom: DEMO_ORG_NOM, slug: DEMO_ORG_SLUG },
        },
      ];
    case "organizations":
      return [{ id: DEMO_ORG_ID, nom: DEMO_ORG_NOM, slug: DEMO_ORG_SLUG }];
    default:
      return [];
  }
}

/** Méthodes qui font basculer la chaîne en écriture. */
const ECRITURES = new Set(["insert", "update", "upsert", "delete"]);
/** Méthodes qui réduisent le résultat à une ligne unique. */
const UNITAIRES = new Set(["single", "maybeSingle"]);

/**
 * Chaîne de requête PostgREST simulée.
 *
 * Un `Proxy` plutôt qu'une liste explicite de méthodes : le constructeur de
 * requêtes de supabase-js en compte plusieurs dizaines (`eq`, `ilike`, `in`,
 * `contains`, `order`, `range`, `overlaps`, `textSearch`…) et s'enrichit à
 * chaque version. Une liste écrite à la main finirait par en oublier une, et un
 * `TypeError: x.overlaps is not a function` en pleine démonstration coûte plus
 * cher que l'indirection d'un Proxy. Ici, TOUTE méthode inconnue se comporte en
 * filtre neutre — la dégradation par défaut est sûre.
 */
function chaine(resultat: ResultatDemo): unknown {
  const promesse = Promise.resolve(resultat);
  const socle: Record<string, unknown> = {
    then: promesse.then.bind(promesse),
    catch: promesse.catch.bind(promesse),
    finally: promesse.finally.bind(promesse),
  };

  return new Proxy(socle, {
    get(cible, propriete) {
      // Les symboles (Symbol.toPrimitive, Symbol.iterator…) doivent rester
      // absents : renvoyer une fonction ferait croire l'objet itérable.
      if (typeof propriete === "symbol") return undefined;
      if (propriete in cible) return cible[propriete];

      if (ECRITURES.has(propriete)) return () => chaine(refusEcriture());
      if (UNITAIRES.has(propriete)) {
        const premiere = Array.isArray(resultat.data) ? (resultat.data[0] ?? null) : resultat.data;
        return () => chaine({ ...resultat, data: premiere, count: null });
      }
      // `select`, `eq`, `order`, `limit`, et tout le reste : filtre neutre.
      return () => chaine(resultat);
    },
  });
}

/**
 * Client de démonstration. Sa forme est celle de `SupabaseClient` pour les
 * usages présents dans ce dépôt ; la conversion de type est faite par
 * `lib/supabase/server.ts`, seul endroit autorisé à l'instancier.
 */
export function clientDemo() {
  return {
    from(table: string) {
      return chaine(lecture(lignes(table)));
    },

    // Les procédures stockées (spc_create_organization, confirmation
    // d'affectation…) sont toutes des écritures : refus explicite.
    rpc(..._args: unknown[]) {
      void _args;
      return chaine(refusEcriture());
    },

    // Temps réel : `RealtimeRefresh` s'abonne aux changements de tables pour
    // rafraîchir l'écran. Sans base il n'y a rien à écouter, mais le composant
    // doit pouvoir s'abonner et se désabonner sans lever — sinon c'est tout
    // l'écran qui tombe (c'est précisément ce qui faisait échouer /operations/
    // planification en 500).
    channel(_nom: string) {
      void _nom;
      const canal: Record<string, unknown> = {};
      canal.on = () => canal;
      canal.subscribe = () => canal;
      canal.unsubscribe = () => Promise.resolve("ok");
      return canal;
    },
    removeChannel(_canal: unknown) {
      void _canal;
      return Promise.resolve("ok");
    },
    removeAllChannels() {
      return Promise.resolve([]);
    },

    auth: {
      async getUser() {
        return { data: { user: utilisateurDemo() }, error: null };
      },
      async getSession() {
        return { data: { session: sessionDemo() }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: { message: DEMO_MESSAGE_ECRITURE, code: "SPC_DEMO" } };
      },
      async signInWithOtp() {
        return { data: { user: null, session: null }, error: { message: DEMO_MESSAGE_ECRITURE, code: "SPC_DEMO" } };
      },
    },
  };
}
