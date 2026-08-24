-- SPC Opérations — Recette locale : couche de compatibilité Supabase
--
-- POURQUOI CE FICHIER EXISTE
-- --------------------------
-- La recette documentée dans `tests/RECETTE-SUPABASE.md` exigeait une instance
-- Supabase hébergée, et se jouait à la main dans le SQL Editor. Conséquence :
-- rien n'était rejouable, rien ne tournait en intégration continue, et les
-- verdicts se périmaient à chaque commit.
--
-- Ce fichier lève cette dépendance pour tout ce qui se passe DANS PostgreSQL.
-- Il recrée, sur un PostgreSQL nu, la seule surface Supabase que les 33
-- migrations utilisent réellement — inventaire exhaustif, relevé par grep :
--
--   auth.uid()      22 occurrences   (toutes les policies RLS)
--   auth.users      12 occurrences   (clés étrangères, trigger de profil)
--   auth.role()      4 occurrences
--   rôle `authenticated`  86 `grant ... to authenticated`
--
-- CE QUE CE SHIM N'EST PAS
-- ------------------------
-- Ce n'est pas une réimplémentation de Supabase. Il n'y a ici ni PostgREST ni
-- GoTrue : les scénarios qui passent par HTTP (écritures via supabase-js,
-- session de connexion réelle) restent hors de portée et sont marqués comme
-- tels dans `tests/RECETTE-SUPABASE.md`.
--
-- Ce qu'il couvre, en revanche, il le couvre à l'identique : `auth.uid()` est
-- copiée sur la définition de Supabase — lecture du claim `sub` dans le réglage
-- de session `request.jwt.claims`, celui-là même que PostgREST dépose à chaque
-- requête. Poser ce réglage puis `set role authenticated` place la session dans
-- l'état EXACT où PostgREST place une requête authentifiée. Les policies RLS
-- ne font pas la différence : c'est ce qui rend les contrôles R-1/R-2/R-3
-- probants.
--
-- Idempotent. Se joue AVANT les migrations, sur une base vide.

-- ---------------------------------------------------------------------------
-- 1. Les rôles Supabase.
--
--    `authenticated` ne doit JAMAIS être superutilisateur ni `bypassrls` :
--    c'est précisément parce qu'il ne l'est pas que la RLS s'applique à lui et
--    que les contrôles d'isolation ont un sens. Un test d'isolation joué en
--    superutilisateur passe toujours, et ne prouve rien.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Le schéma `auth` et sa table `users`.
--
--    Seules deux colonnes sont lues par les migrations : `id` (clés étrangères
--    des migrations 14, 15, 18) et `raw_user_meta_data` (trigger de création de
--    profil, migration 15). `email` est ajoutée parce que `02_organisation.sql`
--    l'affiche dans son message de rattachement.
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 3. Les fonctions d'identité.
--
--    Définitions alignées sur Supabase. `request.jwt.claims` est un réglage de
--    session : PostgREST l'écrit à partir du JWT présenté, un test l'écrit avec
--    `set_config(...)`. Dans les deux cas `auth.uid()` lit la même chose.
--
--    Le second argument `true` de `current_setting` renvoie NULL au lieu de
--    lever une erreur quand le réglage est absent — cas d'une session anonyme.
-- ---------------------------------------------------------------------------
create or replace function auth.jwt() returns jsonb
  language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb,
      '{}'::jsonb
    );
  $$;

create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid;
  $$;

create or replace function auth.role() returns text
  language sql stable as $$
    select coalesce(nullif(auth.jwt() ->> 'role', ''), current_setting('role', true));
  $$;

-- ---------------------------------------------------------------------------
-- 4. Les droits.
--
--    La RLS ne s'applique QU'APRÈS les droits de table : un rôle sans `grant`
--    se voit refuser l'accès par le contrôle de privilèges, avant même que la
--    policy soit consultée. Un test d'isolation monté sans ces `grant` verrait
--    donc « 0 ligne » pour la mauvaise raison, et validerait à tort.
--
--    `alter default privileges` doit précéder les migrations : il ne s'applique
--    qu'aux tables créées ENSUITE.
-- ---------------------------------------------------------------------------
grant usage on schema auth   to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

grant select on auth.users to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
