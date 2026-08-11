-- ============================================================================
-- SPC Opérations — RECETTE · LOT 5/7
--
-- Migrations de ce lot : 22, 23, 24, 25
--
-- Généré par supabase/recette/generer-lots.py — ne pas éditer à la main.
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 22_affectations-decline.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v22 : refus d'affectation + statut d'invitation (phase 2)
--
-- Un REFUS ne modifie jamais le planning : il pose un drapeau `decline` + un
-- `motif` sur l'affectation (le statut reste 'prevue'/'Proposé'). Le coordinateur
-- décide ensuite (remplacement, annulation).
--
-- Ajoute aussi `surveillants.invited_at` pour tracer le statut d'invitation :
--   user_id non NULL        → compte actif
--   invited_at non NULL     → invité (en attente d'activation)
--   sinon                   → non invité
--
-- Additif, non destructif, idempotent.
-- ============================================================================

alter table affectations
  add column if not exists decline    boolean default false,
  add column if not exists motif      text,
  add column if not exists decided_at timestamptz;

create index if not exists affectations_decline_idx on affectations(decline) where decline = true;

comment on column affectations.decline    is 'Refus surveillant (le planning n''est PAS modifié ; le coordinateur tranche).';
comment on column affectations.motif      is 'Motif optionnel du refus.';
comment on column affectations.decided_at is 'Horodatage de la confirmation / du refus par le surveillant.';

alter table surveillants
  add column if not exists invited_at timestamptz;

comment on column surveillants.invited_at is 'Date d''envoi de l''invitation (statut : non invité / invité / compte actif via user_id).';


-- ── MIGRATION 23_rls-portail-surveillant.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v23 : RLS role-aware pour le portail surveillant (phase 2)
--
-- Objectif (spec §5) : le rôle 'surveillant' ne LIT que SES données et n'ÉCRIT
-- (directement) que SES disponibilités ; la confirmation/refus d'affectation
-- passe par des RPC contrôlées (v24). Les rôles coordinateur/admin/planificateur
-- conservent l'accès complet à l'organisation (aucune régression cockpit).
--
-- Conçu pour être NON BLOQUANT en mode transition : les policies ne dépendent
-- PAS de org_id (qui peut être NULL sur des lignes legacy) mais du RÔLE de
-- l'utilisateur et du LIEN surveillants.user_id = auth.uid(). Les lignes à
-- org_id NULL restent donc visibles pour le coordinateur, comme aujourd'hui.
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

-- SURVEILLANTS ---------------------------------------------------------------
alter table surveillants enable row level security;
drop policy if exists "Auth read surveillants"   on surveillants;
drop policy if exists "Auth insert surveillants" on surveillants;
drop policy if exists "Auth update surveillants" on surveillants;
drop policy if exists "Auth delete surveillants" on surveillants;
drop policy if exists "spc read surveillants"    on surveillants;
drop policy if exists "spc write surveillants"   on surveillants;

-- Lecture : coordinateur = tout ; surveillant = sa seule fiche (pas de fuite
-- de téléphone/heures d'autrui).
drop policy if exists "spc read surveillants" on surveillants;
create policy "spc read surveillants" on surveillants for select to authenticated
  using (not spc_is_surveillant() or user_id = auth.uid());

-- Écriture (insert/update/delete) : réservée aux non-surveillants (coordinateur+).
drop policy if exists "spc insert surveillants" on surveillants;
create policy "spc insert surveillants" on surveillants for insert to authenticated
  with check (not spc_is_surveillant());
drop policy if exists "spc update surveillants" on surveillants;
create policy "spc update surveillants" on surveillants for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
drop policy if exists "spc delete surveillants" on surveillants;
create policy "spc delete surveillants" on surveillants for delete to authenticated
  using (not spc_is_surveillant());

-- AFFECTATIONS ---------------------------------------------------------------
alter table affectations enable row level security;
drop policy if exists "Auth read affectations"   on affectations;
drop policy if exists "Auth insert affectations" on affectations;
drop policy if exists "Auth update affectations" on affectations;
drop policy if exists "Auth delete affectations" on affectations;
drop policy if exists "spc read affectations"    on affectations;

-- Lecture : coordinateur = tout ; surveillant = uniquement les affectations
-- où il est le surveillant affecté ou le remplaçant.
drop policy if exists "spc read affectations" on affectations;
create policy "spc read affectations" on affectations for select to authenticated
  using (
    not spc_is_surveillant()
    or spc_owns_surveillant(surveillant_id)
    or spc_owns_surveillant(remplacant_id)
  );

-- Écriture directe : coordinateur+ uniquement. Le surveillant confirme/refuse
-- via les RPC de la v24 (contrôle de propriété + colonnes limitées).
drop policy if exists "spc insert affectations" on affectations;
create policy "spc insert affectations" on affectations for insert to authenticated
  with check (not spc_is_surveillant());
drop policy if exists "spc update affectations" on affectations;
create policy "spc update affectations" on affectations for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
drop policy if exists "spc delete affectations" on affectations;
create policy "spc delete affectations" on affectations for delete to authenticated
  using (not spc_is_surveillant());

-- DISPONIBILITES -------------------------------------------------------------
drop policy if exists "spc read disponibilites"   on disponibilites;
drop policy if exists "spc insert disponibilites" on disponibilites;
drop policy if exists "spc update disponibilites" on disponibilites;
drop policy if exists "spc delete disponibilites" on disponibilites;

-- Lecture : coordinateur = tout ; surveillant = les siennes.
drop policy if exists "spc read disponibilites" on disponibilites;
create policy "spc read disponibilites" on disponibilites for select to authenticated
  using (not spc_is_surveillant() or spc_owns_surveillant(surveillant_id));

-- Écriture : le surveillant gère les SIENNES ; le coordinateur peut aussi saisir.
drop policy if exists "spc insert disponibilites" on disponibilites;
create policy "spc insert disponibilites" on disponibilites for insert to authenticated
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
drop policy if exists "spc update disponibilites" on disponibilites;
create policy "spc update disponibilites" on disponibilites for update to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
drop policy if exists "spc delete disponibilites" on disponibilites;
create policy "spc delete disponibilites" on disponibilites for delete to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());


-- ── MIGRATION 24_portail-rpc.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v24 : RPC du portail surveillant (confirmer / décliner)
--
-- Le surveillant n'a PAS le droit d'UPDATE direct sur affectations (v23). Ces
-- RPC security definer garantissent qu'il n'agit QUE sur SES affectations et ne
-- touche QUE les colonnes autorisées (statut / decline / motif / decided_at).
--
--  confirmer → statut = 'confirmee' (efface un éventuel refus)
--  décliner  → decline = true + motif ; le STATUT/planning reste INCHANGÉ
--              (le coordinateur tranche : remplacement ou annulation).
-- ============================================================================

create or replace function public.spc_confirmer_affectation(p_affectation_id integer)
  returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  update affectations
     set statut = 'confirmee', decline = false, motif = null, decided_at = now()
   where id = p_affectation_id;
end;
$$;

create or replace function public.spc_decliner_affectation(
  p_affectation_id integer,
  p_motif text default null
) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  -- Refus motivé : on NE modifie PAS le statut (planning intact), on lève le drapeau.
  update affectations
     set decline = true,
         motif = nullif(trim(coalesce(p_motif, '')), ''),
         decided_at = now()
   where id = p_affectation_id;
end;
$$;

revoke all on function public.spc_confirmer_affectation(integer) from public;
revoke all on function public.spc_decliner_affectation(integer, text) from public;
grant execute on function public.spc_confirmer_affectation(integer) to authenticated;
grant execute on function public.spc_decliner_affectation(integer, text) to authenticated;


-- ── MIGRATION 25_rgpd-purges.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v25 : RGPD — table evenements + purges automatisées (pg_cron)
--
-- Durées de conservation appliquées (politique de confidentialité §5) :
--   * sessions d'examens / affectations  → purge à N+2 ans
--   * journaux (journal_sessions)         → 12 mois
--   * comptes inactifs 2 ans              → anonymisation (email/nom/tel),
--                                           agrégats d'heures conservés (paie 5 ans)
--   * candidats sans affectation 2 ans    → suppression
--
-- MODE DRY-RUN PAR DÉFAUT : la fonction lit rgpd_config.enforce (false par
-- défaut). Tant que enforce = false, elle COMPTE et journalise dans `evenements`
-- SANS rien supprimer. Passage en réel : update rgpd_config set enforce = true.
-- (Équivalent « variable d'env » adapté à pg_cron, qui s'exécute en base.)
--
-- Idempotent.
-- ============================================================================

-- Table de synthèse des événements (purges, exports, anonymisations…) ---------
create table if not exists evenements (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete set null,
  type       text not null,
  detail     jsonb default '{}'::jsonb,
  nb_lignes  integer default 0,
  created_at timestamptz default now()
);
create index if not exists evenements_created_idx on evenements(created_at desc);
alter table evenements enable row level security;
drop policy if exists "spc read evenements" on evenements;
drop policy if exists "spc read evenements" on evenements;
create policy "spc read evenements" on evenements for select to authenticated
  using (org_id is null or spc_member_of(org_id));

-- Interrupteur d'application réelle des purges (dry-run tant que false) --------
create table if not exists rgpd_config (
  id         int primary key default 1,
  enforce    boolean not null default false,
  updated_at timestamptz default now(),
  constraint rgpd_config_singleton check (id = 1)
);
insert into rgpd_config (id, enforce) values (1, false) on conflict (id) do nothing;

-- Fonction de purge globale (security definer) --------------------------------
create or replace function spc_purge_rgpd() returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_enforce boolean := coalesce((select enforce from rgpd_config where id = 1), false);
  v_seuil2  date := current_date - interval '2 years';
  v_seuil12 timestamptz := now() - interval '12 months';
  n integer;
begin
  -- 1) Sessions d'examens / affectations à N+2 ans ---------------------------
  select count(*) into n
  from affectations a
  where a.mission_id in (select id from missions where date_mission < v_seuil2)
     or a.session_id in (select id from sessions  where date < v_seuil2);
  if v_enforce then
    delete from affectations a
    where a.mission_id in (select id from missions where date_mission < v_seuil2)
       or a.session_id in (select id from sessions  where date < v_seuil2);
    delete from sessions where date < v_seuil2;
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_sessions_affectations',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', 'N+2 ans'), n);

  -- 2) Journaux d'actions > 12 mois ------------------------------------------
  select count(*) into n from journal_sessions where created_at < v_seuil12;
  if v_enforce then
    delete from journal_sessions where created_at < v_seuil12;
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_journaux',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '12 mois'), n);

  -- 3) Comptes surveillants inactifs 2 ans → anonymisation -------------------
  --    (compte lié user_id, sans affectation récente). On PRÉSERVE heures /
  --    taux_horaire / nb_examens (agrégats paie conservés 5 ans).
  select count(*) into n
  from surveillants s
  where s.user_id is not null
    and s.nom <> 'Compte supprimé'
    and not exists (
      select 1 from affectations a
      join missions m on m.id = a.mission_id
      where a.surveillant_id = s.id and m.date_mission >= v_seuil2
    );
  if v_enforce then
    update surveillants s set
      nom = 'Compte supprimé',
      prenom = null,
      email = 'supprime-' || s.id || '@anonymise.invalid',
      telephone = null,
      zone = null,
      dispo_matin = null, dispo_apm = null,
      heures_matin = null, heures_aprem = null,
      user_id = null
    where s.user_id is not null
      and s.nom <> 'Compte supprimé'
      and not exists (
        select 1 from affectations a
        join missions m on m.id = a.mission_id
        where a.surveillant_id = s.id and m.date_mission >= v_seuil2
      );
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('anonymisation_comptes_inactifs',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '2 ans', 'agregats_preserves', 'heures/taux/nb_examens'), n);

  -- 4) Candidats (jamais liés à un compte) sans affectation depuis 2 ans → suppression
  select count(*) into n
  from surveillants s
  where s.user_id is null
    and s.created_at < v_seuil2::timestamptz
    and not exists (select 1 from affectations a where a.surveillant_id = s.id);
  if v_enforce then
    delete from surveillants s
    where s.user_id is null
      and s.created_at < v_seuil2::timestamptz
      and not exists (select 1 from affectations a where a.surveillant_id = s.id);
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_candidats',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '2 ans'), n);
end;
$$;

