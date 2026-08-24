-- SPC — Organisation réelle et premier administrateur.
--
-- À jouer APRÈS `mise-en-place.sh` et APRÈS avoir créé le compte dans
-- Supabase → Authentication → Users.
--
-- USAGE
--   psql "$URL" -v org="Nom de votre établissement" \
--               -v email="vous@exemple.fr" \
--               -f 01_organisation-reelle.sql
--
-- Idempotent. Ne supprime rien.
--
--
-- POURQUOI CE FICHIER EST NÉCESSAIRE, ET PAS UN CONFORT
-- ----------------------------------------------------
-- Deux mécanismes du produit ne s'activent QUE si `org_id` est renseigné, et
-- pointe sur la BONNE organisation :
--
--   1. Toutes les policies RLS passent par `spc_member_of(org_id)`. Avec un
--      `org_id` nul ou étranger, l'égalité n'est jamais vraie : un utilisateur
--      authentifié lit ZÉRO ligne. L'application affiche alors des écrans vides
--      qui ressemblent à un produit cassé, alors que c'est le rattachement qui
--      manque.
--
--   2. Les index d'unicité des migrations 31 et 34 sont PARTIELS
--      (`where org_id is not null`). Sans organisation, ils existent sans rien
--      contraindre — les doublons de salles et de surveillants repassent.
--
-- LE PIÈGE QUE CE FICHIER DÉSAMORCE
-- ---------------------------------
-- La migration 28 pose une VALEUR PAR DÉFAUT sur `org_id` de chaque table
-- métier, en choisissant « la vraie organisation » parmi celles qui existent au
-- moment où elle passe. Sur une instance neuve, les seules organisations sont
-- les deux fictives créées par la migration 11 (« SPC — Organisation A/B
-- (démo) »). Le défaut pointe donc sur une organisation de DÉMONSTRATION, et
-- toute insertion ultérieure y atterrit sans rien dire.
--
-- Rien ne le signale : les écritures réussissent, et les lectures ne renvoient
-- rien puisque l'administrateur n'est pas membre de l'organisation de démo. Ce
-- script repointe les défauts sur l'organisation réelle.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Les paramètres passent par des réglages de session, et non directement par
-- les variables psql.
--
-- RAISON, et elle est piégeuse : psql n'interpole PAS ses variables à
-- l'intérieur d'un bloc `$$ … $$`, qu'il traite comme une chaîne littérale.
-- Un `:'org'` écrit dans un `do $$ … $$` arriverait tel quel au serveur —
-- les gardes seraient inertes et le script paraîtrait fonctionner.
-- `set_config` est évalué ici, hors du dollar-quoting, et les blocs le
-- relisent par `current_setting`.
-- ---------------------------------------------------------------------------
select set_config('spc.org',   btrim(:'org'),   false) as organisation,
       set_config('spc.email', btrim(:'email'), false) as courriel;

begin;

-- ---------------------------------------------------------------------------
-- 0. Garde : des paramètres vides produiraient une organisation « » rattachée
--    à personne, et le script paraîtrait avoir fonctionné.
-- ---------------------------------------------------------------------------
do $$
begin
  if coalesce(current_setting('spc.org', true), '') = '' then
    raise exception 'Paramètre -v org manquant ou vide. Exemple : -v org="ESSEC Business School"';
  end if;
  if coalesce(current_setting('spc.email', true), '') = '' then
    raise exception 'Paramètre -v email manquant ou vide. Exemple : -v email="jean@essec.fr"';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. L'organisation réelle.
-- ---------------------------------------------------------------------------
insert into organizations (nom)
select btrim(:'org')
 where not exists (select 1 from organizations where nom = btrim(:'org'));

-- ---------------------------------------------------------------------------
-- 2. Repointage des valeurs par défaut — le désamorçage décrit en tête.
--
--    La liste des tables est celle de la migration 28. Si une table métier est
--    ajoutée plus tard, elle doit être ajoutée ici AUSSI, sinon ses insertions
--    repartiront vers l'organisation de démonstration.
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid;
  t text;
  tables_metier text[] := array[
    'missions','devis','devis_lignes','devis_equipe','devis_salles',
    'salles','surveillants','affectations','amenagements','factures',
    'incidents','journal_sessions'
  ];
begin
  select id into v_org from organizations where nom = current_setting('spc.org');

  foreach t in array tables_metier loop
    -- La table peut ne pas exister sur un schéma partiel : on ignore plutôt que
    -- d'interrompre, et le constat final dira ce qui a été traité.
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I alter column org_id set default %L', t, v_org);
      -- Backfill des lignes orphelines : invisibles sous RLS tant qu'elles
      -- n'appartiennent à personne.
      execute format('update %I set org_id = %L where org_id is null', t, v_org);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Rattachement du compte, en administrateur.
