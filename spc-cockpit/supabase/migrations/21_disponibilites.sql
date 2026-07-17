-- ============================================================================
-- SPC — Migration v21 : disponibilités surveillants (portail — phase 2)
--
-- Déclaration de disponibilité par surveillant et par date (matin / après-midi).
-- Contrainte dure consommée par le copilote d'affectation (suggestions.ts) :
-- une date/créneau marqué indisponible ne sera JAMAIS suggéré.
--
-- Additif, idempotent. RLS activée ici ; les policies role-aware sont posées
-- en v23 (bloc unique et auditable pour surveillants/affectations/disponibilites).
-- ============================================================================

create table if not exists disponibilites (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizations(id) on delete cascade,
  surveillant_id integer not null references surveillants(id) on delete cascade,
  date           date not null,
  matin          boolean default false,
  aprem          boolean default false,
  commentaire    text,
  updated_at     timestamptz default now(),
  unique (surveillant_id, date)
);

create index if not exists disponibilites_surv_date_idx on disponibilites(surveillant_id, date);
create index if not exists disponibilites_org_idx        on disponibilites(org_id);

alter table disponibilites enable row level security;

comment on table  disponibilites               is 'Disponibilités déclarées par surveillant et par date (portail /moi).';
comment on column disponibilites.matin         is 'Disponible le matin ce jour-là.';
comment on column disponibilites.aprem         is 'Disponible l''après-midi ce jour-là.';
comment on column disponibilites.commentaire   is 'Note libre du surveillant (ex. « après 10h »).';
