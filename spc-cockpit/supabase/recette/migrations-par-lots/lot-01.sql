-- ============================================================================
-- SPC Opérations — RECETTE · LOT 1/7
--
-- Migrations de ce lot : 01, 02, 03, 04, 05
--
-- Généré par supabase/recette/generer-lots.py — ne pas éditer à la main.
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 01_operations-base.sql ───────────────────────────────────────────
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

drop policy if exists "Auth read surveillants" on surveillants;
create policy "Auth read surveillants"   on surveillants  for select to authenticated using (true);
drop policy if exists "Auth insert surveillants" on surveillants;
create policy "Auth insert surveillants" on surveillants  for insert to authenticated with check (true);
drop policy if exists "Auth update surveillants" on surveillants;
create policy "Auth update surveillants" on surveillants  for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete surveillants" on surveillants;
create policy "Auth delete surveillants" on surveillants  for delete to authenticated using (true);

drop policy if exists "Auth read missions" on missions;
create policy "Auth read missions"   on missions for select to authenticated using (true);
drop policy if exists "Auth insert missions" on missions;
create policy "Auth insert missions" on missions for insert to authenticated with check (true);
drop policy if exists "Auth update missions" on missions;
create policy "Auth update missions" on missions for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete missions" on missions;
create policy "Auth delete missions" on missions for delete to authenticated using (true);

drop policy if exists "Auth read affectations" on affectations;
create policy "Auth read affectations"   on affectations for select to authenticated using (true);
drop policy if exists "Auth insert affectations" on affectations;
create policy "Auth insert affectations" on affectations for insert to authenticated with check (true);
drop policy if exists "Auth update affectations" on affectations;
create policy "Auth update affectations" on affectations for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete affectations" on affectations;
create policy "Auth delete affectations" on affectations for delete to authenticated using (true);

drop policy if exists "Auth read devis" on devis;
create policy "Auth read devis"   on devis for select to authenticated using (true);
drop policy if exists "Auth insert devis" on devis;
create policy "Auth insert devis" on devis for insert to authenticated with check (true);
drop policy if exists "Auth update devis" on devis;
create policy "Auth update devis" on devis for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete devis" on devis;
create policy "Auth delete devis" on devis for delete to authenticated using (true);

drop policy if exists "Auth read incidents" on incidents;
create policy "Auth read incidents"   on incidents for select to authenticated using (true);
drop policy if exists "Auth insert incidents" on incidents;
create policy "Auth insert incidents" on incidents for insert to authenticated with check (true);
drop policy if exists "Auth update incidents" on incidents;
create policy "Auth update incidents" on incidents for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete incidents" on incidents;
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


-- ── MIGRATION 02_missions-type-montant.sql ───────────────────────────────────────────
-- SPC Opérations — Migration v2 : type de mission + montant estimé
-- À exécuter dans Supabase > SQL Editor (après supabase-operations.sql)

alter table missions add column if not exists type text default 'Examen écrit';
alter table missions add column if not exists montant_ht numeric(10,2) default 0;

update missions set montant_ht = 6400 where reference = 'EX-2026-037' and montant_ht = 0;
update missions set montant_ht = 1925 where reference = 'EX-2026-038' and montant_ht = 0;
update missions set montant_ht = 5200 where reference = 'EX-2026-039' and montant_ht = 0;
update missions set montant_ht = 2600 where reference = 'EX-2026-040' and montant_ht = 0;
update missions set montant_ht = 4042 where reference = 'EX-2026-041' and montant_ht = 0;


-- ── MIGRATION 03_affectations-creneaux.sql ───────────────────────────────────────────
-- SPC Opérations — Migration v3 : planification (salle + créneaux par affectation)
-- À exécuter dans Supabase > SQL Editor (après supabase-operations-v2.sql)

alter table affectations add column if not exists salle text;
alter table affectations add column if not exists matin boolean default false;
alter table affectations add column if not exists matin_debut text;
alter table affectations add column if not exists matin_fin text;
alter table affectations add column if not exists apm boolean default false;
alter table affectations add column if not exists apm_debut text;
alter table affectations add column if not exists apm_fin text;

