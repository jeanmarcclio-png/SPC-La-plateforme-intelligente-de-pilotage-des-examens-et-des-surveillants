-- SPC Opérations — Migration v5 : PMR/tiers-temps, facturation, présence
-- À exécuter dans Supabase > SQL Editor (après supabase-operations-v4.sql)

-- Aménagements étudiants (PMR / tiers-temps)
create table if not exists amenagements (
  id serial primary key,
  amenagement text not null,
  salle text,
  tiers_temps boolean default false,
  surveillant text,
  created_at timestamptz default now()
);

-- Factures
create table if not exists factures (
  id serial primary key,
  reference text unique not null,
  client text not null,
  session text,
  statut text default 'À facturer',
  montant_ht numeric(10,2) default 0,
  montant_ttc numeric(10,2) default 0,
  emission date,
  echeance date,
  created_at timestamptz default now()
);

-- Émargement des surveillants par affectation
alter table affectations add column if not exists presence text default 'En attente';

alter table amenagements enable row level security;
alter table factures enable row level security;

create policy "Auth read amenagements"   on amenagements for select to authenticated using (true);
create policy "Auth insert amenagements" on amenagements for insert to authenticated with check (true);
create policy "Auth update amenagements" on amenagements for update to authenticated using (true) with check (true);
create policy "Auth delete amenagements" on amenagements for delete to authenticated using (true);

create policy "Auth read factures"   on factures for select to authenticated using (true);
create policy "Auth insert factures" on factures for insert to authenticated with check (true);
create policy "Auth update factures" on factures for update to authenticated using (true) with check (true);
create policy "Auth delete factures" on factures for delete to authenticated using (true);

insert into amenagements (amenagement, salle, tiers_temps, surveillant) values
  ('PMR — Fauteuil roulant',    'E31', true,  'Thomas Girard'),
  ('Tiers-temps',               'E31', true,  'Thomas Girard'),
  ('Tiers-temps + secrétaire',  'B11', true,  'Sophie Dubois'),
  ('PMR — Malvoyant',           'E31', false, 'Thomas Girard')
on conflict do nothing;

insert into factures (reference, client, session, statut, montant_ht, montant_ttc, emission, echeance) values
  ('FA-2026-001', 'Sciences Po',  'Concours écrit 2026',   'Payée',    5200.00, 6240.00, '2026-05-24', '2026-06-23'),
  ('FA-2026-002', 'Dauphine PSL', 'Partiels S4 — Gestion', 'Facturée', 2600.00, 3120.00, '2026-07-03', '2026-08-02')
on conflict (reference) do nothing;
