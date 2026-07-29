-- ============================================================================
-- SPC — Migration v32 : Demandes client (Phase 3) — conversion + historique
--
-- Ajoute le lien demande → mission créée, et un journal d'actions par demande
-- (spec §13 conversion, §15 historique). Additive et idempotente, org-scopée.
-- ============================================================================

-- 1) Lien vers la mission issue de la conversion -----------------------------
alter table demandes_client add column if not exists mission_id bigint references missions(id);
create index if not exists demandes_client_mission_idx on demandes_client(mission_id);

-- 2) Journal des actions d'une demande (création, statut, génération, etc.) --
create table if not exists demandes_client_journal (
  id          bigint generated always as identity primary key,
  org_id      uuid references organizations(id),
  demande_id  bigint not null references demandes_client(id) on delete cascade,
  action      text not null,
  detail      text,
  utilisateur text,
  created_at  timestamptz not null default now()
);

create index if not exists dc_journal_org_idx     on demandes_client_journal(org_id);
create index if not exists dc_journal_demande_idx on demandes_client_journal(demande_id);

-- 3) org_id par défaut (cohérent avec v28/v31) ------------------------------
do $$
declare
  v_org uuid;
begin
  select o.id into v_org
  from organizations o
  order by (o.nom ilike '%demo%' or o.nom ilike '%démo%'),
           (select count(*) from organization_members m where m.org_id = o.id) desc,
           o.created_at desc
  limit 1;
  if v_org is not null then
    execute format('alter table demandes_client_journal alter column org_id set default %L', v_org);
  end if;
end $$;

-- 4) RLS : select = membre ; insert = planificateur+ (append-only) -----------
do $$
begin
  execute 'alter table demandes_client_journal enable row level security';
  execute 'drop policy if exists "dcj select" on demandes_client_journal';
  execute $f$create policy "dcj select" on demandes_client_journal for select to authenticated
             using (org_id is null or spc_member_of(org_id))$f$;
  execute 'drop policy if exists "dcj insert" on demandes_client_journal';
  execute $f$create policy "dcj insert" on demandes_client_journal for insert to authenticated
             with check (org_id is null or spc_has_role(org_id, 1))$f$;
end $$;

-- ROLLBACK (manuel) :
--   drop table if exists demandes_client_journal;
--   alter table demandes_client drop column if exists mission_id;
