-- SPC Opérations — Recette : organisation, rattachement, et SONDES d'unicité
--
-- À jouer APRÈS `00_jeu-audit.sql`, dans le SQL Editor d'une instance de RECETTE.
-- JAMAIS en production.
--
-- POURQUOI CE FICHIER EXISTE
-- --------------------------
-- Deux mécanismes du produit ne s'activent QUE si `org_id` est renseigné :
--
--   1. Les index d'unicité de la migration 31 sont PARTIELS
--      (`where org_id is not null`). Sans organisation, ils existent sans rien
--      contraindre : D-2, D-3 et D-4 affichent « présent » et ne prouvent rien.
--
--   2. Toutes les policies RLS passent par
--      `spc_member_of(org_id)` → `... and org_id = target`.
--      Avec `org_id` à NULL cette égalité n'est jamais vraie : un utilisateur
--      authentifié lit ZÉRO ligne. Brancher l'application sur une recette sans
--      organisation donne des écrans vides qui ressemblent à un bug produit
--      alors que c'est le jeu d'essai qui est en cause.
--
-- Ce script crée deux organisations, rattache le jeu de recette à la première,
-- puis SONDE réellement les index : il tente les doublons et rapporte si la base
-- les a refusés. Une sonde qui passe est nettoyée immédiatement — la base reste
-- dans l'état où elle était.
--
-- Idempotent.

begin;

-- ---------------------------------------------------------------------------
-- 1. Deux organisations. La seconde sert au contrôle R-3 : deux organisations
--    doivent pouvoir porter une salle du même nom.
-- ---------------------------------------------------------------------------
insert into organizations (nom)
select 'SPC Recette'
 where not exists (select 1 from organizations where nom = 'SPC Recette');

insert into organizations (nom)
select 'SPC Recette — Concurrent'
 where not exists (select 1 from organizations where nom = 'SPC Recette — Concurrent');

-- ---------------------------------------------------------------------------
-- 1b. Reliquats de sonde d'un passage précédent — AVANT tout rattachement.
--
--     Une sonde acceptée puis interrompue laisse sa ligne en base ; le passage
--     suivant la verrait refusée pour cause de doublon, et afficherait un ✅
--     obtenu par accident. Comparaisons SENSIBLES À LA CASSE : « recette a21 »
--     est une sonde, « RECETTE A21 » est le jeu de recette.
--
--     Ce nettoyage précède le rattachement : déplacer des lignes vers une
--     organisation où traîne encore un reliquat déclencherait l'index d'unicité
--     au milieu du script, hors de tout gestionnaire d'exception.
-- ---------------------------------------------------------------------------
delete from salles where nom = 'recette a21' or nom = 'RECETTE  A21';
delete from surveillants
 where email in ('UN@Recette.SPC.Test', 'sonde-sep@recette.spc.test', 'sonde-intl@recette.spc.test')
    or nom like 'Sonde %';

-- ---------------------------------------------------------------------------
-- 2. Rattachement du jeu de recette à « SPC Recette ».
--
--    Le rattachement des salles ACTIVE l'index salles_org_nom_uniq sur ces
--    lignes : s'il existait un doublon parmi elles, c'est ici que la migration
--    31 échouerait en production. C'est précisément le contrôle M-1.
--
--    LA SALLE TÉMOIN DE R-3 EST EXCLUE. Elle porte le même nom, dans l'autre
--    organisation, exprès. Un filtre sur le seul nom la ramènerait dans « SPC
--    Recette » où le nom existe déjà : violation d'unicité en pleine
--    transaction, hors de tout gestionnaire d'exception — le script s'arrête et
--    aucune sonde ne s'exécute.
-- ---------------------------------------------------------------------------
update salles       s set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and s.nom like 'RECETTE %' and s.org_id is distinct from o.id
   and s.org_id is distinct from (select id from organizations
                                   where nom = 'SPC Recette — Concurrent');

update surveillants v set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and v.email like '%@recette.spc.test' and v.org_id is distinct from o.id;

