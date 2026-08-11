-- ============================================================================
-- SPC Opérations — RECETTE · LOT 3/7
--
-- Migrations de ce lot : 11, 11b, 12, 13, 14
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 11_org-isolation.sql ───────────────────────────────────────────
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
drop policy if exists "member reads own orgs" on organizations;
create policy "member reads own orgs" on organizations for select to authenticated
  using (id in (select org_id from organization_members where user_id = auth.uid()));
drop policy if exists "member reads own memberships" on organization_members;
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


-- ── MIGRATION 11b_org-id-completion.sql ───────────────────────────────────────────
-- SPC Operations — migration corrective 11b
--
-- CONTEXTE : la migration 12 (RLS strict) crée des policies scopées par
-- `org_id` sur affectations, amenagements, incidents, journal_sessions et
-- factures. Or la migration 11 (org-isolation) n'a ajouté `org_id` qu'à 7
-- tables (missions, devis, devis_lignes, devis_equipe, devis_salles, salles,
-- surveillants). Sans cette correction, la migration 12 échoue (« column
-- org_id does not exist ») — d'où le fonctionnement actuel en mode transition.
--
-- Cette migration NE RÉÉCRIT AUCUNE migration appliquée : elle complète, de
-- façon additive et idempotente, les colonnes `org_id` manquantes. À jouer
-- APRÈS 11_org-isolation et AVANT 12_rls-strict.
--
-- Non destructif : `org_id` reste NULLABLE. Voir docs/AUDIT_SUPABASE_RLS.md
-- pour la stratégie de backfill avant d'activer réellement l'isolation stricte.

alter table affectations     add column if not exists org_id uuid references organizations(id);
alter table amenagements     add column if not exists org_id uuid references organizations(id);
alter table incidents        add column if not exists org_id uuid references organizations(id);
alter table journal_sessions add column if not exists org_id uuid references organizations(id);
alter table factures         add column if not exists org_id uuid references organizations(id);


-- ── MIGRATION 12_rls-strict.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC Opérations — Migration v13 : RLS restrictive par organisation + rôle (LOT 2)
--
-- ⚠️ À APPLIQUER SEULEMENT APRÈS :
--    1. avoir exécuté v12 ;
--    2. avoir fait le BACKFILL (org_id renseigné sur toutes les lignes) ;
--    3. avoir rattaché ton utilisateur via organization_members.
--    Sinon l'application n'affichera plus tes données (org_id NULL non visible).
--
-- Remplace les policies permissives « using(true) » par des policies scopées
-- à l'organisation de l'utilisateur, avec droits par rôle.
--
-- ROLLBACK : réappliquer supabase-setup-operations-complet.sql restaure les
-- policies permissives d'origine (ou voir le bloc « ROLLBACK » en fin de fichier).
-- ============================================================================

-- Helpers ---------------------------------------------------------------------
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
        and case role
              when 'administrateur' then 3
              when 'coordinateur'   then 2
              when 'planificateur'  then 1
              else 0
            end >= min_rank
    );
  $$;

-- Modèle appliqué à chaque table métier (rangs : plan=1, valide/finance=2, admin=3)
--   select  → membre de l'org
--   insert  → planificateur+ (données planning) ; à ajuster pour finance
--   update  → planificateur+
--   delete  → administrateur uniquement
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  -- tables où insert/update = planificateur (rang 1)
  plan_tables text[] := array['missions','salles','surveillants','affectations','amenagements','incidents','devis_salles','journal_sessions'];
  -- tables financières où insert/update = coordinateur (rang 2)
  fin_tables text[]  := array['devis','devis_lignes','devis_equipe','factures'];
