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
-- Nécessite l'extension pg_cron (à activer une fois dans Supabase).
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule('spc-purge-rgpd');
exception when others then null; -- pas encore planifié : on ignore
end $$;
select cron.schedule('spc-purge-rgpd', '0 3 * * 0', $cron$ select public.spc_purge_rgpd(); $cron$);

-- Exécution manuelle possible : select spc_purge_rgpd();  (dry-run par défaut)
