-- ============================================================================
-- SPC — Migration v31 : MVP interne « Demandes client » (Phase 1)
--
-- Point d'entrée interne pour structurer une demande de surveillance reçue
-- (mail, téléphone, Excel) AVANT conversion en mission. Aucune donnée client
-- publique, aucun devis : structuration du besoin uniquement.
--
-- Additive et idempotente. Org-scopée (multi-tenant) et RLS stricte, alignée
-- sur le modèle des tables métier existantes (spc_member_of / spc_has_role).
-- ============================================================================

-- 1) Table principale : une demande client -----------------------------------
create table if not exists demandes_client (
  id                    bigint generated always as identity primary key,
  org_id                uuid references organizations(id),
  reference             text not null,
  statut                text not null default 'Brouillon',

  -- Établissement
  etablissement         text not null,
  campus                text,
  adresse               text,
  ville                 text,
  code_postal           text,
  reference_client      text,
  type_etablissement    text,
  contact_administratif text,

  -- Demandeur de surveillance (côté client)
  demandeur_prenom      text,
  demandeur_nom         text,
  demandeur_fonction    text,
  demandeur_email       text,
  demandeur_telephone   text,
  demandeur_service     text,

  -- Responsable client (officiellement responsable côté établissement)
  resp_client_prenom    text,
  resp_client_nom       text,
  resp_client_fonction  text,
  resp_client_email     text,
  resp_client_telephone text,
  resp_client_service   text,

  -- Responsable SPC (interne, chargé du suivi)
  resp_spc              text,
  resp_spc_email        text,
  resp_spc_role         text,

  -- Besoins spécifiques
  pmr_present           boolean not null default false,
  pmr_nombre            integer not null default 0,
  pmr_details           text,
  tiers_temps_present   boolean not null default false,
  tiers_temps_nombre    integer not null default 0,
  tiers_temps_details   text,
  besoins_specifiques   jsonb   not null default '[]'::jsonb,

  observations          text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid
);

-- 2) Table enfant : salles et horaires demandés ------------------------------
create table if not exists demandes_client_salles (
  id                    bigint generated always as identity primary key,
  org_id                uuid references organizations(id),
  demande_id            bigint not null references demandes_client(id) on delete cascade,
  date_examen           date,
  creneau               text,   -- 'matin' | 'apres-midi'
  salle                 text,
  batiment              text,
  etudiants             integer not null default 0,
  surveillants          integer not null default 1,
  pmr                   boolean not null default false,
  tiers_temps           boolean not null default false,
  debut_examen          text,
  fin_examen            text,
  debut_surveillance    text,
  fin_surveillance      text,
  observations          text,
  ordre                 integer not null default 1
);

create index if not exists demandes_client_org_idx        on demandes_client(org_id);
create index if not exists demandes_client_statut_idx     on demandes_client(statut);
create index if not exists dc_salles_org_idx              on demandes_client_salles(org_id);
create index if not exists dc_salles_demande_idx          on demandes_client_salles(demande_id);

-- 3) org_id par défaut : la vraie organisation (cohérent avec v28) -----------
--    Filet de sécurité ; l'application renseigne org_id explicitement.
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
    execute format('alter table demandes_client        alter column org_id set default %L', v_org);
    execute format('alter table demandes_client_salles alter column org_id set default %L', v_org);
  end if;
end $$;

-- 4) RLS stricte, scopée organisation + rôle ---------------------------------
--    select → membre de l'org ; insert/update → planificateur+ (rang 1) ;
--    delete → administrateur (rang 3). Aligné sur v13 (12_rls-strict.sql).
do $$
declare
  t text;
  tables text[] := array['demandes_client','demandes_client_salles'];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "dc select" on %I', t);
    execute format($f$create policy "dc select" on %I for select to authenticated
                     using (org_id is null or spc_member_of(org_id))$f$, t);

    execute format('drop policy if exists "dc insert" on %I', t);
    execute format($f$create policy "dc insert" on %I for insert to authenticated
                     with check (org_id is null or spc_has_role(org_id, 1))$f$, t);

    execute format('drop policy if exists "dc update" on %I', t);
    execute format($f$create policy "dc update" on %I for update to authenticated
                     using (org_id is null or spc_has_role(org_id, 1))
                     with check (org_id is null or spc_has_role(org_id, 1))$f$, t);

    execute format('drop policy if exists "dc delete" on %I', t);
    execute format($f$create policy "dc delete" on %I for delete to authenticated
                     using (org_id is null or spc_has_role(org_id, 3))$f$, t);
  end loop;
end $$;

-- ROLLBACK (manuel) :
--   drop table if exists demandes_client_salles;
--   drop table if exists demandes_client;
