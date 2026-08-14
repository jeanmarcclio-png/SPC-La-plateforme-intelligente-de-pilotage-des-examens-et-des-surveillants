-- SPC Opérations — Recette : ISOLATION RLS, PORTAIL SURVEILLANT, CONTRAINTES
--
-- À jouer APRÈS `02_organisation.sql`. Se joue sur la recette locale
-- (`recette/locale/recette-locale.sh`) ou sur une instance hébergée.
--
-- POURQUOI CE FICHIER EXISTE
-- --------------------------
-- `01_controles.sql` vérifie que les policies et les contraintes EXISTENT.
-- Exister ne prouve rien : une policy peut être en place et laisser tout
-- passer, une contrainte peut être déclarée et n'avoir jamais été heurtée.
-- L'audit avait relevé la nuance et laissé ces lignes en 🔍 NON VÉRIFIÉ.
--
-- Ce script SOLLICITE. Il prend une identité, tente l'accès, et rapporte ce que
-- la base a répondu.
--
-- COMMENT UNE IDENTITÉ EST PRISE
-- ------------------------------
--   select set_config('request.jwt.claims', '{"sub":"…","role":"authenticated"}', true);
--   set local role authenticated;
--
-- C'est exactement l'état dans lequel PostgREST place une requête authentifiée :
-- le claim `sub` du JWT dans le réglage de session, et le rôle `authenticated`.
-- `auth.uid()` lit ce claim — les policies ne font pas la différence.
--
-- `set local` et une transaction par sonde : l'identité retombe au COMMIT. Une
-- sonde qui laisserait le rôle en place fausserait toutes les suivantes.
--
-- CE QUI REND CES SONDES PROBANTES
-- --------------------------------
-- Le tiers n'est pas un compte sans droits : il est ADMINISTRATEUR de l'autre
-- organisation. S'il ne voit rien de « SPC Recette », c'est bien l'isolation qui
-- joue, et non une absence de privilèges qui refuserait tout partout.
--
-- Idempotent.

-- ---------------------------------------------------------------------------
-- 0. Cibles et résultats.
--
-- Les identifiants sont résolus ICI, en superutilisateur : sous RLS, le tiers
-- ne peut par construction pas les découvrir, et une sonde qui viserait NULL
-- ressortirait « 0 ligne » sans avoir rien testé.
-- ---------------------------------------------------------------------------
create table if not exists recette_rls (ordre int, controle text, attendu text, observe text);
delete from recette_rls;

drop table if exists recette_rls_cibles;
create table recette_rls_cibles as
select
  (select id from organizations where nom = 'SPC Recette')              as org_spc,
  (select id from organizations where nom = 'SPC Recette — Concurrent') as org_concurrent,
  (select min(id) from salles
    where org_id = (select id from organizations where nom = 'SPC Recette')) as salle_spc,
  (select min(id) from surveillants
    where org_id = (select id from organizations where nom = 'SPC Recette')) as surv_spc,
  -- La salle que le planning référence par `salle_id` : cible du contrôle I-4.
  (select s.id from salles s join affectations a on a.salle_id = s.id
    where s.org_id = (select id from organizations where nom = 'SPC Recette')
    order by s.id limit 1)                                              as salle_referencee;

-- ---------------------------------------------------------------------------
-- 1. Le compte surveillant.
--
--    Le portail (migration 23) ne se teste qu'avec un compte dont le RÔLE est
--    « surveillant » ET qui est rattaché à une fiche par `surveillants.user_id`.
--    Sans ce lien, `spc_owns_surveillant` est faux partout et le compte ne voit
--    rien — un vert obtenu pour la mauvaise raison.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'surv@recette.spc.test', '{"nom":"Surveillant Recette"}')
on conflict (id) do nothing;

update surveillants set user_id = '33333333-3333-3333-3333-333333333333'
 where id = (select surv_spc from recette_rls_cibles);

insert into organization_members (org_id, user_id, role)
select org_spc, '33333333-3333-3333-3333-333333333333', 'surveillant' from recette_rls_cibles
on conflict (org_id, user_id) do update set role = 'surveillant';

-- ---------------------------------------------------------------------------
-- R-1 — LECTURE CROISÉE. Le tiers ne doit voir que SON organisation.
-- ---------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
insert into recette_rls
select 1,
       'R-1  le tiers lit les salles',
       '1 salle — la sienne, jamais les 5 de « SPC Recette »',
       case when count(*) = 1 and bool_and(s.org_id = c.org_concurrent)
            then '✅ 1 salle, la sienne'
            else '❌ ' || count(*) || ' salle(s) visible(s)' end
  from salles s, recette_rls_cibles c;