create unique index if not exists affectations_mission_surveillant
  on affectations(mission_id, surveillant_id);

-- Affectations initiales pour la mission ICP Paris (EX-2026-041)
insert into affectations (mission_id, surveillant_id, role_mission, statut, salle, matin, matin_debut, matin_fin, apm, apm_debut, apm_fin)
select m.id, s.id, s.role, 'Confirmé', v.salle, v.matin, v.matin_debut, v.matin_fin, v.apm, v.apm_debut, v.apm_fin
from missions m
join (values
  ('Marie Lecomte',      'A21', true,  '08:00', '14:00', false, null,    null),
  ('Jean-Pierre Moreau', null,  true,  '08:00', '13:00', true,  '13:30', '18:00'),
  ('Fatima Benali',      null,  false, null,    null,    false, null,    null),
  ('Thomas Girard',      'E31', true,  '08:30', '13:00', true,  '13:30', '18:30'),
  ('Sophie Dubois',      'AMP', false, null,    null,    true,  '13:00', '19:00'),
  ('Karim Haddad',       'A22', true,  '08:30', '13:30', false, null,    null),
  ('Léa Fontaine',       null,  false, null,    null,    false, null,    null),
  ('Marc Petit',         null,  false, null,    null,    false, null,    null)
) as v(nom, salle, matin, matin_debut, matin_fin, apm, apm_debut, apm_fin) on true
join surveillants s on s.nom = v.nom
where m.reference = 'EX-2026-041'
on conflict (mission_id, surveillant_id) do nothing;


-- ── MIGRATION 04_salles.sql ───────────────────────────────────────────
-- SPC Opérations — Migration v4 : salles d'examen
-- À exécuter dans Supabase > SQL Editor (après supabase-operations-v3.sql)

create table if not exists salles (
  id serial primary key,
  nom text not null,
  batiment text,
  etage text,
  capacite integer default 0,
  etudiants integer default 0,
  nb_surveillants integer default 0,
  pmr boolean default false,
  tiers_temps boolean default false,
  created_at timestamptz default now()
);

alter table salles enable row level security;

drop policy if exists "Auth read salles" on salles;
create policy "Auth read salles"   on salles for select to authenticated using (true);
drop policy if exists "Auth insert salles" on salles;
create policy "Auth insert salles" on salles for insert to authenticated with check (true);
drop policy if exists "Auth update salles" on salles;
create policy "Auth update salles" on salles for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete salles" on salles;
create policy "Auth delete salles" on salles for delete to authenticated using (true);

insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('Salle A21',          'Bâtiment A', '2e étage', 80,  75,  2, false, false),
  ('Salle A22',          'Bâtiment A', '2e étage', 80,  72,  2, false, false),
  ('Salle E31',          'Bâtiment E', '3e étage', 30,  8,   2, true,  true),
  ('Grand Amphithéâtre', 'Bâtiment C', 'RDC',      300, 280, 8, false, false),
  ('Salle B11',          'Bâtiment B', '1er étage', 50, 44,  2, false, true)
on conflict do nothing;


-- ── MIGRATION 05_amenagements-factures-presence.sql ───────────────────────────────────────────
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

drop policy if exists "Auth read amenagements" on amenagements;
create policy "Auth read amenagements"   on amenagements for select to authenticated using (true);
drop policy if exists "Auth insert amenagements" on amenagements;
create policy "Auth insert amenagements" on amenagements for insert to authenticated with check (true);
drop policy if exists "Auth update amenagements" on amenagements;
create policy "Auth update amenagements" on amenagements for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete amenagements" on amenagements;
create policy "Auth delete amenagements" on amenagements for delete to authenticated using (true);

drop policy if exists "Auth read factures" on factures;
create policy "Auth read factures"   on factures for select to authenticated using (true);
drop policy if exists "Auth insert factures" on factures;
create policy "Auth insert factures" on factures for insert to authenticated with check (true);
drop policy if exists "Auth update factures" on factures;
create policy "Auth update factures" on factures for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete factures" on factures;
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
