-- ============================================================================
-- SPC Opérations — Migration v12 : isolation multi-tenant (LOT 1)
-- NON DESTRUCTIVE et NON BLOQUANTE :
--   * crée organizations / organization_members ;
--   * ajoute org_id (NULLABLE) sur les tables métier ;
--   * crée les index ;
--   * sème deux organisations fictives pour tester l'isolation ;
--   * NE durcit PAS encore les policies (voir v13).
-- Les policies permissives restent actives : l'application continue de
-- fonctionner exactement comme avant. Rien n'est supprimé.
-- ============================================================================

-- 1) Organisations et membres ------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,                     -- auth.users.id
  role text not null default 'lecteur',      -- lecteur|planificateur|coordinateur|administrateur
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_user_idx on organization_members(user_id);
create index if not exists org_members_org_idx  on organization_members(org_id);

alter table organizations        enable row level security;
alter table organization_members enable row level security;
-- Un membre voit son organisation et ses appartenances (lecture).
drop policy if exists "member reads own orgs" on organizations;
create policy "member reads own orgs" on organizations for select to authenticated
  using (id in (select org_id from organization_members where user_id = auth.uid()));
drop policy if exists "member reads own memberships" on organization_members;
create policy "member reads own memberships" on organization_members for select to authenticated
  using (user_id = auth.uid());

-- 2) org_id NULLABLE sur les tables métier réellement présentes --------------
alter table missions         add column if not exists org_id uuid references organizations(id);
alter table devis            add column if not exists org_id uuid references organizations(id);
alter table devis_lignes     add column if not exists org_id uuid references organizations(id);
alter table devis_equipe     add column if not exists org_id uuid references organizations(id);
alter table devis_salles     add column if not exists org_id uuid references organizations(id);
alter table salles           add column if not exists org_id uuid references organizations(id);
alter table surveillants     add column if not exists org_id uuid references organizations(id);
alter table affectations     add column if not exists org_id uuid references organizations(id);
alter table amenagements     add column if not exists org_id uuid references organizations(id);
alter table factures         add column if not exists org_id uuid references organizations(id);
alter table incidents        add column if not exists org_id uuid references organizations(id);
alter table journal_sessions add column if not exists org_id uuid references organizations(id);

create index if not exists missions_org_idx         on missions(org_id);
create index if not exists devis_org_idx            on devis(org_id);
create index if not exists devis_lignes_org_idx     on devis_lignes(org_id);
create index if not exists devis_equipe_org_idx     on devis_equipe(org_id);
create index if not exists devis_salles_org_idx     on devis_salles(org_id);
create index if not exists salles_org_idx           on salles(org_id);
create index if not exists surveillants_org_idx     on surveillants(org_id);
create index if not exists affectations_org_idx     on affectations(org_id);
create index if not exists amenagements_org_idx     on amenagements(org_id);
create index if not exists factures_org_idx         on factures(org_id);
create index if not exists incidents_org_idx        on incidents(org_id);
create index if not exists journal_sessions_org_idx on journal_sessions(org_id);

-- 3) Deux organisations fictives pour tester l'isolation ---------------------
insert into organizations (nom)
select 'SPC — Organisation A (démo)'
where not exists (select 1 from organizations where nom = 'SPC — Organisation A (démo)');
insert into organizations (nom)
select 'SPC — Organisation B (démo)'
where not exists (select 1 from organizations where nom = 'SPC — Organisation B (démo)');

-- 4) BACKFILL (à exécuter volontairement) ------------------------------------
--    Rattache toutes les données existantes à l'organisation A par défaut,
--    puis rattache ton utilisateur à cette organisation en tant qu'admin.
--    ⚠️ Décommente et adapte AVANT d'appliquer la v13.
--
-- with orgA as (select id from organizations where nom = 'SPC — Organisation A (démo)' limit 1)
-- update missions         set org_id = (select id from orgA) where org_id is null;
-- update devis            set org_id = (select id from orgA) where org_id is null;
-- update devis_lignes     set org_id = (select id from orgA) where org_id is null;
-- update devis_equipe     set org_id = (select id from orgA) where org_id is null;
-- update devis_salles     set org_id = (select id from orgA) where org_id is null;
-- update salles           set org_id = (select id from orgA) where org_id is null;
-- update surveillants     set org_id = (select id from orgA) where org_id is null;
-- update affectations     set org_id = (select id from orgA) where org_id is null;
-- update amenagements     set org_id = (select id from orgA) where org_id is null;
-- update factures         set org_id = (select id from orgA) where org_id is null;
-- update incidents        set org_id = (select id from orgA) where org_id is null;
-- update journal_sessions set org_id = (select id from orgA) where org_id is null;
--
-- insert into organization_members (org_id, user_id, role)
-- select (select id from organizations where nom = 'SPC — Organisation A (démo)' limit 1),
--        '<TON_AUTH_USER_ID>', 'administrateur'
-- on conflict (org_id, user_id) do update set role = excluded.role;

-- Vérification
select 'organizations' as t, count(*) from organizations
union all select 'organization_members', count(*) from organization_members
union all select 'missions.org_id renseignés', count(*) from missions where org_id is not null;