update missions     m set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and m.reference like 'RECETTE-%' and m.org_id is distinct from o.id;

update devis        d set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and d.reference like 'RECETTE-%' and d.org_id is distinct from o.id;

update affectations a set org_id = m.org_id from missions m
 where m.id = a.mission_id and m.reference like 'RECETTE-%' and a.org_id is distinct from m.org_id;

update devis_salles ds set org_id = d.org_id from devis d
 where d.id = ds.devis_id and d.reference like 'RECETTE-%' and ds.org_id is distinct from d.org_id;

update devis_equipe de set org_id = d.org_id from devis d
 where d.id = de.devis_id and d.reference like 'RECETTE-%' and de.org_id is distinct from d.org_id;

commit;

-- ---------------------------------------------------------------------------
-- 3. Rattachement d'un compte à l'organisation, en administrateur.
--
--    Sans cette ligne, `spc_member_of` reste faux pour tout le monde et
--    l'application lit toujours zéro ligne — le problème simplement déplacé.
-- ---------------------------------------------------------------------------
do $$
declare
  v_org uuid; v_user uuid; v_email text; v_n int;
begin
  select id into v_org from organizations where nom = 'SPC Recette';
  select count(*) into v_n from auth.users;

  if v_n = 0 then
    raise notice E'\n>>> AUCUN COMPTE dans auth.users.\n'
                  '>>> Crée un utilisateur (Authentication → Users → Add user),\n'
                  '>>> puis rejoue ce bloc : sans membre, l''application lira 0 ligne.';
  elsif v_n = 1 then
    select id, email into v_user, v_email from auth.users;
    insert into organization_members (org_id, user_id, role)
    values (v_org, v_user, 'administrateur')
    on conflict (org_id, user_id) do update set role = 'administrateur';
    raise notice '>>> Compte % rattaché à « SPC Recette » en administrateur.', v_email;
  else
    raise notice E'\n>>> % comptes trouvés dans auth.users — je ne choisis pas à ta place.\n'
                  '>>> Rattache le bon :\n'
                  '>>>   insert into organization_members (org_id, user_id, role)\n'
                  '>>>   select ''%'', id, ''administrateur'' from auth.users where email = ''ton@email'';', v_n, v_org;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. SONDES — on tente réellement les doublons.
--
--    Une sonde acceptée par la base est supprimée dans la foulée : elle a déjà
--    livré son information (l'index ne l'a pas arrêtée) et n'a rien à faire
--    dans le jeu de recette.
-- ---------------------------------------------------------------------------
-- Table de résultats VOLONTAIREMENT PERMANENTE, et non temporaire.
--
-- Le SQL Editor de Supabase ouvre une connexion par exécution : une table
-- `temp` disparaît avec elle, et le tableau des sondes serait irrécupérable dès
-- qu'on relance autre chose. Elle est donc réelle, vidée à chaque passage, et
-- supprimable à la main : `drop table recette_sondes;`.
create table if not exists recette_sondes (ordre int, sonde text, attendu text, observe text);
delete from recette_sondes;

-- Le nettoyage des reliquats de sonde a lieu en section 1b, avant tout
-- rattachement — voir l'explication à cet endroit.

-- ARRÊT DUR si les lignes de référence manquent.
--
-- Chaque sonde vise l'organisation de la ligne qu'elle doit heurter. Si cette
-- ligne n'existe pas, l'organisation vaut NULL, l'index partiel ne s'applique
-- pas, et TOUTES les sondes ressortent « acceptées » sans avoir rien testé.
-- Mieux vaut une erreur franche qu'un tableau de faux rouges.
do $$
begin
  if not exists (select 1 from salles where nom = 'RECETTE A21')
     or not exists (select 1 from surveillants where email = 'un@recette.spc.test') then
    raise exception 'Jeu de recette absent : joue d''abord 00_jeu-audit.sql. '
                    'Sans ligne de référence, les sondes seraient toutes « acceptées » '
                    'sans rien avoir testé.';
  end if;