commit;

begin;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
insert into recette_rls
select 2,
       'R-1b le tiers vise une salle de « SPC Recette » par son id',
       '0 ligne, jamais une erreur technique brute',
       case when count(*) = 0 then '✅ 0 ligne' else '❌ ' || count(*) || ' ligne(s) — FUITE' end
  from salles s, recette_rls_cibles c where s.id = c.salle_spc;
commit;

begin;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
insert into recette_rls
select 3,
       'R-1c le tiers lit les surveillants de « SPC Recette »',
       '0 ligne — téléphones et heures ne sortent pas de l''organisation',
       case when count(*) = 0 then '✅ 0 ligne' else '❌ ' || count(*) || ' fiche(s) — FUITE' end
  from surveillants v, recette_rls_cibles c where v.org_id = c.org_spc;
commit;

-- ---------------------------------------------------------------------------
-- R-2 — ÉCRITURE CROISÉE.
--
-- Deux formes distinctes, et elles ne se comportent PAS pareil :
--   · UPDATE  — la clause USING masque la ligne : 0 ligne modifiée, sans erreur.
--   · INSERT  — la clause WITH CHECK refuse : erreur 42501.
-- Confondre les deux, c'est croire l'écriture protégée parce qu'elle « n'a rien
-- renvoyé ».
-- ---------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_n integer; v_cible integer;
begin
  select salle_spc into v_cible from recette_rls_cibles;
  update salles set capacite = 999 where id = v_cible;
  get diagnostics v_n = row_count;
  insert into recette_rls values (4,
    'R-2  le tiers modifie une salle de « SPC Recette »',
    '0 ligne modifiée',
    case when v_n = 0 then '✅ 0 ligne modifiée' else '❌ ' || v_n || ' ligne(s) MODIFIÉE(S)' end);
exception when insufficient_privilege then
  insert into recette_rls values (4,
    'R-2  le tiers modifie une salle de « SPC Recette »',
    '0 ligne modifiée', '✅ refusé par la RLS');
end $$;
commit;

begin;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_org uuid; v_id integer;
begin
  select org_spc into v_org from recette_rls_cibles;
  insert into salles (org_id, nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps)
  values (v_org, 'INTRUSION TIERS', 'X', '0', 10, 10, 1, false, false)
  returning id into v_id;
  insert into recette_rls values (5,
    'R-2b le tiers insère une salle DANS « SPC Recette »',
    'REFUS (42501)', '❌ ACCEPTÉ — écriture dans une autre organisation');
  delete from salles where id = v_id;
exception when insufficient_privilege then
  insert into recette_rls values (5,
    'R-2b le tiers insère une salle DANS « SPC Recette »',
    'REFUS (42501)', '✅ refusé');
end $$;
commit;

-- ---------------------------------------------------------------------------
-- R-4 — LE PORTAIL SURVEILLANT (migration 23).
--
-- C'est la migration qui n'était JAMAIS passée sur une base neuve : elle
-- échouait sur « policy already exists », et personne ne s'en apercevait parce
-- que rien ne la sollicitait.
-- ---------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
insert into recette_rls
select 6,
       'R-4  un surveillant lit le référentiel des surveillants',
       'sa seule fiche — pas les téléphones et heures des collègues',
       case when count(*) = 1 and bool_and(v.user_id = '33333333-3333-3333-3333-333333333333')
            then '✅ 1 fiche, la sienne'
            else '❌ ' || count(*) || ' fiche(s) visible(s)' end
  from surveillants v;
commit;

begin;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$
declare v_n integer; v_cible integer;
begin
  -- Une fiche qui n'est pas la sienne.
  select min(id) into v_cible from surveillants where user_id is distinct from '33333333-3333-3333-3333-333333333333';
  update surveillants set taux_horaire = 999 where id = v_cible;
  get diagnostics v_n = row_count;
  insert into recette_rls values (7,
    'R-4b un surveillant modifie la fiche d''un collègue',
    '0 ligne modifiée',
    case when v_n = 0 then '✅ 0 ligne modifiée' else '❌ ' || v_n || ' ligne(s) MODIFIÉE(S)' end);
exception when insufficient_privilege then
  insert into recette_rls values (7,
    'R-4b un surveillant modifie la fiche d''un collègue',
    '0 ligne modifiée', '✅ refusé par la RLS');
end $$;
commit;

