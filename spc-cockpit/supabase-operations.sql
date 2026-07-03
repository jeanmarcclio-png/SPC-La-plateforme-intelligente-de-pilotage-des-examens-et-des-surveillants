-- SPC Opérations — Schéma base de données (module examens & surveillants)
-- À exécuter dans Supabase > SQL Editor

-- Surveillants
create table if not exists surveillants (
  id serial primary key,
  nom text not null,
  role text default 'Surveillant salle',
  statut text default 'Disponible',
  email text,
  telephone text,
  qualifications text,
  nb_examens integer default 0,
  heures numeric(6,1) default 0,
  note numeric(2,1) default 0,
  taux_horaire numeric(6,2) default 18,
  created_at timestamptz default now()
);

-- Missions (sessions d'examens)
create table if not exists missions (
  id serial primary key,
  reference text unique not null,
  client text not null,
  session text,
  date_mission date,
  nb_salles integer default 1,
  nb_surveillants integer default 1,
  statut text default 'Planifiée',
  notes text,
  created_at timestamptz default now()
);

-- Affectations surveillant ↔ mission
create table if not exists affectations (
  id serial primary key,
  mission_id integer references missions(id) on delete cascade,
  surveillant_id integer references surveillants(id) on delete cascade,
  role_mission text default 'Surveillant salle',
  statut text default 'Proposé',
  heures numeric(5,1) default 0,
  created_at timestamptz default now()
);

-- Devis
create table if not exists devis (
  id serial primary key,
  reference text unique not null,
  client text not null,
  session text,
  statut text default 'Brouillon',
  montant_ht numeric(10,2) default 0,
  montant_ttc numeric(10,2) default 0,
  nb_surveillants integer default 0,
  mission_id integer references missions(id),
  created_at timestamptz default now()
);

-- Incidents
create table if not exists incidents (
  id serial primary key,
  titre text not null,
  salle text,
  date_incident date,
  gravite text default 'mineur',
  statut text default 'Ouvert',
  description text,
  mission_id integer references missions(id),
  created_at timestamptz default now()
);

-- Row Level Security — CRUD complet pour utilisateurs authentifiés
alter table surveillants enable row level security;
alter table missions enable row level security;
alter table affectations enable row level security;
alter table devis enable row level security;
alter table incidents enable row level security;

create policy "Auth read surveillants"   on surveillants  for select to authenticated using (true);
create policy "Auth insert surveillants" on surveillants  for insert to authenticated with check (true);
create policy "Auth update surveillants" on surveillants  for update to authenticated using (true) with check (true);
create policy "Auth delete surveillants" on surveillants  for delete to authenticated using (true);

create policy "Auth read missions"   on missions for select to authenticated using (true);
create policy "Auth insert missions" on missions for insert to authenticated with check (true);
create policy "Auth update missions" on missions for update to authenticated using (true) with check (true);
create policy "Auth delete missions" on missions for delete to authenticated using (true);

create policy "Auth read affectations"   on affectations for select to authenticated using (true);
create policy "Auth insert affectations" on affectations for insert to authenticated with check (true);
create policy "Auth update affectations" on affectations for update to authenticated using (true) with check (true);
create policy "Auth delete affectations" on affectations for delete to authenticated using (true);

create policy "Auth read devis"   on devis for select to authenticated using (true);
create policy "Auth insert devis" on devis for insert to authenticated with check (true);
create policy "Auth update devis" on devis for update to authenticated using (true) with check (true);
create policy "Auth delete devis" on devis for delete to authenticated using (true);

create policy "Auth read incidents"   on incidents for select to authenticated using (true);
create policy "Auth insert incidents" on incidents for insert to authenticated with check (true);
create policy "Auth update incidents" on incidents for update to authenticated using (true) with check (true);
create policy "Auth delete incidents" on incidents for delete to authenticated using (true);

-- Données initiales
insert into surveillants (nom, role, statut, qualifications, nb_examens, heures, note) values
  ('Marie Lecomte',      'Coordinatrice',      'Planifié',     'Coordination · Tiers-temps', 12, 94,  4.9),
  ('Jean-Pierre Moreau', 'Surveillant volant', 'Planifié',     'Renforts',                    8, 61,  4.7),
  ('Fatima Benali',      'Surveillant salle',  'Annulé',       'Amphithéâtres',              15, 108, 4.8),
  ('Thomas Girard',      'Surveillant PMR',    'Planifié',     'PMR · Tiers-temps',           6, 47,  4.6),
  ('Sophie Dubois',      'Coordinatrice',      'Planifié',     'Coordination',               10, 78,  5.0),
  ('Karim Haddad',       'Surveillant salle',  'Disponible',   'Salles multiples',            9, 66,  4.5),
  ('Léa Fontaine',       'Surveillant volant', 'Disponible',   'Renforts · Concours',         5, 38,  4.8),
  ('Marc Petit',         'Surveillant salle',  'Indisponible', '',                            7, 52,  4.3)
on conflict do nothing;

insert into missions (reference, client, session, date_mission, nb_salles, nb_surveillants, statut) values
  ('EX-2026-037', 'HEC Paris',    'Partiels S2',           '2026-05-15', 10, 22, 'Terminée'),
  ('EX-2026-038', 'ESSEC',        'Rattrapages',           '2026-05-20',  3,  7, 'Terminée'),
  ('EX-2026-039', 'Sciences Po',  'Concours écrit 2026',   '2026-05-23',  8, 18, 'Terminée'),
  ('EX-2026-040', 'Dauphine PSL', 'Partiels L3',           '2026-05-26',  4,  9, 'Terminée'),
  ('EX-2026-041', 'ICP Paris',    'Session principale',    '2026-07-08',  6, 14, 'Planifiée')
on conflict (reference) do nothing;

insert into devis (reference, client, session, statut, montant_ht, montant_ttc, nb_surveillants) values
  ('SPC-20260514-001', 'Sciences Po',  'Concours écrit 2026',          'Accepté',  5200.00, 6240.00, 18),
  ('SPC-20260524-001', 'ICP Paris',    'Session principale — mai 2026','Brouillon',4042.00, 4850.40, 14),
  ('SPC-20260528-001', 'Dauphine PSL', 'Rattrapages juin 2026',        'Envoyé',   2600.00, 3120.00,  8)
on conflict (reference) do nothing;

insert into incidents (titre, salle, date_incident, gravite, statut, description) values
  ('Fraude suspectée', 'A21', '2026-05-28', 'critique', 'Ouvert', 'Comportement suspect signalé par le surveillant de salle — rapport à valider sous 48h.')
on conflict do nothing;