end $$;

-- D-2 : même nom de salle, casse différente.
do $$
declare v_org uuid; v_id integer;
begin
  -- L'organisation visée est celle de la LIGNE DE RÉFÉRENCE, jamais une
  -- organisation résolue par son nom : une sonde posée dans une autre
  -- organisation que sa cible ne peut pas entrer en collision, et
  -- ressortirait « acceptée » sans avoir rien testé.
  select org_id into v_org from salles where nom = 'RECETTE A21' limit 1;
  begin
    insert into salles (org_id, nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps)
    values (v_org, 'recette a21', 'Bâtiment A', '2e étage', 80, 75, 2, false, false)
    returning id into v_id;
    delete from salles where id = v_id;
    insert into recette_sondes values (1, 'D-2  salle « recette a21 » (casse différente)',
      'REFUS sur salles_org_nom_uniq', '❌ ACCEPTÉ — l''index n''a pas joué');
  exception when unique_violation then
    insert into recette_sondes values (1, 'D-2  salle « recette a21 » (casse différente)',
      'REFUS sur salles_org_nom_uniq', '✅ refusé');
  end;
end $$;

-- D-2b : même nom, espacement différent. L'index normalise par
-- `lower(btrim(nom))` — btrim ne retire QUE les bords, pas les espaces
-- internes. L'application, elle, retire tous les caractères non alphanumériques
-- (`normaliserNomSalle`). Cette sonde mesure l'écart entre les deux.
do $$
declare v_org uuid; v_id integer;
begin
  -- L'organisation visée est celle de la LIGNE DE RÉFÉRENCE, jamais une
  -- organisation résolue par son nom : une sonde posée dans une autre
  -- organisation que sa cible ne peut pas entrer en collision, et
  -- ressortirait « acceptée » sans avoir rien testé.
  select org_id into v_org from salles where nom = 'RECETTE A21' limit 1;
  begin
    insert into salles (org_id, nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps)
    values (v_org, 'RECETTE  A21', 'Bâtiment A', '2e étage', 80, 75, 2, false, false)
    returning id into v_id;
    delete from salles where id = v_id;
    insert into recette_sondes values (2, 'D-2b salle « RECETTE  A21 » (double espace)',
      'à documenter — la base ne normalise que les bords', '⚠️ ACCEPTÉ — écart base / application');
  exception when unique_violation then
    insert into recette_sondes values (2, 'D-2b salle « RECETTE  A21 » (double espace)',
      'à documenter', '✅ refusé');
  end;
end $$;

-- D-3 : même e-mail de surveillant, casse différente.
do $$
declare v_org uuid; v_id integer;
begin
  -- Organisation de la ligne de référence — voir la note des sondes salles.
  select org_id into v_org from surveillants where email = 'un@recette.spc.test' limit 1;
  begin
    insert into surveillants (org_id, nom, role, statut, email, telephone, nb_examens, heures, note, taux_horaire)
    values (v_org, 'Sonde Casse', 'Surveillant salle', 'Disponible', 'UN@Recette.SPC.Test', '0699000001', 0, 0, 0, 30)
    returning id into v_id;
    delete from surveillants where id = v_id;
    insert into recette_sondes values (3, 'D-3  e-mail « UN@Recette.SPC.Test » (casse)',
      'REFUS sur surveillants_org_email_uniq', '❌ ACCEPTÉ — l''index n''a pas joué');
  exception when unique_violation then
    insert into recette_sondes values (3, 'D-3  e-mail « UN@Recette.SPC.Test » (casse)',
      'REFUS sur surveillants_org_email_uniq', '✅ refusé');
  end;
end $$;

