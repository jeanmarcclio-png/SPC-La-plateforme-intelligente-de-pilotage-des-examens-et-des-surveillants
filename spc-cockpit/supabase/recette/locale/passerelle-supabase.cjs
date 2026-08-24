#!/usr/bin/env node
/**
 * Passerelle Supabase pour la recette locale.
 *
 * POURQUOI ELLE EXISTE
 * --------------------
 * `supabase-js` ne parle pas à PostgreSQL. Il parle à une API HTTP et préfixe
 * ses appels : `<url>/rest/v1/<table>` pour les données, `<url>/auth/v1/...`
 * pour l'identité. PostgREST, lui, sert les tables à la racine et ne connaît
 * rien à l'identité.
 *
 * Cette passerelle comble exactement cet écart, et rien de plus :
 *
 *   /rest/v1/*  →  PostgREST (en-tête Authorization transmis tel quel)
 *   /auth/v1/user → la fiche du compte porté par le jeton
 *
 * CE QU'ELLE NE SIMULE PAS, ET POURQUOI CE N'EST PAS UN TROU
 * ---------------------------------------------------------
 * Elle ne rejoue pas GoTrue : pas d'inscription, pas de mot de passe, pas de
 * rafraîchissement de jeton. Ce n'est pas ce que la recette cherche à prouver.
 * Le point qui bloquait le verdict est la PERSISTANCE — est-ce que le code de
 * l'application écrit correctement à travers `supabase-js`, et est-ce que la
 * RLS tient sur ce chemin. Or ce chemin-là est intégralement réel ici : vrai
 * HTTP, vrai PostgREST, vrai PostgreSQL, vraies policies, vrai JWT vérifié par
 * signature. Rien n'est bouchonné entre l'action serveur et la table.
 *
 * Le jeton est vérifié par PostgREST lui-même : une signature invalide est
 * refusée en 401 avant d'atteindre la base. La passerelle ne décide de rien.
 *
 * Usage : node passerelle-supabase.cjs [port_ecoute] [port_postgrest]
 */
const http = require("http");

const PORT = Number(process.argv[2] || 3001);
const PGRST = Number(process.argv[3] || 3002);

/** Décode la charge utile d'un JWT sans la vérifier — PostgREST fait foi. */
function claims(req) {
  const brut = req.headers["authorization"] || "";
  const jeton = brut.replace(/^Bearer\s+/i, "");
  const part = jeton.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const serveur = http.createServer((req, res) => {
  const url = req.url || "/";

  // --- Identité -----------------------------------------------------------
  // `getUser()` n'a besoin que de l'identifiant : c'est lui que les Server
  // Actions passent ensuite à `getCurrentRole()` et aux policies via auth.uid().
  if (url.startsWith("/auth/v1/user")) {
    const c = claims(req);
    res.writeHead(c ? 200 : 401, { "content-type": "application/json" });
    return res.end(
      JSON.stringify(
        c
          ? {
              id: c.sub,
              aud: "authenticated",
              role: c.role || "authenticated",
              email: `${c.sub}@recette.spc.test`,
              app_metadata: {},
              user_metadata: {},
              created_at: new Date(0).toISOString(),
            }
          : { message: "jeton absent ou illisible" }
      )
    );
  }

  // --- Données ------------------------------------------------------------
  if (url.startsWith("/rest/v1/")) {
    const cible = url.slice("/rest/v1".length) || "/";
    const amont = http.request(
      { host: "127.0.0.1", port: PGRST, path: cible, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${PGRST}` } },
      (r) => {
        res.writeHead(r.statusCode || 502, r.headers);
        r.pipe(res);
      }
    );
    amont.on("error", (e) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: `PostgREST injoignable : ${e.message}` }));
    });
    return req.pipe(amont);
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ message: `hors périmètre de la passerelle : ${url}` }));
});

serveur.listen(PORT, "127.0.0.1", () => {
  console.log(`passerelle Supabase : http://127.0.0.1:${PORT}  →  PostgREST :${PGRST}`);
});
