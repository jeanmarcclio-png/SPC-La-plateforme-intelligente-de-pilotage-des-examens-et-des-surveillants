-- ============================================================================
-- SPC — Migration v23 : RLS role-aware pour le portail surveillant (phase 2)
--
-- Objectif (spec §5) : le rôle 'surveillant' ne LIT que SES données et n'ÉCRIT
-- (directement) que SES disponibilités ; la confirmation/refus d'affectation
-- passe par des RPC contrôlées (v24). Les rôles coordinateur/admin/planificateur
-- conservent l'accès complet à l'organisation (aucune régression cockpit).
--
-- CORRIGÉ — recette locale du 14 août 2026. Deux défauts, tous deux établis en
-- rejouant les 33 migrations sur un PostgreSQL neuf :
--
--   1) LA MIGRATION NE PASSAIT PAS. La v12 crée, par boucle, les policies
--      « spc insert/update/delete/select <table> » sur toutes les tables
--      métier — surveillants et affectations comprises. Cette migration en
--      recréait quatre du même nom sans les déposer d'abord : elle échouait sur
--      `policy "spc insert surveillants" already exists`. Autrement dit, sur
--      TOUTE base montée depuis zéro, le portail surveillant n'avait jamais de
--      RLS : ni la restriction de lecture, ni les gardes d'écriture.
--
--   2) LE MODÈLE D'ORIGINE PERDAIT L'ISOLATION MULTI-ORGANISATION. L'intention
--      première — ne pas dépendre de `org_id`, jugé NULL sur des lignes legacy
--      — ne tient pas : les policies PERMISSIVES se combinent par OU. Tant que
--      la policy de la v12 subsistait, `spc_member_of(org_id)` suffisait à
--      lire, et la restriction « un surveillant ne lit que sa fiche » était
--      annulée. Et si on la déposait sans rien ajouter, un coordinateur lisait
--      les surveillants de TOUTES les organisations.
--
--      Les deux règles doivent donc se CONJUGUER, pas se remplacer : rang et
--      appartenance à l'organisation (v12) ET restriction de rôle (v23). C'est
--      ce que fait cette version. Les rangs de la v12 sont repris à l'identique
--      — 1 pour insert/update, 3 pour delete.
--
--      Le `org_id` NULL redouté à l'écriture de la v23 n'est plus un risque :
--      les migrations v27 et v28 renseignent `org_id` sur les tables métier et
--      y posent un défaut. Les policies étant évaluées à l'exécution et non au
--      moment de la migration, c'est l'état d'après v28 qui compte.
--
--      `disponibilites` fait exception : elle ne figure PAS dans la liste
--      rattrapée par v27/v28, son `org_id` peut donc rester NULL. Ses policies
--      ne s'y fient pas et passent par l'organisation du surveillant porteur.
-- ============================================================================

-- Helpers -------------------------------------------------------------------
-- L'utilisateur courant est-il un surveillant (rôle 'surveillant' quelque part) ?
create or replace function spc_is_surveillant() returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from organization_members
      where user_id = auth.uid() and lower(role) = 'surveillant'
    );
  $$;

-- La ligne surveillants d'id `sid` est-elle rattachée au compte courant ?
create or replace function spc_owns_surveillant(sid integer) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from surveillants
      where id = sid and user_id = auth.uid()
    );
  $$;

-- Le surveillant d'id `sid` appartient-il à une organisation dont le compte
-- courant est membre ?
--
-- Sert aux policies de `disponibilites`, dont l'`org_id` propre n'est pas
-- fiable : cette table ne figure pas dans la liste des tables métier rattrapées
-- par les migrations v27/v28, et sa colonne peut donc rester NULL. On lit
-- l'organisation sur la fiche surveillant, qui, elle, est rattrapée.
--
-- `security definer` est nécessaire : la fonction interroge `surveillants`, qui
-- porte sa propre RLS. Sans cela, l'évaluation de la policy de `disponibilites`
-- déclencherait celle de `surveillants` — au mieux une récursion, au pire une
-- ligne masquée qui ferait disparaître une disponibilité légitime.
create or replace function spc_surveillant_dans_mon_org(sid integer) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from surveillants s
      where s.id = sid and spc_member_of(s.org_id)
    );
  $$;

-- SURVEILLANTS ---------------------------------------------------------------
alter table surveillants enable row level security;
drop policy if exists "Auth read surveillants"   on surveillants;
drop policy if exists "Auth insert surveillants" on surveillants;
drop policy if exists "Auth update surveillants" on surveillants;
drop policy if exists "Auth delete surveillants" on surveillants;
drop policy if exists "spc read surveillants"    on surveillants;
drop policy if exists "spc write surveillants"   on surveillants;
-- Les quatre policies posées par la boucle de la v12. Sans ces dépôts, la
-- migration échoue sur « already exists » ; et si elle passait, la policy de
-- lecture de la v12 se combinerait par OU avec celle d'ici et annulerait la
-- restriction. Elles sont reprises ci-dessous, conjuguées.
drop policy if exists "spc select surveillants"  on surveillants;
drop policy if exists "spc insert surveillants"  on surveillants;
drop policy if exists "spc update surveillants"  on surveillants;
drop policy if exists "spc delete surveillants"  on surveillants;

