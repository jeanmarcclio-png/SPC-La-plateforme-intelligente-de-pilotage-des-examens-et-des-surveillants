#!/usr/bin/env bash
#
# MISE EN PLACE — applique le schéma SPC sur une instance Supabase.
#
# CE SCRIPT NE DÉTRUIT RIEN.
# --------------------------
# Il ne fait aucun `drop`, aucun `truncate`, aucun `delete`. C'est la différence
# essentielle avec `supabase/recette/locale/recette-locale.sh`, qui RECRÉE sa
# base à chaque passage : ce dernier ne doit jamais viser une instance réelle.
#
# Les 34 migrations sont rejouables — toutes leurs créations sont gardées par
# `if not exists`. Le script les applique donc TOUTES à chaque passage, plutôt
# que de sauter celles qu'un journal dirait déjà passées : un journal peut
# ignorer une migration appliquée à la main depuis le tableau de bord, et sauter
# à tort laisse un schéma incomplet qu'on ne découvre qu'en production.
#
# Il tient tout de même un journal (`spc_migrations`) pour deux choses qu'on ne
# peut pas déduire du schéma : QUAND chaque migration est passée, et si un
# fichier a été MODIFIÉ APRÈS avoir été appliqué — cas silencieux et coûteux,
# puisque la base ne porte alors plus ce que dit le dépôt.
#
# USAGE
#   ./mise-en-place.sh --url "postgresql://postgres:MDP@db.xxxx.supabase.co:5432/postgres"
#   ./mise-en-place.sh --url "..." --oui        # sans confirmation (CI)
#
# OÙ TROUVER L'URL
#   Tableau de bord Supabase → Project Settings → Database → Connection string
#   → onglet URI. Prendre la connexion DIRECTE (port 5432), pas le pooler :
#   le pooler en mode transaction refuse certaines instructions DDL.
#
set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$(cd "$ICI/../migrations" && pwd)"

URL=""
SANS_CONFIRMATION=0

while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="${2:-}"; shift 2 ;;
    --oui) SANS_CONFIRMATION=1; shift ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $1" >&2; exit 2 ;;
  esac
done

if [ -z "$URL" ]; then
  echo "✘ Il manque --url." >&2
  echo "  Tableau de bord Supabase → Project Settings → Database → Connection string → URI" >&2
  echo "  Prendre la connexion DIRECTE (port 5432), pas le pooler." >&2
  exit 2
fi

psqlq() { psql -v ON_ERROR_STOP=1 -q -X "$URL" "$@"; }
psqlt() { psql -tAX "$URL" "$@"; }

# ---------------------------------------------------------------------------
# 1. Contrôles préalables.
#
#    Chacun protège contre une erreur qui ne se voit qu'après coup.
# ---------------------------------------------------------------------------
echo "▶ 1/4  Contrôles préalables"

if ! psqlt -c "select 1" >/dev/null 2>&1; then
  echo "✘ Connexion impossible. Vérifier l'URL, le mot de passe, et que votre IP"
  echo "  est autorisée (Supabase → Settings → Database → Network Restrictions)."
  exit 1
fi

CIBLE="$(psqlt -c "select current_database() || ' @ ' || coalesce(inet_server_addr()::text, 'local')")"
echo "  cible : $CIBLE"

# Instance Supabase ? Les policies RLS de ce schéma appellent `auth.uid()`, qui
# n'existe que sur Supabase. Sur un PostgreSQL nu, les migrations passeraient et
# les policies seraient inertes : une base qui a l'air correcte et ne protège
# rien. Mieux vaut refuser franchement.
if [ "$(psqlt -c "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'uid'")" = "0" ]; then
  echo "✘ Ce n'est pas une instance Supabase : la fonction auth.uid() est absente."
  echo "  Toutes les policies RLS en dépendent. Les appliquer ici donnerait une base"
  echo "  d'apparence correcte mais SANS AUCUNE isolation. Refus."
  exit 1
fi
echo "  ✔ instance Supabase (auth.uid présent)"

