-- 30 · Table enfant `creneaux` = source de vérité des créneaux de surveillance
--
-- Phase 2 du multi-créneaux : au lieu de stocker les créneaux dans des colonnes
-- (matin_debut/fin, apm_debut/fin) + un jsonb (§29), on les normalise dans une
-- vraie table enfant. Objectif : que TOUS les créneaux d'une demi-journée soient
-- visibles partout (cockpit, portail surveillant, agent Risques IA), avec une
-- seule source de vérité.
--
-- Les colonnes matin*/apm* d'affectations sont conservées (compat + repli), mais
-- `creneaux` fait foi. RLS calquée à l'identique sur celle d'affectations (§23).

create table if not exists public.creneaux (
  id            bigint generated always as identity primary key,
  affectation_id bigint not null references public.affectations(id) on delete cascade,
  org_id        uuid references public.organizations(id),
  periode       text not null check (periode in ('matin', 'apm')),
  debut         text not null,   -- "HH:MM"
  fin           text not null,   -- "HH:MM"
  ordre         int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists creneaux_affectation_idx on public.creneaux(affectation_id);
create index if not exists creneaux_org_idx         on public.creneaux(org_id);

-- Backfill depuis l'existant : la liste jsonb (§29) prime, sinon le créneau
-- unique matin_debut/fin (et apm_debut/fin).
insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'matin',
       (c->>'debut'), (c->>'fin'),
       (ord.n - 1)
from public.affectations a
cross join lateral jsonb_array_elements(a.matin_creneaux) with ordinality as ord(c, n)
where a.matin_creneaux is not null and jsonb_typeof(a.matin_creneaux) = 'array';

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'matin', a.matin_debut, a.matin_fin, 0
from public.affectations a
where a.matin is true and a.matin_creneaux is null
  and a.matin_debut is not null and a.matin_fin is not null;

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'apm',
       (c->>'debut'), (c->>'fin'),
       (ord.n - 1)
from public.affectations a
cross join lateral jsonb_array_elements(a.apm_creneaux) with ordinality as ord(c, n)
where a.apm_creneaux is not null and jsonb_typeof(a.apm_creneaux) = 'array';

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'apm', a.apm_debut, a.apm_fin, 0
from public.affectations a
where a.apm is true and a.apm_creneaux is null
  and a.apm_debut is not null and a.apm_fin is not null;

-- RLS — calquée à l'identique sur affectations (§23) :
--  · coordinateur+ : accès complet
--  · surveillant   : lecture des créneaux de SES affectations uniquement,
--                    aucune écriture directe (le cockpit écrit côté coordinateur).
alter table public.creneaux enable row level security;

drop policy if exists "spc read creneaux"   on public.creneaux;
drop policy if exists "spc insert creneaux" on public.creneaux;
drop policy if exists "spc update creneaux" on public.creneaux;
drop policy if exists "spc delete creneaux" on public.creneaux;

create policy "spc read creneaux" on public.creneaux for select to authenticated
  using (
    not spc_is_surveillant()
    or exists (
      select 1 from public.affectations a
      where a.id = creneaux.affectation_id
        and (spc_owns_surveillant(a.surveillant_id) or spc_owns_surveillant(a.remplacant_id))
    )
  );

create policy "spc insert creneaux" on public.creneaux for insert to authenticated
  with check (not spc_is_surveillant());
create policy "spc update creneaux" on public.creneaux for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
create policy "spc delete creneaux" on public.creneaux for delete to authenticated
  using (not spc_is_surveillant());