-- ---------------------------------------------------------------------------
-- R-5 — NON-RÉGRESSION COCKPIT.
--
-- Une isolation qui refuse aussi les accès LÉGITIMES n'est pas une isolation,
-- c'est une panne. L'administrateur doit voir ses 5 salles.
-- ---------------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
insert into recette_rls
select 8,
       'R-5  l''administrateur lit les salles de son organisation',
       '5 salles — aucune régression cockpit',
       case when count(*) = 5 then '✅ 5 salles'
            else '❌ ' || count(*) || ' salle(s) — l''isolation refuse un accès légitime' end
  from salles s, recette_rls_cibles c where s.org_id = c.org_spc;
commit;

-- ---------------------------------------------------------------------------
-- I-4 — LA CONTRAINTE `on delete restrict` EST-ELLE RÉELLEMENT OPPOSABLE ?
--
-- `01_controles.sql` établit qu'elle est déclarée en RESTRICT. Déclarée n'est
-- pas heurtée : ce contrôle provoque le refus.
-- ---------------------------------------------------------------------------
do $$
declare v_cible integer;
begin
  select salle_referencee into v_cible from recette_rls_cibles;
  delete from salles where id = v_cible;
  -- La suppression est passée : c'est un échec, et il ne faut SURTOUT pas la
  -- conserver. Lever ici annule le DELETE ; le verdict est écrit dans le
  -- gestionnaire, qui survit au retour en arrière.
  raise exception 'sonde-i4:acceptee';
exception
  when foreign_key_violation then
    insert into recette_rls values (9,
      'I-4  supprimer en SQL une salle référencée au planning',
      'ERREUR de contrainte (foreign_key_violation)', '✅ refusé par la base');
  when others then
    if sqlerrm = 'sonde-i4:acceptee' then
      insert into recette_rls values (9,
        'I-4  supprimer en SQL une salle référencée au planning',
        'ERREUR de contrainte (foreign_key_violation)',
        '❌ SUPPRESSION ACCEPTÉE — le garde n''est qu''applicatif');
    else
      raise;
    end if;
end $$;

-- ---------------------------------------------------------------------------
-- N-1 — PARITÉ BASE / APPLICATION SUR LA NORMALISATION.
--
-- D-2b et D-4b venaient tous deux du MÊME écart : la base et l'application ne
-- normalisaient pas pareil. Corriger les index sans surveiller cet écart, c'est
-- attendre qu'il se rouvre. Les vecteurs ci-dessous rejouent, côté base, ceux
-- des tests unitaires de `normaliserNomSalle()`
-- (`lib/operations/referentiel-salles.ts`) et de `cleTelephone()`
-- (`lib/operations/telephone.ts`).
-- ---------------------------------------------------------------------------
insert into recette_rls
select 10,
       'N-1  spc_salle_cle vs normaliserNomSalle (6 vecteurs)',
       'les 6 identiques',
       case when count(*) filter (where obtenu is distinct from attendu) = 0
            then '✅ 6/6 identiques'
            else '❌ ' || count(*) filter (where obtenu is distinct from attendu) || ' divergence(s) : '
                 || string_agg(entree || ' → ' || obtenu || ' ≠ ' || attendu, ' · ')
                    filter (where obtenu is distinct from attendu) end
from (
  select entree, attendu, spc_salle_cle(entree) as obtenu
    from (values
      ('RECETTE A21',   'recettea21'),
      ('RECETTE  A21',  'recettea21'),   -- double espace — le cas D-2b
      ('recette a21',   'recettea21'),
      ('Salle A21',     'a21'),          -- préfixe « salle » retiré
      ('Amphi Éco',     'amphieco'),     -- accent déplié
      ('A-21',          'a21')           -- ponctuation retirée
    ) as v(entree, attendu)
) x;

insert into recette_rls
select 11,
       'N-1b spc_tel_cle vs telephoneCle (5 vecteurs)',
       'les 5 identiques',
       case when count(*) filter (where obtenu is distinct from attendu) = 0
            then '✅ 5/5 identiques'
            else '❌ ' || count(*) filter (where obtenu is distinct from attendu) || ' divergence(s) : '
                 || string_agg(entree || ' → ' || obtenu || ' ≠ ' || attendu, ' · ')
                    filter (where obtenu is distinct from attendu) end
from (
  select entree, attendu, spc_tel_cle(entree) as obtenu
    from (values
      ('0612000001',          '0612000001'),
      ('06 12 00 00 01',      '0612000001'),
      ('+33 6 12 00 00 01',   '0612000001'),   -- le cas D-4b
      ('0033612000001',       '0612000001'),
      ('',                    '')
    ) as v(entree, attendu)
) x;

-- ---------------------------------------------------------------------------
-- Résultats.
-- ---------------------------------------------------------------------------
select ordre, controle, attendu, observe from recette_rls order by ordre;
