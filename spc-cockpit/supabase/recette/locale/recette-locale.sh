#!/usr/bin/env bash
#
# SPC Opérations — Recette locale, rejouable, sur PostgreSQL nu.
#
# POURQUOI
# --------
# La recette de `tests/RECETTE-SUPABASE.md` se jouait à la main, dans le SQL
# Editor d'une instance hébergée, en sept lots copiés-collés. Elle n'était donc
# ni rejouable ni exécutable en intégration continue, et ses verdicts se
# périmaient à chaque commit touchant une migration.
#
# Ce script rejoue la même recette de bout en bout, sur un PostgreSQL local,
# en une commande. Il monte la couche de compatibilité Supabase, applique
# TOUTES les migrations DANS L'ORDRE, crée les comptes, pose le jeu d'audit,
# rattache l'organisation et exécute les sondes d'unicité.
#
# CE QU'IL NE COUVRE PAS
# ----------------------
# Tout ce qui passe par HTTP : écritures via supabase-js, session de connexion
# réelle. Il n'y a ici ni PostgREST ni GoTrue. Ces scénarios restent marqués
# 🔍 NON VÉRIFIÉ dans `tests/RECETTE-SUPABASE.md` — ce script ne les blanchit
# pas et ne prétend pas le faire.
#
# USAGE
#   ./recette-locale.sh                 # recette complète, base recréée
#   PGPORT=5432 ./recette-locale.sh     # sur une autre instance
#
# Démarrer un PostgreSQL local au préalable, par exemple :
#   initdb -D "$PGDATA" -U postgres --auth=trust
#   pg_ctl -D "$PGDATA" -o "-p 55432 -k /tmp" start
#
# NE JAMAIS pointer ce script sur une base de production : il commence par un
# `drop database`.

set -euo pipefail

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECETTE="$(dirname "$ICI")"
MIGRATIONS="$(dirname "$RECETTE")/migrations"

export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"
BASE="${BASE:-spc_recette_locale}"

# Compte de recette. L'UUID est fixe : les contrôles RLS s'y réfèrent, et un
# identifiant stable rend le diagnostic lisible d'un passage à l'autre.
UID_ADMIN="${UID_ADMIN:-11111111-1111-1111-1111-111111111111}"
UID_TIERS="${UID_TIERS:-22222222-2222-2222-2222-222222222222}"

psql_base() { psql -v ON_ERROR_STOP=1 -q -d "$BASE" "$@"; }

echo "▶ Recette locale SPC — $PGHOST:$PGPORT/$BASE"

# ---------------------------------------------------------------------------
# 1. Base neuve.
#
#    Recréée à chaque passage, et non nettoyée : un nettoyage laisse toujours
#    quelque chose — un défaut de colonne, une policy, une séquence — et c'est
#    exactement ce genre de reliquat qui fabrique un vert imméritable.
# ---------------------------------------------------------------------------
psql -v ON_ERROR_STOP=1 -q -d postgres \
  -c "drop database if exists $BASE with (force);" \
  -c "create database $BASE;"

# ---------------------------------------------------------------------------
# 2. Couche de compatibilité Supabase, AVANT les migrations.
#
#    `alter default privileges` n'agit que sur les tables créées ensuite : jouer
#    le shim après les migrations laisserait `authenticated` sans aucun droit,
#    et les contrôles d'isolation liraient « 0 ligne » pour la mauvaise raison.
# ---------------------------------------------------------------------------
echo "▶ Couche de compatibilité Supabase (auth.uid, auth.users, rôles, droits)"
psql_base -f "$ICI/00_shim-supabase.sql"

# ---------------------------------------------------------------------------
# 3. Toutes les migrations, dans l'ordre.
#
#    L'ORDRE NE PEUT PAS ÊTRE CELUI DE `sort -V` : il classe `11b` AVANT `11`,
#    or `11b_org-id-completion` complète ce que `11_org-isolation` crée. Le tri
#    se fait donc sur le numéro en tant qu'entier, puis sur le suffixe.
# ---------------------------------------------------------------------------
echo "▶ Migrations"
ordre=$(
  ls "$MIGRATIONS"/*.sql | xargs -n1 basename | awk '
    {
      prefixe = $0; sub(/_.*/, "", prefixe)           # « 11b » pour 11b_org-id-completion.sql
      numero  = prefixe + 0                           # 11
      suffixe = prefixe; gsub(/[0-9]/, "", suffixe)   # « b », ou vide
      # Un suffixe vide doit trier AVANT « b ». Le remplacer par un chiffre y
      # suffit : les chiffres précèdent les lettres en ASCII.
      printf "%03d%s\t%s\n", numero, (suffixe == "" ? "0" : suffixe), $0
    }' | LC_ALL=C sort | cut -f2
)
total=$(echo "$ordre" | wc -w)
n=0
for f in $ordre; do
  n=$((n + 1))
  printf '  %2d/%s  %s\n' "$n" "$total" "$f"
  psql_base -f "$MIGRATIONS/$f"
