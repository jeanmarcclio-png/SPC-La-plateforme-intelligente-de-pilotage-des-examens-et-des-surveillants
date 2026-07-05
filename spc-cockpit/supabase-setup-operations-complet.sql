-- ============================================================================
-- SPC Opérations — SCRIPT UNIQUE CONSOLIDÉ (remplace v1 → v6)
-- Sûr à ré-exécuter : ne casse rien, ne duplique rien.
-- À coller intégralement dans Supabase > SQL Editor > Run
-- ============================================================================

-- ── 1. TABLES ───────────────────────────────────────────────────────────────

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
alter table missions add column if not exists type text default 'Examen écrit';
alter table missions add column if not exists montant_ht numeric(10,2) default 0;

create table if not exists affectations (
  id serial primary key,
  mission_id integer references missions(id) on delete cascade,
  surveillant_id integer references surveillants(id) on delete cascade,
  role_mission text default 'Surveillant salle',
  statut text default 'Proposé',
  heures numeric(5,1) default 0,
  created_at timestamptz default now()
);
alter table affectations add column if not exists salle text;
alter table affectations add column if not exists matin boolean default false;
alter table affectations add column if not exists matin_debut text;
alter table affectations add column if not exists matin_fin text;
alter table affectations add column if not exists apm boolean default false;
alter table affectations add column if not exists apm_debut text;
alter table affectations add column if not exists apm_fin text;
alter table affectations add column if not exists presence text default 'En attente';

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

create table if not exists amenagements (
  id serial primary key,
  amenagement text not null,
  salle text,
  tiers_temps boolean default false,
  surveillant text,
  created_at timestamptz default now()
);

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

-- ── 2. INDEX ANTI-DOUBLONS ─────────────────────────────────────────────────

create unique index if not exists surveillants_nom_uniq on surveillants(nom);
create unique index if not exists salles_nom_uniq on salles(nom);
create unique index if not exists affectations_mission_surveillant on affectations(mission_id, surveillant_id);
create unique index if not exists amenagements_uniq on amenagements(amenagement, salle);
create unique index if not exists incidents_uniq on incidents(titre, date_incident);

-- ── 3. SÉCURITÉ (RLS) ───────────────────────────────────────────────────────

alter table surveillants enable row level security;
alter table missions enable row level security;
alter table affectations enable row level security;
alter table devis enable row level security;
alter table incidents enable row level security;
alter table salles enable row level security;
alter table amenagements enable row level security;
alter table factures enable row level security;

do $$
declare t text;
begin
  foreach t in array array['surveillants','missions','affectations','devis','incidents','salles','amenagements','factures'] loop
    execute format('drop policy if exists "Auth read %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth insert %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth update %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth delete %1$s" on %1$s', t);
    execute format('create policy "Auth read %1$s"   on %1$s for select to authenticated using (true)', t);
    execute format('create policy "Auth insert %1$s" on %1$s for insert to authenticated with check (true)', t);
    execute format('create policy "Auth update %1$s" on %1$s for update to authenticated using (true) with check (true)', t);
    execute format('create policy "Auth delete %1$s" on %1$s for delete to authenticated using (true)', t);
  end loop;
end $$;

-- ── 4. DONNÉES DE DÉMARRAGE ─────────────────────────────────────────────────

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

insert into missions (reference, client, session, date_mission, type, nb_salles, nb_surveillants, montant_ht, statut) values
  ('EX-2026-037', 'HEC Paris',    'Partiels S2',           '2026-05-15', 'Examen écrit', 10, 22, 6400.00, 'Terminée'),
  ('EX-2026-038', 'ESSEC',        'Rattrapages',           '2026-05-20', 'Examen écrit',  3,  7, 1925.00, 'Terminée'),
  ('EX-2026-039', 'Sciences Po',  'Concours écrit 2026',   '2026-05-23', 'Examen écrit',  8, 18, 5200.00, 'Terminée'),
  ('EX-2026-040', 'Dauphine PSL', 'Partiels L3',           '2026-05-26', 'Examen écrit',  4,  9, 2600.00, 'Terminée'),
  ('EX-2026-041', 'ICP Paris',    'Session principale',    '2026-07-08', 'Examen écrit',  6, 14, 4042.00, 'Planifiée')