-- D-4a : même téléphone, séparateurs différents. L'index compare les chiffres
-- (`regexp_replace(telephone, '\D', '', 'g')`) : « 06 12 00 00 01 » et
-- « 0612000001 » donnent la même clé.
do $$
declare v_org uuid; v_id integer;
begin
  -- Organisation de la ligne de référence — voir la note des sondes salles.
  select org_id into v_org from surveillants where email = 'un@recette.spc.test' limit 1;
  begin
    insert into surveillants (org_id, nom, role, statut, email, telephone, nb_examens, heures, note, taux_horaire)
    values (v_org, 'Sonde Séparateurs', 'Surveillant salle', 'Disponible', 'sonde-sep@recette.spc.test', '06 12 00 00 01', 0, 0, 0, 30)
    returning id into v_id;
    delete from surveillants where id = v_id;
    insert into recette_sondes values (4, 'D-4a téléphone « 06 12 00 00 01 » (séparateurs)',
      'REFUS sur surveillants_org_tel_uniq', '❌ ACCEPTÉ — l''index n''a pas joué');
  exception when unique_violation then
    insert into recette_sondes values (4, 'D-4a téléphone « 06 12 00 00 01 » (séparateurs)',
      'REFUS sur surveillants_org_tel_uniq', '✅ refusé');
  end;
end $$;

-- D-4b : MÊME NUMÉRO, forme internationale. C'est le cas que
-- `tests/RECETTE-SUPABASE.md` annonçait comme devant être refusé.
-- `regexp_replace` ne retire que les non-chiffres : « +33612000001 » donne
-- « 33612000001 », « 0612000001 » donne « 0612000001 ». Deux clés différentes
-- pour un seul numéro. La sonde établit le fait, elle ne le suppose pas.
do $$
declare v_org uuid; v_id integer;
begin
  -- Organisation de la ligne de référence — voir la note des sondes salles.
  select org_id into v_org from surveillants where email = 'un@recette.spc.test' limit 1;
  begin
    insert into surveillants (org_id, nom, role, statut, email, telephone, nb_examens, heures, note, taux_horaire)
    values (v_org, 'Sonde International', 'Surveillant salle', 'Disponible', 'sonde-intl@recette.spc.test', '+33 6 12 00 00 01', 0, 0, 0, 30)
    returning id into v_id;
    delete from surveillants where id = v_id;
    insert into recette_sondes values (5, 'D-4b téléphone « +33 6 12 00 00 01 » (même numéro)',
      'REFUS annoncé par la recette', '❌ ACCEPTÉ — l''index ne normalise pas le préfixe pays');
  exception when unique_violation then
    insert into recette_sondes values (5, 'D-4b téléphone « +33 6 12 00 00 01 » (même numéro)',
      'REFUS annoncé par la recette', '✅ refusé');
  end;
end $$;