# Base déjà peuplée ? On n'interdit pas — une mise à jour de schéma est légitime —
# mais on le DIT, parce que la confirmation n'a pas le même sens.
DEJA=$(psqlt -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('missions','salles','surveillants')")
if [ "$DEJA" != "0" ]; then
  LIGNES=$(psqlt -c "select coalesce((select count(*) from missions),0) + coalesce((select count(*) from salles),0) + coalesce((select count(*) from surveillants),0)" 2>/dev/null || echo 0)
  echo "  ⚠ schéma déjà présent — $LIGNES ligne(s) métier. Mise à jour, pas installation neuve."
fi

if [ "$SANS_CONFIRMATION" != "1" ]; then
  echo
  echo "  Le script va appliquer $(ls "$MIGRATIONS"/*.sql | wc -l | tr -d ' ') migrations sur CETTE base."
  echo "  Aucune donnée ne sera supprimée."
  printf "  Taper « oui » pour continuer : "
  read -r reponse
  [ "$reponse" = "oui" ] || { echo "  Annulé."; exit 1; }
fi

# ---------------------------------------------------------------------------
# 2. Journal des migrations.
# ---------------------------------------------------------------------------
echo "▶ 2/4  Journal des migrations"
psqlq <<'SQL'
create table if not exists spc_migrations (
  fichier    text primary key,
  empreinte  text not null,
  applique_le timestamptz not null default now()
);
comment on table spc_migrations is
  'Journal des migrations appliquées par supabase/mise-en-place/mise-en-place.sh. '
  'Ne pilote PAS l''application (les migrations sont rejouables et toutes rejouées) : '
  'sert à dater les passages et à détecter un fichier modifié après coup.';
SQL
echo "  ✔ table spc_migrations prête"

# ---------------------------------------------------------------------------
# 3. Les migrations, dans l'ordre.
#
#    L'ORDRE NE PEUT PAS ÊTRE CELUI DE `sort -V` : il classe `11b` AVANT `11`,
#    or `11b_org-id-completion` complète ce que `11_org-isolation` crée. Le tri
#    se fait sur le numéro en tant qu'entier, puis sur le suffixe.
#    (Même logique que la recette locale — si l'une change, changer l'autre.)
# ---------------------------------------------------------------------------
echo "▶ 3/4  Migrations"
ordre=$(
  ls "$MIGRATIONS"/*.sql | xargs -n1 basename | awk '
    {
      prefixe = $0; sub(/_.*/, "", prefixe)
      numero  = prefixe + 0
      suffixe = prefixe; gsub(/[0-9]/, "", suffixe)
      printf "%03d%s\t%s\n", numero, (suffixe == "" ? "0" : suffixe), $0
    }' | LC_ALL=C sort | cut -f2
)
total=$(echo "$ordre" | wc -w | tr -d ' ')
n=0
modifiees=""
for f in $ordre; do
  n=$((n + 1))
  empreinte=$(sha256sum "$MIGRATIONS/$f" | cut -c1-16)
  ancienne=$(psqlt -c "select empreinte from spc_migrations where fichier = '$f'")
  if [ -n "$ancienne" ] && [ "$ancienne" != "$empreinte" ]; then
    modifiees="$modifiees $f"
  fi
  printf '  %2d/%s  %s' "$n" "$total" "$f"
  if ! psqlq -f "$MIGRATIONS/$f" 2>/tmp/spc-mig-err; then
    echo "   ✘"
    echo
    echo "✘ Échec sur $f :"
    sed 's/^/    /' /tmp/spc-mig-err
    echo
    echo "  Les migrations précédentes restent appliquées — elles sont rejouables,"
    echo "  relancer le script après correction ne pose pas de problème."
    exit 1
  fi
  psqlq -c "insert into spc_migrations (fichier, empreinte) values ('$f', '$empreinte')
            on conflict (fichier) do update set empreinte = excluded.empreinte, applique_le = now();"
  echo "   ✔"
done

if [ -n "$modifiees" ]; then
  echo
  echo "  ⚠ Fichier(s) MODIFIÉ(S) depuis la dernière application :$modifiees"
  echo "    La base portait une version antérieure. Elle vient d'être realignée,"
  echo "    mais vérifier que la modification était bien prévue."
fi

# ---------------------------------------------------------------------------
# 4. Constat.
# ---------------------------------------------------------------------------
echo "▶ 4/4  Constat"
psql -X -P pager=off "$URL" <<'SQL'
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE')          as tables,
  (select count(*) from pg_policy)                                        as policies,
  (select count(*) from organizations)                                    as organisations,
  (select count(*) from organization_members)                             as membres,
  (select count(*) from auth.users)                                       as comptes;
SQL

echo
echo "✔ Schéma en place."
echo
echo "  IL RESTE DEUX GESTES, sans lesquels l'application affichera des écrans vides :"
echo
echo "   1. Créer le premier compte  →  Supabase → Authentication → Users → Add user"
echo "   2. Créer l'organisation réelle et y rattacher ce compte :"
echo
echo "      psql \"\$URL\" -v org=\"Nom de votre établissement\" \\"
echo "                   -v email=\"vous@exemple.fr\" \\"
echo "                   -f supabase/mise-en-place/01_organisation-reelle.sql"
echo
echo "  Procédure détaillée : supabase/mise-en-place/PREMIER-COMPTE.md"