on conflict (reference) do nothing;

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

insert into devis (reference, client, session, statut, montant_ht, montant_ttc, nb_surveillants) values
  ('SPC-20260514-001', 'Sciences Po',  'Concours écrit 2026',          'Accepté',  5200.00, 6240.00, 18),
  ('SPC-20260524-001', 'ICP Paris',    'Session principale — mai 2026','Brouillon',4042.00, 4850.40, 14),
  ('SPC-20260528-001', 'Dauphine PSL', 'Rattrapages juin 2026',        'Envoyé',   2600.00, 3120.00,  8)
on conflict (reference) do nothing;

insert into incidents (titre, salle, date_incident, gravite, statut, description) values
  ('Fraude suspectée', 'A21', '2026-05-28', 'critique', 'Ouvert', 'Comportement suspect signalé par le surveillant de salle — rapport à valider sous 48h.')
on conflict do nothing;

insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('Salle A21',          'Bâtiment A', '2e étage', 80,  75,  2, false, false),
  ('Salle A22',          'Bâtiment A', '2e étage', 80,  72,  2, false, false),
  ('Salle E31',          'Bâtiment E', '3e étage', 30,  8,   2, true,  true),
  ('Grand Amphithéâtre', 'Bâtiment C', 'RDC',      300, 280, 8, false, false),
  ('Salle B11',          'Bâtiment B', '1er étage', 50, 44,  2, false, true)
on conflict do nothing;

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

-- ── 5. EXEMPLE RÉEL : ICP REIMS — RATTRAPAGES 15-26 JUIN 2026 ───────────────
-- 74 créneaux · 262,3 h · 6 salles · hypothèse 28 € HT/h

insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('B11 Tiers-temps', 'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, true),
  ('B12',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false),
  ('B13 Isolé',       'ICP Reims — Campus', 'Bâtiment B', 1,  1,  1, false, false),
  ('B21 Isolé',       'ICP Reims — Campus', 'Bâtiment B', 1,  1,  1, false, false),
  ('B22',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false),
  ('B23',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false)
on conflict do nothing;

insert into missions (reference, client, session, date_mission, type, nb_salles, nb_surveillants, montant_ht, statut) values
  ('EX-2026-042', 'ICP Reims', 'Rattrapages — semaine du 15 au 19 juin (35 créneaux · 118,2 h)', '2026-06-15', 'Rattrapage', 5, 5, 3310.00, 'Terminée'),
  ('EX-2026-043', 'ICP Reims', 'Rattrapages — semaine du 22 au 26 juin (39 créneaux · 144,1 h)', '2026-06-22', 'Rattrapage', 6, 6, 4035.00, 'Terminée')
on conflict (reference) do nothing;

insert into devis (reference, client, session, statut, montant_ht, montant_ttc, nb_surveillants) values
  ('SPC-20260605-001', 'ICP Reims', 'Rattrapages juin 2026 — 74 créneaux · 262,3 h', 'Accepté', 7345.00, 8814.00, 6)
on conflict (reference) do nothing;

insert into factures (reference, client, session, statut, montant_ht, montant_ttc, emission, echeance) values
  ('FA-2026-003', 'ICP Reims', 'Rattrapages juin 2026', 'Facturée', 7345.00, 8814.00, '2026-06-30', '2026-07-30')
on conflict (reference) do nothing;

insert into amenagements (amenagement, salle, tiers_temps, surveillant) values
  ('Tiers-temps — salle dédiée B11 (ICP Reims)', 'B11', true, null),
  ('Isolement — candidat seul (ICP Reims)',      'B21', false, null),
  ('Isolement — candidat seul (ICP Reims)',      'B13', false, null)
on conflict do nothing;

-- ── FIN — vérification rapide ────────────────────────────────────────────────
select 'surveillants' as table_, count(*) from surveillants
union all select 'missions', count(*) from missions
union all select 'affectations', count(*) from affectations
union all select 'devis', count(*) from devis
union all select 'salles', count(*) from salles
union all select 'amenagements', count(*) from amenagements
union all select 'factures', count(*) from factures
union all select 'incidents', count(*) from incidents;