begin
  foreach t in array (plan_tables || fin_tables) loop
    execute format('alter table %I enable row level security', t);
    -- purge des policies permissives connues
    execute format('drop policy if exists "Auth read %1$s"   on %1$s', t);
    execute format('drop policy if exists "Auth insert %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth update %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth delete %1$s" on %1$s', t);
    execute format('drop policy if exists "spc select %1$s" on %1$s', t);
    execute format('drop policy if exists "spc insert %1$s" on %1$s', t);
    execute format('drop policy if exists "spc update %1$s" on %1$s', t);
    execute format('drop policy if exists "spc delete %1$s" on %1$s', t);
    -- select : membre de l'organisation de la ligne
    execute format('create policy "spc select %1$s" on %1$s for select to authenticated using (spc_member_of(org_id))', t);
    -- delete : admin de l'org uniquement
    execute format('create policy "spc delete %1$s" on %1$s for delete to authenticated using (spc_has_role(org_id, 3))', t);
  end loop;

  foreach t in array plan_tables loop
    execute format('create policy "spc insert %1$s" on %1$s for insert to authenticated with check (spc_has_role(org_id, 1))', t);
    execute format('create policy "spc update %1$s" on %1$s for update to authenticated using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1))', t);
  end loop;

  foreach t in array fin_tables loop
    execute format('create policy "spc insert %1$s" on %1$s for insert to authenticated with check (spc_has_role(org_id, 2))', t);
    execute format('create policy "spc update %1$s" on %1$s for update to authenticated using (spc_has_role(org_id, 2)) with check (spc_has_role(org_id, 2))', t);
  end loop;
end $$;

-- Vérification : plus aucune policy permissive « true » sur les tables métier
select schemaname, tablename, policyname, qual
from pg_policies
where tablename in ('missions','devis','devis_lignes','devis_equipe','devis_salles',
                    'salles','surveillants','affectations','amenagements','factures',
                    'incidents','journal_sessions')
order by tablename, policyname;

-- ============================================================================
-- ROLLBACK (si besoin de revenir à l'état permissif) :
--   Réexécuter supabase-setup-operations-complet.sql, OU pour chaque table :
--   drop policy if exists "spc select <t>" on <t>; (idem insert/update/delete)
--   create policy "Auth read <t>" on <t> for select to authenticated using (true);
--   ... (recréer les 4 policies permissives)
-- ============================================================================


-- ── MIGRATION 13_surveillants-prenom-zone-dispo.sql ───────────────────────────────────────────
-- SPC Operations — v14
-- Champs structurés pour les surveillants : prénom, zone, disponibilités.
-- À exécuter dans Supabase (SQL Editor). Idempotent : sans effet si déjà appliqué.
-- Aucune donnée existante n'est modifiée ni supprimée ; `nom` reste le nom complet.

alter table public.surveillants
  add column if not exists prenom      text,
  add column if not exists zone        text,
  add column if not exists dispo_matin text,
  add column if not exists dispo_apm   text;

comment on column public.surveillants.prenom      is 'Prénom structuré (le nom complet reste dans « nom »)';
comment on column public.surveillants.zone        is 'Zone / secteur d''intervention';
comment on column public.surveillants.dispo_matin is 'Disponibilité matin (texte libre : horaires ou Oui/Non)';
comment on column public.surveillants.dispo_apm   is 'Disponibilité après-midi (texte libre)';


-- ── MIGRATION 14_user-preferences.sql ───────────────────────────────────────────
-- user_preferences (notifications)
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value boolean not null default false,
  created_at timestamptz default now(),
  unique(user_id, key)
);
alter table user_preferences enable row level security;
drop policy if exists "user own prefs" on user_preferences;
create policy "user own prefs" on user_preferences for all using (auth.uid() = user_id);

-- team_members
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nom text not null,
  role text not null default 'Commercial',
  created_at timestamptz default now()
);
alter table team_members enable row level security;
drop policy if exists "authenticated read team" on team_members;
create policy "authenticated read team" on team_members for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write team" on team_members;
create policy "authenticated write team" on team_members for all using (auth.role() = 'authenticated');

-- email_logs
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  prospect_id text not null,
  type text not null,
  subject text not null,
  sent_at timestamptz not null,
  status text not null default 'sent',
  created_at timestamptz default now()
);
alter table email_logs enable row level security;
drop policy if exists "authenticated read logs" on email_logs;
create policy "authenticated read logs" on email_logs for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write logs" on email_logs;
create policy "authenticated write logs" on email_logs for insert using (auth.role() = 'authenticated');

-- colonne email dans prospects (optionnel)
alter table prospects add column if not exists email text;