-- Planification pg_cron (hebdomadaire, dimanche 03:00 UTC) --------------------
--
-- pg_cron n'est PAS activé par défaut sur un projet Supabase neuf, et son
-- installation depuis l'éditeur SQL dépend des privilèges du projet. Le garde
-- d'origine ne protégeait que le `unschedule` : `create extension` et
-- `cron.schedule` restaient nus et faisaient échouer toute la migration sur une
-- base sans pg_cron.
--
-- La purge RGPD elle-même (`spc_purge_rgpd`) est créée plus haut et reste
-- appelable à la main. Seule sa PLANIFICATION est optionnelle : son absence ne
-- doit pas empêcher le schéma de se poser. Elle est signalée par un NOTICE,
-- jamais tue.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('spc-purge-rgpd');
exception when others then null; -- extension absente ou tâche non planifiée
end $$;

do $$
begin
  perform cron.schedule('spc-purge-rgpd', '0 3 * * 0', $cron$ select public.spc_purge_rgpd(); $cron$);
exception when others then
  raise notice 'pg_cron indisponible : la purge RGPD n''est PAS planifiée. '
               'Activez pg_cron puis rejouez ce bloc, ou appelez '
               'select spc_purge_rgpd(); manuellement.';
end $$;

-- Exécution manuelle possible : select spc_purge_rgpd();  (dry-run par défaut)