--
--    On vise le compte PAR SON ADRESSE, jamais « le seul compte trouvé » :
--    sur une instance où plusieurs personnes se sont déjà inscrites, choisir à
--    la place de l'exploitant donnerait les droits d'administration au hasard.
-- ---------------------------------------------------------------------------
do $$
declare v_org uuid; v_user uuid;
begin
  select id into v_org from organizations where nom = current_setting('spc.org');
  select id into v_user from auth.users where lower(email) = lower(current_setting('spc.email'));

  if v_user is null then
    raise exception E'Aucun compte « % » dans auth.users.\n'
      '  Le créer d''abord : Supabase → Authentication → Users → Add user,\n'
      '  en cochant « Auto Confirm User » (sinon la connexion est refusée tant\n'
      '  que le courriel de confirmation n''est pas validé).', current_setting('spc.email');
  end if;

  insert into organization_members (org_id, user_id, role)
  values (v_org, v_user, 'administrateur')
  on conflict (org_id, user_id) do update set role = 'administrateur';
end $$;

commit;

-- ---------------------------------------------------------------------------
-- 4. Constat — ce qui suit doit être lu, pas survolé.
-- ---------------------------------------------------------------------------
select bloc, libelle, attendu, observe from (

  select 1 as ordre, 1 as sous, 'ORGANISATION' as bloc,
         'organisation réelle' as libelle,
         btrim(:'org') as attendu,
         coalesce((select nom from organizations where nom = btrim(:'org')), '❌ ABSENTE') as observe

  union all
  select 1, 2, 'ORGANISATION', 'administrateur rattaché', btrim(:'email'),
         coalesce((select u.email || ' — ' || m.role
                     from organization_members m
                     join auth.users u on u.id = m.user_id
                     join organizations o on o.id = m.org_id
                    where o.nom = btrim(:'org')
                      and lower(u.email) = lower(btrim(:'email'))), '❌ NON RATTACHÉ')

  union all
  -- Le contrôle décisif : sur quelle organisation pointe le défaut ?
  select 2, 1, 'DÉFAUT', 'organisation par défaut de salles.org_id',
         btrim(:'org') || ' (surtout pas une organisation de démonstration)',
         coalesce((select o.nom
                     from pg_attrdef ad
                     join pg_class c on c.oid = ad.adrelid and c.relname = 'salles'
                     join pg_attribute a on a.attrelid = c.oid and a.attnum = ad.adnum
                                        and a.attname = 'org_id'
                     join organizations o
                       on o.id::text = btrim(split_part(pg_get_expr(ad.adbin, ad.adrelid), '''', 2))
                    limit 1), '❌ AUCUN DÉFAUT')

  union all
  select 3, 1, 'DONNÉES', 'lignes sans organisation (invisibles sous RLS)', '0',
         (coalesce((select count(*) from salles       where org_id is null), 0)
        + coalesce((select count(*) from surveillants where org_id is null), 0)
        + coalesce((select count(*) from missions     where org_id is null), 0))::text

  union all
  -- La migration 04 sème 5 salles de démonstration. Sur une instance neuve elles
  -- atterrissent dans une organisation de DÉMO : l'administrateur ne les voit
  -- pas (RLS) et ne peut donc pas les supprimer depuis l'application, alors
  -- qu'elles occupent la base. Ligne dédiée, parce qu'un « 5 salle(s) » noyé
  -- dans la ligne DÉMO ci-dessous se survole trop facilement.
  select 3, 2, 'DONNÉES', 'salles de démonstration hors de votre organisation',
         '0 — sinon elles sont en base sans être visibles ni supprimables',
         (select count(*)::text from salles s
            join organizations o on o.id = s.org_id
           where o.nom ilike '%demo%' or o.nom ilike '%démo%')

  union all
  -- Les organisations de démonstration de la migration 11. On ne les supprime
  -- pas : c'est un geste d'exploitation, à poser en connaissance de cause.
  select 4, 1, 'DÉMO', 'organisations de démonstration résiduelles',
         'supprimables si vides — voir la note ci-dessous',
         coalesce((select string_agg(o.nom || ' (' ||
                    (select count(*) from salles s where s.org_id = o.id)::text || ' salle(s), ' ||
                    (select count(*) from organization_members m where m.org_id = o.id)::text || ' membre(s))',
                    ' · ' order by o.nom)
                     from organizations o
                    where o.nom ilike '%demo%' or o.nom ilike '%démo%'), '(aucune)')

) x order by ordre, sous;

-- ---------------------------------------------------------------------------
-- ET MAINTENANT LE JEU DE DÉMONSTRATION
--
-- Si le constat ci-dessus montre des salles de démonstration, elles ne sont que
-- la partie visible : une instance neuve embarque aussi des missions, des
-- surveillants, des devis, des factures et des affectations fictifs.
--
-- Ce script ne les touche pas — effacer des données est un geste d'exploitation,
-- pas un effet de bord d'une mise en place. Le retrait a son propre script, qui
-- ne supprime rien tant qu'on ne le lui demande pas explicitement :
--
--   psql "$URL" -f 02_menage-demonstration.sql                 -- constat seul
--   psql "$URL" -v confirme=oui -f 02_menage-demonstration.sql -- supprime
--
-- Pour au contraire RÉCUPÉRER les salles de démonstration comme point de départ
-- (prise en main seulement — ce sont des salles fictives) :
--
--   update salles s set org_id = (select id from organizations where nom = :'org')
--     from organizations o
--    where o.id = s.org_id and (o.nom ilike '%demo%' or o.nom ilike '%démo%');
--
-- Rejouer ce script ensuite : le constat doit afficher 0 salle de démonstration.
-- ---------------------------------------------------------------------------