-- R-3 : le même nom de salle dans une AUTRE organisation doit être ACCEPTÉ.
-- C'est ce qui prouve que l'unicité est bien par organisation et non globale.
-- La ligne est conservée : elle servira aux contrôles R-1 et R-2.
do $$
declare v_org2 uuid; v_id integer;
begin
  select id into v_org2 from organizations where nom = 'SPC Recette — Concurrent';
  if exists (select 1 from salles where org_id = v_org2 and lower(btrim(nom)) = 'recette a21') then
    insert into recette_sondes values (6, 'R-3  salle « RECETTE A21 » dans une autre organisation',
      'ACCEPTÉ — unicité par organisation', '✅ accepté (déjà présente)');
  else
    begin
      insert into salles (org_id, nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps)
      values (v_org2, 'RECETTE A21', 'Bâtiment A', '2e étage', 80, 75, 2, false, false)
      returning id into v_id;
      insert into recette_sondes values (6, 'R-3  salle « RECETTE A21 » dans une autre organisation',
        'ACCEPTÉ — unicité par organisation', '✅ accepté');
    exception when unique_violation then
      insert into recette_sondes values (6, 'R-3  salle « RECETTE A21 » dans une autre organisation',
        'ACCEPTÉ — unicité par organisation', '❌ REFUSÉ — l''unicité est globale, pas par organisation');
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Résultats — UNE SEULE requête finale.
--
-- Le SQL Editor n'affiche que le dernier jeu de résultats d'un script. Deux
-- `select` à la fin, et le premier — celui des sondes — n'apparaît jamais.
-- Tout est donc réuni ici : sondes, périmètre, et l'INVENTAIRE NOMINATIF des
-- lignes rattachées. Cet inventaire n'est pas décoratif : il est le seul moyen
-- de savoir si un compte de lignes inattendu vient du jeu de recette, d'un
-- reliquat de sonde, ou de données préexistantes de la base.
-- ---------------------------------------------------------------------------
select bloc, libelle, attendu, observe from (

  select 1 as ordre, ordre as sous_ordre, 'SONDE' as bloc,
         sonde as libelle, attendu, observe
    from recette_sondes

  union all
  select 2, 1, 'PÉRIMÈTRE', 'lignes soumises aux index partiels',
         '6 salles · 10 surveillants (jeu de recette)',
         (select count(*) from salles       where org_id is not null)::text || ' salle(s) · '
      || (select count(*) from surveillants where org_id is not null)::text || ' surveillant(s)'

  union all
  select 2, 2, 'PÉRIMÈTRE', 'membres d''organisation',
         'au moins 1, sinon l''application lira 0 ligne',
         (select count(*) from organization_members)::text || ' membre(s)'

  union all
  -- La migration 28 pose un DEFAULT sur org_id de chaque table métier, en
  -- choisissant « la vraie organisation » parmi celles qui existent AU MOMENT où
  -- elle passe. Sur une base neuve, les seules organisations sont les deux
  -- fictives de la migration 11 : le défaut pointe donc sur une organisation de
  -- DÉMONSTRATION, et toute insertion ultérieure y atterrit sans le dire.
  select 2, 3, 'PÉRIMÈTRE', 'organisation par défaut de salles.org_id',
         'l''organisation de travail, pas une organisation de démonstration',
         coalesce((select o.nom
                     from pg_attrdef ad
                     join pg_class c on c.oid = ad.adrelid and c.relname = 'salles'
                     join pg_attribute a on a.attrelid = c.oid and a.attnum = ad.adnum
                                        and a.attname = 'org_id'
                     join organizations o
                       on o.id::text = btrim(split_part(pg_get_expr(ad.adbin, ad.adrelid), '''', 2))
                    limit 1), '(aucun défaut)')

  union all
  -- L'organisation réellement visée par les sondes, lue sur la ligne de
  -- référence. C'est elle qui décide si une sonde peut entrer en collision.
  select 2, 4, 'PÉRIMÈTRE', 'organisation visée par les sondes',
         'la même pour la ligne de référence et pour la sonde',
         coalesce((select o.nom from salles s join organizations o on o.id = s.org_id
                    where s.nom = 'RECETTE A21' limit 1), '(aucune — sondes sans valeur)')

  union all
  -- Inventaire nominatif : tout écart au jeu de recette se voit ici.
  select 3, 1, 'INVENTAIRE', 'salles rattachées, par organisation', '—',
         coalesce((select string_agg(s.nom || ' → ' || o.nom, ' · ' order by o.nom, s.nom)
                     from salles s join organizations o on o.id = s.org_id), '(aucune)')

  union all
  select 3, 2, 'INVENTAIRE', 'surveillants rattachés', '—',
         coalesce((select string_agg(v.email, ' · ' order by v.email)
                     from surveillants v where v.org_id is not null), '(aucun)')

  union all
  -- Lignes NON rattachées : elles restent invisibles à l'application sous RLS.
  select 3, 3, 'INVENTAIRE', 'salles SANS organisation (invisibles sous RLS)', '—',
         coalesce((select string_agg(nom, ' · ' order by nom)
                     from salles where org_id is null), '(aucune)')

  union all
  select 3, 4, 'INVENTAIRE', 'surveillants SANS organisation (invisibles sous RLS)', '—',
         coalesce((select string_agg(coalesce(email, nom), ' · ' order by coalesce(email, nom))
                     from surveillants where org_id is null), '(aucun)')

) x
order by ordre, sous_ordre;
