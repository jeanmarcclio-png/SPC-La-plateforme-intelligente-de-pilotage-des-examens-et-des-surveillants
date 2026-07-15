-- ============================================================================
-- SPC — Migration v17 : table `sessions` (sessions d'examen) — SaaS phase 1
--
-- NOUVELLE table distincte de `missions` (décision produit). Modèle de la spec :
--   date, creneau, salle, duree_minutes, statut (prevue|annulee), besoin.
-- Scopée par organisation, RLS stricte dès l'origine (table greenfield, aucune
-- donnée legacy à protéger — pas de mode transition nécessaire ici).
--
-- Cette migration (re)définit aussi les helpers d'autorisation spc_member_of /
-- spc_has_role de façon idempotente, en élargissant la reconnaissance des rôles
-- au vocabulaire de la spec ('admin', 'surveillant'), afin que la table
-- `sessions` fonctionne que la migration v12 ait été appliquée ou non.
-- ============================================================================

-- Helpers d'autorisation (superset compatible v12 + rôles spec) ---------------
create or replace function spc_member_of(target uuid) returns boolean
  language sql stable security definer as $$
    select exists (select 1 from organization_members
                   where user_id = auth.uid() and org_id = target);
  $$;

create or replace function spc_has_role(target uuid, min_rank int) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from organization_members
      where user_id = auth.uid() and org_id = target
        and case lower(role)
              when 'administrateur' then 3
              when 'admin'          then 3
              when 'coordinateur'   then 2
              when 'planificateur'  then 1
              when 'surveillant'    then 0
              when 'lecteur'        then 0
              else 0
            end >= min_rank
    );
  $$;

-- Table sessions -------------------------------------------------------------
create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references organizations(id) on delete cascade,
  date               date,
  creneau            text,                 -- ex. « Matin », « 08:30-11:30 »
  salle              text,
  duree_minutes      integer,
  statut             text default 'prevue',
  besoin_surveillants integer default 0,
  created_at         timestamptz default now(),
  constraint sessions_statut_chk check (statut in ('prevue', 'annulee'))
);

create index if not exists sessions_org_idx  on sessions(org_id);
create index if not exists sessions_date_idx on sessions(date);

alter table sessions enable row level security;

-- select : tout membre de l'organisation de la ligne.
drop policy if exists "spc select sessions" on sessions;
create policy "spc select sessions" on sessions for select to authenticated
  using (spc_member_of(org_id));

-- insert / update : planificateur+ (rang 1).
drop policy if exists "spc insert sessions" on sessions;
create policy "spc insert sessions" on sessions for insert to authenticated
  with check (spc_has_role(org_id, 1));

drop policy if exists "spc update sessions" on sessions;
create policy "spc update sessions" on sessions for update to authenticated
  using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1));

-- delete : administrateur uniquement (rang 3).
drop policy if exists "spc delete sessions" on sessions;
create policy "spc delete sessions" on sessions for delete to authenticated
  using (spc_has_role(org_id, 3));