-- Lecture : membre de l'organisation de la ligne (v12) ET — si l'utilisateur
-- est un surveillant — sa seule fiche (pas de fuite de téléphone/heures
-- d'autrui).
create policy "spc read surveillants" on surveillants for select to authenticated
  using (
    spc_member_of(org_id)
    and (not spc_is_surveillant() or user_id = auth.uid())
  );

-- Écriture : rang de la v12 (1 pour insert/update, 3 pour delete) ET rôle non
-- surveillant.
create policy "spc insert surveillants" on surveillants for insert to authenticated
  with check (spc_has_role(org_id, 1) and not spc_is_surveillant());
create policy "spc update surveillants" on surveillants for update to authenticated
  using      (spc_has_role(org_id, 1) and not spc_is_surveillant())
  with check (spc_has_role(org_id, 1) and not spc_is_surveillant());
create policy "spc delete surveillants" on surveillants for delete to authenticated
  using (spc_has_role(org_id, 3) and not spc_is_surveillant());

-- AFFECTATIONS ---------------------------------------------------------------
alter table affectations enable row level security;
drop policy if exists "Auth read affectations"   on affectations;
drop policy if exists "Auth insert affectations" on affectations;
drop policy if exists "Auth update affectations" on affectations;
drop policy if exists "Auth delete affectations" on affectations;
drop policy if exists "spc read affectations"    on affectations;
-- Idem surveillants : les quatre policies de la boucle v12.
drop policy if exists "spc select affectations"  on affectations;
drop policy if exists "spc insert affectations"  on affectations;
drop policy if exists "spc update affectations"  on affectations;
drop policy if exists "spc delete affectations"  on affectations;

-- Lecture : membre de l'organisation de la ligne (v12) ET — si l'utilisateur
-- est un surveillant — uniquement les affectations où il est le surveillant
-- affecté ou le remplaçant.
create policy "spc read affectations" on affectations for select to authenticated
  using (
    spc_member_of(org_id)
    and (
      not spc_is_surveillant()
      or spc_owns_surveillant(surveillant_id)
      or spc_owns_surveillant(remplacant_id)
    )
  );

-- Écriture directe : coordinateur+ uniquement, dans son organisation. Le
-- surveillant confirme/refuse via les RPC de la v24 (contrôle de propriété +
-- colonnes limitées).
create policy "spc insert affectations" on affectations for insert to authenticated
  with check (spc_has_role(org_id, 1) and not spc_is_surveillant());
create policy "spc update affectations" on affectations for update to authenticated
  using      (spc_has_role(org_id, 1) and not spc_is_surveillant())
  with check (spc_has_role(org_id, 1) and not spc_is_surveillant());
create policy "spc delete affectations" on affectations for delete to authenticated
  using (spc_has_role(org_id, 3) and not spc_is_surveillant());

-- DISPONIBILITES -------------------------------------------------------------
drop policy if exists "spc read disponibilites"   on disponibilites;
drop policy if exists "spc insert disponibilites" on disponibilites;
drop policy if exists "spc update disponibilites" on disponibilites;
drop policy if exists "spc delete disponibilites" on disponibilites;

-- L'organisation vient du surveillant porteur, jamais de `disponibilites.org_id`
-- — voir la note de `spc_surveillant_dans_mon_org`.
--
-- Lecture : coordinateur = toute son organisation ; surveillant = les siennes.
create policy "spc read disponibilites" on disponibilites for select to authenticated
  using (
    spc_surveillant_dans_mon_org(surveillant_id)
    and (not spc_is_surveillant() or spc_owns_surveillant(surveillant_id))
  );

-- Écriture : le surveillant gère les SIENNES ; le coordinateur peut aussi saisir.
create policy "spc insert disponibilites" on disponibilites for insert to authenticated
  with check (
    spc_surveillant_dans_mon_org(surveillant_id)
    and (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  );
create policy "spc update disponibilites" on disponibilites for update to authenticated
  using (
    spc_surveillant_dans_mon_org(surveillant_id)
    and (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  )
  with check (
    spc_surveillant_dans_mon_org(surveillant_id)
    and (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  );
create policy "spc delete disponibilites" on disponibilites for delete to authenticated
  using (
    spc_surveillant_dans_mon_org(surveillant_id)
    and (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  );
