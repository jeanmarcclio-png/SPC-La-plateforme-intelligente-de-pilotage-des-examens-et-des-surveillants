#!/usr/bin/env bash
#
# RECETTE APPLICATIVE — monte une pile Supabase complète et y fait passer les
# vraies Server Actions (lots 1 à 4 du plan de retest).
#
# CE QUE CE SCRIPT MONTE
# ----------------------
#   PostgreSQL  ← les 30 migrations + le shim d'authentification + le jeu d'audit
#   PostgREST   ← l'API que `supabase-js` interroge réellement, JWT vérifié
#   passerelle  ← présente PostgREST sous les chemins /rest/v1 et /auth/v1
#   vitest      ← les Server Actions de `app/actions/`, sans doublure
#
# La recette SQL (`recette-locale.sh`) prouve que LA BASE impose ses règles.
# Celle-ci prouve que L'APPLICATION les respecte — c'est le manque qui tenait
# le verdict de l'audit V2 en NO-GO.
#
# Prérequis : PostgreSQL 16 (serveur), node, npx. PostgREST est téléchargé si
# absent. Aucun Docker requis.
#
set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COCKPIT="$(cd "$ICI/../../.." && pwd)"

PGRST_VERSION="${PGRST_VERSION:-v12.2.3}"
PORT_PGRST="${PORT_PGRST:-3002}"
PORT_PASSERELLE="${PORT_PASSERELLE:-3001}"
SECRET="${SPC_RECETTE_JWT_SECRET:-recette-locale-spc-secret-jwt-de-32-caracteres-minimum}"
BASE="${BASE:-spc_recette_locale}"
PWD_AUTHENTICATOR="${PWD_AUTHENTICATOR:-recettelocale}"

UID_ADMIN="11111111-1111-1111-1111-111111111111"
UID_TIERS="22222222-2222-2222-2222-222222222222"

TRAVAIL="$(mktemp -d)"
PIDS=()

menage() {
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  rm -rf "$TRAVAIL"
}
trap menage EXIT

echo "▶ 1/5  Base de recette (migrations, shim, jeu d'audit)"
# Réutilise intégralement la recette SQL : elle recrée la base, applique les 30
# migrations dans le bon ordre, pose les comptes et vérifie unicité et RLS.
# Un échec ici doit arrêter net : inutile de tester l'application sur une base
# dont on n'a pas prouvé qu'elle impose ses propres règles.
"$ICI/recette-locale.sh" > "$TRAVAIL/sql.log" 2>&1 || {
  echo "✘ La recette SQL a échoué — l'application n'est pas en cause."
  tail -30 "$TRAVAIL/sql.log"
  exit 1
}
echo "  ✔ base « $BASE » prête"

echo "▶ 2/5  Rôle d'authentification PostgREST"
# Mot de passe obligatoire, et non un excès de zèle : un cluster local monté en
# `trust` s'en passe, mais l'image `postgres:16` de la CI impose
# `scram-sha-256` sur TCP (pg_hba). Sans mot de passe, PostgREST est refusé par
# la base — et le job échoue pour une raison qui n'a rien à voir avec le produit.
# Ce secret ne protège rien : le rôle vit dans une base de recette jetable,
# recréée à chaque exécution, et n'existe sur aucune instance réelle.
psql -v ON_ERROR_STOP=1 -q -d "$BASE" -v mdp="$PWD_AUTHENTICATOR" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end $$;
alter role authenticator with login password :'mdp';
grant anon, authenticated, service_role to authenticator;
SQL
echo "  ✔ rôle « authenticator » en place"

echo "▶ 3/5  PostgREST $PGRST_VERSION"
BIN="${PGRST_BIN:-$TRAVAIL/postgrest}"
if [ ! -x "$BIN" ]; then
  URL="https://github.com/PostgREST/postgrest/releases/download/$PGRST_VERSION/postgrest-$PGRST_VERSION-linux-static-x64.tar.xz"
  curl -sSL -o "$TRAVAIL/pgrst.tar.xz" "$URL"
  tar xf "$TRAVAIL/pgrst.tar.xz" -C "$TRAVAIL"
  BIN="$TRAVAIL/postgrest"
  chmod +x "$BIN"
fi

cat > "$TRAVAIL/pgrst.conf" <<CONF
db-uri = "postgres://authenticator:$PWD_AUTHENTICATOR@${PGHOST:-127.0.0.1}:${PGPORT:-5432}/$BASE"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = $PORT_PGRST
server-host = "127.0.0.1"
CONF

"$BIN" "$TRAVAIL/pgrst.conf" > "$TRAVAIL/pgrst.log" 2>&1 &
PIDS+=($!)

for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT_PGRST/" 2>/dev/null; then break; fi
  sleep 0.5
done
curl -sf -o /dev/null "http://127.0.0.1:$PORT_PGRST/" || {
  echo "✘ PostgREST n'a pas démarré"; tail -20 "$TRAVAIL/pgrst.log"; exit 1
}
echo "  ✔ API REST sur :$PORT_PGRST"

echo "▶ 4/5  Passerelle Supabase"
node "$ICI/passerelle-supabase.cjs" "$PORT_PASSERELLE" "$PORT_PGRST" > "$TRAVAIL/passerelle.log" 2>&1 &
PIDS+=($!)
sleep 1
echo "  ✔ passerelle sur :$PORT_PASSERELLE"

# Jetons signés du même secret que PostgREST : c'est LUI qui vérifie la
# signature, la passerelle ne fait que relayer. Un jeton forgé est refusé en 401
# avant d'atteindre la base.
jeton() {
  node -e '
    const c = require("crypto");
    const [sub, secret] = process.argv.slice(1);
    const b = o => Buffer.from(JSON.stringify(o)).toString("base64url");
    const h = b({ alg: "HS256", typ: "JWT" });
    const p = b({ sub, role: "authenticated", exp: Math.floor(Date.now()/1000) + 86400 });
    process.stdout.write(`${h}.${p}.` + c.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url"));
  ' "$1" "$SECRET"
}

echo "▶ 5/5  Lots 1 à 4 — les vraies Server Actions"
cd "$COCKPIT"
SPC_RECETTE_URL="http://127.0.0.1:$PORT_PASSERELLE" \
SPC_RECETTE_JWT_ADMIN="$(jeton "$UID_ADMIN")" \
SPC_RECETTE_JWT_TIERS="$(jeton "$UID_TIERS")" \
  npx vitest run --config "$ICI/vitest.recette.config.ts"

echo
echo "✔ Recette applicative VERTE"
echo "  Le chemin d'écriture est exercé de bout en bout : Server Action →"
echo "  @supabase/ssr → HTTP → PostgREST → RLS → PostgreSQL. Rien n'est simulé"
echo "  entre l'action et la table."
