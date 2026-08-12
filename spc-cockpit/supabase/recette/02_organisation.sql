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
-- 2. Rattachement du jeu de recette à « SPC Recette ».
--
--    L'ordre importe peu ici (org_id est nullable partout), mais le
--    rattachement des salles ACTIVE l'index salles_org_nom_uniq sur ces lignes :
--    s'il existait un doublon parmi elles, c'est ici que la migration 31
--    échouerait en production. C'est précisément le contrôle M-1.
-- ---------------------------------------------------------------------------
update salles       s set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and s.nom like 'RECETTE %' and s.org_id is null;

update surveillants v set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and v.email like '%@recette.spc.test' and v.org_id is null;

update missions     m set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and m.reference like 'RECETTE-%' and m.org_id is null;

update devis        d set org_id = o.id from organizations o
 where o.nom = 'SPC Recette' and d.reference like 'RECETTE-%' and d.org_id is null;

update affectations a set org_id = m.org_id from missions m
 where m.id = a.mission_id and m.reference like 'RECETTE-%' and a.org_id is null;

update devis_salles ds set org_id = d.org_id from devis d
 where d.id = ds.devis_id and d.reference like 'RECETTE-%' and ds.org_id is null;

update devis_equipe de set org_id = d.org_id from devis d
 where d.id = de.devis_id and d.reference like 'RECETTE-%' and de.org_id is null;

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
drop table if exists recette_sondes;
create temp table recette_sondes (ordre int, sonde text, attendu text, observe text);

-- D-2 : même nom de salle, casse différente.
do $$
declare v_org uuid; v_id integer;
begin
  select id into v_org from organizations where nom = 'SPC Recette';
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
  select id into v_org from organizations where nom = 'SPC Recette';
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
  select id into v_org from organizations where nom = 'SPC Recette';
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
  select id into v_org from organizations where nom = 'SPC Recette';
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
  select id into v_org from organizations where nom = 'SPC Recette';
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
-- 5. Résultats.
-- ---------------------------------------------------------------------------
select sonde, attendu, observe from recette_sondes order by ordre;

-- Périmètre désormais couvert par les index partiels (contrôle D-1b) :
select 'périmètre des index partiels' as controle,
       (select count(*) from salles       where org_id is not null)::text || ' salle(s) · '
    || (select count(*) from surveillants where org_id is not null)::text || ' surveillant(s) · '
    || (select count(*) from organization_members)::text || ' membre(s)' as observe;