done

# ---------------------------------------------------------------------------
# 4. Les comptes.
#
#    C'est le point qui bloquait la recette hébergée : sans ligne dans
#    `auth.users`, `02_organisation.sql` ne peut rattacher personne,
#    `spc_member_of` reste faux pour tout le monde, et TOUTES les policies RLS
#    renvoient zéro ligne — ce qui ressemble à un produit cassé alors que c'est
#    le jeu d'essai qui l'est.
#
#    Deux comptes, pas un : l'isolation entre organisations ne se prouve qu'avec
#    un tiers qui n'est membre de rien de ce qu'il tente de lire.
# ---------------------------------------------------------------------------
echo "▶ Comptes de recette"
psql_base <<SQL
insert into auth.users (id, email, raw_user_meta_data) values
  ('$UID_ADMIN', 'admin@recette.spc.test',  '{"nom":"Admin Recette"}'),
  ('$UID_TIERS', 'tiers@recette.spc.test',  '{"nom":"Tiers Recette"}')
on conflict (id) do nothing;
SQL

# ---------------------------------------------------------------------------
# 5. Jeu d'audit, organisation, sondes.
# ---------------------------------------------------------------------------
echo "▶ Jeu d'audit"
psql_base -f "$RECETTE/00_jeu-audit.sql" >/dev/null

# `02_organisation.sql` ne rattache automatiquement que s'il trouve UN SEUL
# compte — refus délibéré de choisir à la place de l'opérateur. Ici il y en a
# deux, et c'est voulu : le rattachement est donc explicite.
echo "▶ Organisation, rattachement, sondes d'unicité"
psql_base -f "$RECETTE/02_organisation.sql" >/dev/null

psql_base <<SQL
insert into organization_members (org_id, user_id, role)
select id, '$UID_ADMIN', 'administrateur' from organizations where nom = 'SPC Recette'
on conflict (org_id, user_id) do update set role = 'administrateur';

-- Le tiers est administrateur de l'AUTRE organisation. Il a donc de vrais
-- droits — simplement pas sur les données de « SPC Recette ». Un tiers sans
-- aucun droit ne prouverait rien : il serait refusé partout, y compris là où
-- l'isolation ne joue pas.
insert into organization_members (org_id, user_id, role)
select id, '$UID_TIERS', 'administrateur' from organizations where nom = 'SPC Recette — Concurrent'
on conflict (org_id, user_id) do update set role = 'administrateur';
SQL

echo
echo "═══ SONDES D'UNICITÉ ═══"
psql -d "$BASE" -P pager=off -c \
  "select ordre, sonde, observe from recette_sondes order by ordre;"

echo "═══ CONTRÔLES SQL (01_controles.sql) ═══"
psql -d "$BASE" -P pager=off -f "$RECETTE/01_controles.sql" 2>&1 | tail -40

echo
echo "═══ RLS, PORTAIL ET CONTRAINTES (04_rls-et-contraintes.sql) ═══"
psql -v ON_ERROR_STOP=1 -d "$BASE" -P pager=off -f "$RECETTE/04_rls-et-contraintes.sql" 2>&1 | tail -25

# ---------------------------------------------------------------------------
# 6. VERDICT.
#
#    Sans cette étape, le script AFFICHE des échecs et sort en 0 : en
#    intégration continue, une sonde rouge passerait inaperçue et la recette ne
#    protégerait rien. Le compte des lignes non vertes décide du code de sortie.
#
#    Seules `recette_sondes` et `recette_rls` sont éligibles : elles portent un
#    attendu binaire. Les lignes de `01_controles.sql` sont des RELEVÉS —
#    « 5 salles non rapprochées » attend un arbitrage humain (M-4), pas un
#    verdict automatique.
# ---------------------------------------------------------------------------
rouges=$(psql -d "$BASE" -tAc "
  select count(*) from (
    select observe from recette_sondes
    union all
    select observe from recette_rls
  ) t where observe not like '✅%';
")

echo
if [ "$rouges" -ne 0 ]; then
  echo "✘ RECETTE EN ÉCHEC — $rouges sonde(s) non conforme(s) :"
  psql -d "$BASE" -P pager=off -c "
    select 'sonde' as bloc, sonde as controle, observe from recette_sondes where observe not like '✅%'
    union all
    select 'rls',   controle,                 observe from recette_rls    where observe not like '✅%';"
  exit 1
fi

echo "✔ Recette locale VERTE — base « $BASE »"
echo "  $(psql -d "$BASE" -tAc 'select count(*) from recette_sondes') sonde(s) d'unicité · $(psql -d "$BASE" -tAc 'select count(*) from recette_rls') contrôle(s) RLS et contraintes"
echo "  admin : $UID_ADMIN (SPC Recette)"
echo "  tiers : $UID_TIERS (SPC Recette — Concurrent)"
