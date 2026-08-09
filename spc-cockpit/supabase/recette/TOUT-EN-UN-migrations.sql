-- ============================================================================
-- SPC Opérations — RECETTE : les 32 migrations, dans l'ordre, en un seul fichier
--
-- Généré depuis supabase/migrations/. Contenu IDENTIQUE aux fichiers d'origine :
-- seule la concaténation est ajoutée, aucune requête n'a été réécrite.
--
-- À coller intégralement dans Supabase → SQL Editor → Run, sur une base NEUVE.
-- Ordre = ordre de dépendance : ne pas réordonner, ne pas exécuter par morceaux
-- dans le désordre.
--
-- ⚠️ La migration 31 crée des index d'unicité. Sur une base contenant déjà des
--    doublons de salles ou de surveillants, elle ÉCHOUERA — c'est voulu : il
--    faut dédoublonner avant. Sur une base neuve, aucun risque.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 01_operations-base.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 02_missions-type-montant.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v2 : type de mission + montant estimé
-- À exécuter dans Supabase > SQL Editor (après supabase-operations.sql)

alter table missions add column if not exists type text default 'Examen écrit';
alter table missions add column if not exists montant_ht numeric(10,2) default 0;

update missions set montant_ht = 6400 where reference = 'EX-2026-037' and montant_ht = 0;
update missions set montant_ht = 1925 where reference = 'EX-2026-038' and montant_ht = 0;
update missions set montant_ht = 5200 where reference = 'EX-2026-039' and montant_ht = 0;
update missions set montant_ht = 2600 where reference = 'EX-2026-040' and montant_ht = 0;
update missions set montant_ht = 4042 where reference = 'EX-2026-041' and montant_ht = 0;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 03_affectations-creneaux.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 04_salles.sql
-- ─────────────────────────────────────────────────────────────────────────
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

create policy "Auth read salles"   on salles for select to authenticated using (true);
create policy "Auth insert salles" on salles for insert to authenticated with check (true);
create policy "Auth update salles" on salles for update to authenticated using (true) with check (true);
create policy "Auth delete salles" on salles for delete to authenticated using (true);

insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('Salle A21',          'Bâtiment A', '2e étage', 80,  75,  2, false, false),
  ('Salle A22',          'Bâtiment A', '2e étage', 80,  72,  2, false, false),
  ('Salle E31',          'Bâtiment E', '3e étage', 30,  8,   2, true,  true),
  ('Grand Amphithéâtre', 'Bâtiment C', 'RDC',      300, 280, 8, false, false),
  ('Salle B11',          'Bâtiment B', '1er étage', 50, 44,  2, false, true)
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 05_amenagements-factures-presence.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 06_devis-lignes.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v7 : lignes de prestation des devis
-- Permet d'afficher le devis en intégralité (détail + impression PDF)
-- À exécuter dans Supabase > SQL Editor (après le script consolidé)

create table if not exists devis_lignes (
  id serial primary key,
  devis_id integer references devis(id) on delete cascade,
  designation text not null,
  quantite numeric(8,2) default 1,
  unite text default 'forfait',
  prix_unitaire numeric(10,2) default 0,
  ordre integer default 1,
  created_at timestamptz default now()
);

create unique index if not exists devis_lignes_uniq on devis_lignes(devis_id, ordre);

alter table devis_lignes enable row level security;
drop policy if exists "Auth read devis_lignes"   on devis_lignes;
drop policy if exists "Auth insert devis_lignes" on devis_lignes;
drop policy if exists "Auth update devis_lignes" on devis_lignes;
drop policy if exists "Auth delete devis_lignes" on devis_lignes;
create policy "Auth read devis_lignes"   on devis_lignes for select to authenticated using (true);
create policy "Auth insert devis_lignes" on devis_lignes for insert to authenticated with check (true);
create policy "Auth update devis_lignes" on devis_lignes for update to authenticated using (true) with check (true);
create policy "Auth delete devis_lignes" on devis_lignes for delete to authenticated using (true);

-- Correction de cohérence : montants ICP Reims alignés sur le détail des lignes
-- (262,3 h × 28 € = 7 344,40 € HT · 8 813,28 € TTC)
update devis    set montant_ht = 7344.40, montant_ttc = 8813.28 where reference = 'SPC-20260605-001';
update factures set montant_ht = 7344.40, montant_ttc = 8813.28 where reference = 'FA-2026-003';

-- Lignes de prestation
insert into devis_lignes (devis_id, designation, quantite, unite, prix_unitaire, ordre)
select d.id, v.designation, v.quantite, v.unite, v.prix_unitaire, v.ordre
from devis d
join (values
  ('SPC-20260605-001', 'Surveillance rattrapages — semaine du 15 au 19 juin 2026 (35 créneaux, salles B11 TT/B13/B21/B22/B23)', 118.20, 'h', 28.00, 1),
  ('SPC-20260605-001', 'Surveillance rattrapages — semaine du 22 au 26 juin 2026 (39 créneaux, salles B11 TT/B12/B13/B21/B22/B23)', 144.10, 'h', 28.00, 2),
  ('SPC-20260514-001', 'Surveillance concours écrit 2026 — 8 salles · 18 surveillants · coordination incluse', 200.00, 'h', 26.00, 1),
  ('SPC-20260524-001', 'Surveillance session principale mai 2026 — 6 salles · 14 surveillants', 1.00, 'forfait', 4042.00, 1),
  ('SPC-20260528-001', 'Surveillance rattrapages juin 2026 — 4 salles · 8 surveillants', 1.00, 'forfait', 2600.00, 1)
) as v(ref, designation, quantite, unite, prix_unitaire, ordre) on v.ref = d.reference
on conflict (devis_id, ordre) do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 07_devis-salles-champs.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v8 : devis prévisionnel complet
-- Informations client & mission + répartition des salles par session
-- À exécuter dans Supabase > SQL Editor (après la v7)

alter table devis add column if not exists contact text;
alter table devis add column if not exists email text;
alter table devis add column if not exists ville text;
alter table devis add column if not exists type_epreuve text;
alter table devis add column if not exists date_debut date;
alter table devis add column if not exists date_fin date;

create table if not exists devis_salles (
  id serial primary key,
  devis_id integer references devis(id) on delete cascade,
  session text default 'matin',           -- 'matin' | 'apres-midi'
  salle text not null,
  etudiants integer default 0,
  surveillants integer default 1,
  pmr boolean default false,
  tiers_temps boolean default false,
  debut text,                              -- "HH:MM"
  fin text,
  observations text,
  ordre integer default 1,
  created_at timestamptz default now()
);

create unique index if not exists devis_salles_uniq on devis_salles(devis_id, session, salle);

alter table devis_salles enable row level security;
drop policy if exists "Auth read devis_salles"   on devis_salles;
drop policy if exists "Auth insert devis_salles" on devis_salles;
drop policy if exists "Auth update devis_salles" on devis_salles;
drop policy if exists "Auth delete devis_salles" on devis_salles;
create policy "Auth read devis_salles"   on devis_salles for select to authenticated using (true);
create policy "Auth insert devis_salles" on devis_salles for insert to authenticated with check (true);
create policy "Auth update devis_salles" on devis_salles for update to authenticated using (true) with check (true);
create policy "Auth delete devis_salles" on devis_salles for delete to authenticated using (true);

-- Informations client & mission
update devis set
  contact = 'Mathilde Régnier — Pôle Scolarité',
  email = 'scolarite.reims@icp.fr',
  ville = 'Reims',
  type_epreuve = 'Rattrapage',
  date_debut = '2026-06-15',
  date_fin = '2026-06-26'
where reference = 'SPC-20260605-001';

update devis set
  contact = 'Service scolarité',
  email = 'scol@sciencespo.fr',
  ville = 'Paris',
  type_epreuve = 'Concours',
  date_debut = '2026-05-23',
  date_fin = '2026-05-23'
where reference = 'SPC-20260514-001';

update devis set
  contact = 'Direction des examens',
  email = 'examens@icp.fr',
  ville = 'Paris',
  type_epreuve = 'Examen écrit',
  date_debut = '2026-07-08',
  date_fin = '2026-07-08'
where reference = 'SPC-20260524-001';

update devis set
  contact = 'Scolarité Gestion',
  email = 'scolarite@dauphine.psl.eu',
  ville = 'Paris',
  type_epreuve = 'Rattrapage',
  date_debut = '2026-06-10',
  date_fin = '2026-06-12'
where reference = 'SPC-20260528-001';

-- Répartition des salles
insert into devis_salles (devis_id, session, salle, etudiants, surveillants, pmr, tiers_temps, debut, fin, observations, ordre)
select d.id, v.session, v.salle, v.etudiants, v.surveillants, v.pmr, v.tiers_temps, v.debut, v.fin, v.observations, v.ordre
from devis d
join (values
  -- ICP Reims — matin (répartition type d'une journée de rattrapages)
  ('SPC-20260605-001', 'matin', 'B22',             30, 1, false, false, '08:30', '12:15', null, 1),
  ('SPC-20260605-001', 'matin', 'B23',             30, 1, false, false, '08:30', '12:15', null, 2),
  ('SPC-20260605-001', 'matin', 'B12',             30, 1, false, false, '08:30', '12:45', 'Semaine 2 uniquement', 3),
  ('SPC-20260605-001', 'matin', 'B11 Tiers-temps', 30, 1, false, true,  '08:30', '13:15', 'Durées majorées 1/3', 4),
  ('SPC-20260605-001', 'matin', 'B21 Isolé',        1, 1, false, false, '08:30', '13:15', 'Candidat isolé', 5),
  ('SPC-20260605-001', 'matin', 'B13 Isolé',        1, 1, false, false, '09:30', '12:35', 'Candidat isolé', 6),
  -- ICP Reims — après-midi
  ('SPC-20260605-001', 'apres-midi', 'B22',             30, 1, false, false, '13:30', '16:15', null, 1),
  ('SPC-20260605-001', 'apres-midi', 'B23',             30, 1, false, false, '13:30', '16:15', null, 2),
  ('SPC-20260605-001', 'apres-midi', 'B11 Tiers-temps', 30, 1, false, true,  '13:30', '17:05', 'Durées majorées 1/3', 3),
  ('SPC-20260605-001', 'apres-midi', 'B21 Isolé',        1, 1, false, false, '13:30', '16:55', 'Candidat isolé', 4),
  -- Sciences Po — matin
  ('SPC-20260514-001', 'matin', 'A101', 35, 2, false, false, '08:00', '13:00', null, 1),
  ('SPC-20260514-001', 'matin', 'A102', 35, 2, false, false, '08:00', '13:00', null, 2),
  ('SPC-20260514-001', 'matin', 'A103', 30, 2, false, false, '08:00', '13:00', null, 3),
  ('SPC-20260514-001', 'matin', 'B201', 35, 2, false, false, '08:00', '13:00', null, 4),
  ('SPC-20260514-001', 'matin', 'B202', 35, 2, false, false, '08:00', '13:00', null, 5)
) as v(ref, session, salle, etudiants, surveillants, pmr, tiers_temps, debut, fin, observations, ordre) on v.ref = d.reference
on conflict (devis_id, session, salle) do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 08_devis-equipe-frais.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v9 : devis expert
-- Équipe & volume horaire, lignes financières, lien facture↔devis
-- À exécuter dans Supabase > SQL Editor (après la v8)

alter table devis add column if not exists frais_deplacement numeric(10,2) default 0;
alter table devis add column if not exists frais_coordination numeric(10,2) default 0;
alter table devis add column if not exists remise numeric(10,2) default 0;

alter table factures add column if not exists devis_id integer references devis(id);

update factures set devis_id = (select id from devis where reference = 'SPC-20260605-001')
where reference = 'FA-2026-003' and devis_id is null;
update factures set devis_id = (select id from devis where reference = 'SPC-20260514-001')
where reference = 'FA-2026-001' and devis_id is null;

-- Équipe & volume horaire par devis
create table if not exists devis_equipe (
  id serial primary key,
  devis_id integer references devis(id) on delete cascade,
  role text not null,
  effectif integer default 1,
  heures_pers numeric(6,2) default 0,   -- heures facturées par personne
  taux_h numeric(8,2) default 0,
  ordre integer default 1,
  created_at timestamptz default now()
);

create unique index if not exists devis_equipe_uniq on devis_equipe(devis_id, role);

alter table devis_equipe enable row level security;
drop policy if exists "Auth read devis_equipe"   on devis_equipe;
drop policy if exists "Auth insert devis_equipe" on devis_equipe;
drop policy if exists "Auth update devis_equipe" on devis_equipe;
drop policy if exists "Auth delete devis_equipe" on devis_equipe;
create policy "Auth read devis_equipe"   on devis_equipe for select to authenticated using (true);
create policy "Auth insert devis_equipe" on devis_equipe for insert to authenticated with check (true);
create policy "Auth update devis_equipe" on devis_equipe for update to authenticated using (true) with check (true);
create policy "Auth delete devis_equipe" on devis_equipe for delete to authenticated using (true);

-- Équipe ICP Reims — cohérente avec les lignes (262,3 h × 28 € = 7 344,40 € HT)
insert into devis_equipe (devis_id, role, effectif, heures_pers, taux_h, ordre)
select d.id, v.role, v.effectif, v.heures_pers, v.taux_h, v.ordre
from devis d
join (values
  ('SPC-20260605-001', 'Surveillant·e en salle — semaine du 15 au 19 juin', 5, 23.64, 28.00, 1),
  ('SPC-20260605-001', 'Surveillant·e en salle — semaine du 22 au 26 juin', 5, 28.82, 28.00, 2)
) as v(ref, role, effectif, heures_pers, taux_h, ordre) on v.ref = d.reference
on conflict (devis_id, role) do nothing;

-- Équipe Sciences Po — exactement 5 200 € HT (700 + 4 500), effectif 18
insert into devis_equipe (devis_id, role, effectif, heures_pers, taux_h, ordre)
select d.id, v.role, v.effectif, v.heures_pers, v.taux_h, v.ordre
from devis d
join (values
  ('SPC-20260514-001', 'Coordinateur·rice',      2, 10.00, 35.00, 1),
  ('SPC-20260514-001', 'Surveillant·e en salle', 16, 11.25, 25.00, 2)
) as v(ref, role, effectif, heures_pers, taux_h, ordre) on v.ref = d.reference
on conflict (devis_id, role) do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 09_devis-coefficient.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v10 : coefficient d'ajustement du devis
-- (Master Prompt §10.5 — 1.00 = aucun ajustement, appliqué une seule fois
-- à la base brute HT, avant les frais)
-- À exécuter dans Supabase > SQL Editor (après la v9)

alter table devis add column if not exists coefficient numeric(5,2) default 1.00;

update devis set coefficient = 1.00 where coefficient is null or coefficient <= 0;

-- Vérification
select reference, coefficient from devis order by id;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 10_journal-sessions.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v11 : journal de session (Master Prompt §15.6)
-- Historique append-only : utilisateur, date/heure, objet, ancienne et
-- nouvelle valeur. Aucune policy UPDATE/DELETE : les entrées sont immuables
-- pour les utilisateurs ordinaires.
-- À exécuter dans Supabase > SQL Editor (après la v10)

create table if not exists journal_sessions (
  id serial primary key,
  mission_id integer references missions(id) on delete cascade,
  utilisateur text not null default 'inconnu',
  objet text not null,          -- ex : "Affectation — Fatima Benali"
  ancienne text,                -- valeur avant (null pour un ajout)
  nouvelle text,                -- valeur après (null pour une suppression)
  created_at timestamptz default now()
);

create index if not exists journal_sessions_mission_idx on journal_sessions(mission_id, created_at desc);

alter table journal_sessions enable row level security;
drop policy if exists "Auth read journal"   on journal_sessions;
drop policy if exists "Auth insert journal" on journal_sessions;
create policy "Auth read journal"   on journal_sessions for select to authenticated using (true);
create policy "Auth insert journal" on journal_sessions for insert to authenticated with check (true);
-- Volontairement AUCUNE policy update/delete : journal immuable.

-- Vérification
select count(*) as entrees_journal from journal_sessions;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 11_org-isolation.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 11b_org-id-completion.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 12_rls-strict.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 13_surveillants-prenom-zone-dispo.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 14_user-preferences.sql
-- ─────────────────────────────────────────────────────────────────────────
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
create policy "authenticated read team" on team_members for select using (auth.role() = 'authenticated');
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
create policy "authenticated read logs" on email_logs for select using (auth.role() = 'authenticated');
create policy "authenticated write logs" on email_logs for insert using (auth.role() = 'authenticated');

-- colonne email dans prospects (optionnel)
alter table prospects add column if not exists email text;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 15_profiles.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v15 : table profiles (SaaS multi-tenant, phase 1)
--
-- Profil applicatif adossé 1:1 à auth.users. Alimenté automatiquement à la
-- création d'un compte (trigger), et modifiable par son propriétaire uniquement.
-- Additif et idempotent : ne touche à aucune table métier existante.
-- ============================================================================

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nom        text,
  telephone  text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Un utilisateur ne voit et ne modifie que SON profil.
drop policy if exists "profile self select" on profiles;
create policy "profile self select" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profile self insert" on profiles;
create policy "profile self insert" on profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profile self update" on profiles;
create policy "profile self update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Création automatique du profil à l'inscription d'un compte auth.
-- security definer : le trigger s'exécute avec les droits du propriétaire du
-- schéma, indispensable pour écrire dans public.profiles depuis auth.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, telephone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'telephone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill des comptes déjà existants (idempotent).
insert into public.profiles (id, nom)
select u.id, coalesce(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'full_name')
from auth.users u
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 16_org-parametres.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v16 : paramètres d'organisation (SaaS multi-tenant, phase 1)
--
-- Complète la table `organizations` (créée en v11) avec les champs attendus par
-- la spec SaaS : slug unique, taux horaire et coefficient net par organisation.
-- Additif et idempotent. Ne réécrit aucune donnée existante.
--
-- Valeurs par défaut alignées sur le moteur financier SPC :
--   taux_horaire    = 12.31  (€/h)
--   coefficient_net = 0.7824 (net / brut)
-- ============================================================================

alter table organizations
  add column if not exists slug            text,
  add column if not exists taux_horaire    numeric(6,2) default 12.31,
  add column if not exists coefficient_net numeric(6,4) default 0.7824;

-- Slug unique quand renseigné (les lignes legacy sans slug ne bloquent pas).
create unique index if not exists organizations_slug_key
  on organizations(slug) where slug is not null;

-- Renseigne un slug pour les organisations de démo existantes si absent
-- (slugify minimal : minuscules, tirets, sans accents).
update organizations
set slug = regexp_replace(
             regexp_replace(lower(translate(nom, 'àâäéèêëîïôöûüç', 'aaaeeeeiioouuc')), '[^a-z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g')
where slug is null;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 17_sessions.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v17 : table `sessions` (sessions d'examen) — SaaS phase 1
--
-- NOUVELLE table distincte de `missions` (décision produit). Modèle de la spec :
--   date, creneau, salle, duree_minutes, statut (prevue|annulee), besoin.
-- Scopée par organisation, RLS stricte dès l'origine (table greenfield, aucune
-- donnée legacy à protéger — pas de mode transition nécessaire ici).
--
-- Cette migration (re)définit aussi les helpers d'autorisation spc_member_of /
-- spc_has_role de façon idempotente, en élargissant la reconnaissance des rôles
-- au vocabulaire de la spec ('admin', 'surveillant'), afin que la table
-- `sessions` fonctionne que la migration v12 ait été appliquée ou non.
-- ============================================================================

-- Helpers d'autorisation (superset compatible v12 + rôles spec) ---------------
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
        and case lower(role)
              when 'administrateur' then 3
              when 'admin'          then 3
              when 'coordinateur'   then 2
              when 'planificateur'  then 1
              when 'surveillant'    then 0
              when 'lecteur'        then 0
              else 0
            end >= min_rank
    );
  $$;

-- Table sessions -------------------------------------------------------------
create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references organizations(id) on delete cascade,
  date               date,
  creneau            text,                 -- ex. « Matin », « 08:30-11:30 »
  salle              text,
  duree_minutes      integer,
  statut             text default 'prevue',
  besoin_surveillants integer default 0,
  created_at         timestamptz default now(),
  constraint sessions_statut_chk check (statut in ('prevue', 'annulee'))
);

create index if not exists sessions_org_idx  on sessions(org_id);
create index if not exists sessions_date_idx on sessions(date);

alter table sessions enable row level security;

-- select : tout membre de l'organisation de la ligne.
drop policy if exists "spc select sessions" on sessions;
create policy "spc select sessions" on sessions for select to authenticated
  using (spc_member_of(org_id));

-- insert / update : planificateur+ (rang 1).
drop policy if exists "spc insert sessions" on sessions;
create policy "spc insert sessions" on sessions for insert to authenticated
  with check (spc_has_role(org_id, 1));

drop policy if exists "spc update sessions" on sessions;
create policy "spc update sessions" on sessions for update to authenticated
  using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1));

-- delete : administrateur uniquement (rang 3).
drop policy if exists "spc delete sessions" on sessions;
create policy "spc delete sessions" on sessions for delete to authenticated
  using (spc_has_role(org_id, 3));


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 18_surveillants-affectations-liens.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v18 : alignement surveillants / affectations sur la spec SaaS
--
-- Additif et NON destructif. On NE réécrit PAS les colonnes existantes
-- (`dispo_matin`, `dispo_apm`, `statut`…) : on complète le modèle avec les
-- champs attendus par la spec, en cohérence avec l'existant.
--
--  surveillants : matin/aprem (booléens) + heures_matin/heures_aprem (texte),
--                 user_id (lien futur vers un compte auth — portail phase 2).
--  affectations : session_id (lien vers la nouvelle table sessions),
--                 remplacant_id (surveillant remplaçant).
--
-- NB statut d'affectation : conservé en texte libre pour ne pas casser les
-- lignes existantes ('Proposé', 'Confirmé'). Vocabulaire cible documenté :
--   'prevue' | 'confirmee' | 'annulee' | 'remplacee'.
-- ============================================================================

-- Surveillants ---------------------------------------------------------------
alter table surveillants
  add column if not exists matin         boolean default false,
  add column if not exists aprem         boolean default false,
  add column if not exists heures_matin  text,
  add column if not exists heures_aprem  text,
  add column if not exists user_id       uuid references auth.users(id) on delete set null;

create index if not exists surveillants_user_idx on surveillants(user_id);

comment on column surveillants.matin        is 'Disponible le matin (booléen). Complète dispo_matin (texte libre).';
comment on column surveillants.aprem        is 'Disponible l''après-midi (booléen). Complète dispo_apm (texte libre).';
comment on column surveillants.heures_matin is 'Plage horaire matin (texte, ex. « 08:30-11:30 »).';
comment on column surveillants.heures_aprem is 'Plage horaire après-midi (texte).';
comment on column surveillants.user_id      is 'Lien futur vers auth.users (portail surveillant, phase 2). NULL tant que non rattaché.';

-- Affectations ---------------------------------------------------------------
alter table affectations
  add column if not exists session_id    uuid references sessions(id) on delete cascade,
  add column if not exists remplacant_id integer references surveillants(id) on delete set null;

create index if not exists affectations_session_idx    on affectations(session_id);
create index if not exists affectations_remplacant_idx on affectations(remplacant_id);

comment on column affectations.session_id    is 'Lien vers sessions (spec SaaS). Coexiste avec mission_id (modèle Opérations).';
comment on column affectations.remplacant_id is 'Surveillant remplaçant (statut « remplacee »).';


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 19_rls-surveillant.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v19 : rôle « surveillant » (préparation phase 2)
--
-- MODE TRANSITION (choix projet) : cette migration installe les HELPERS et
-- documente le durcissement, mais NE bascule PAS encore les policies
-- permissives d'affectations. Le durcissement réel (bloc « HARDENING » ci-bas)
-- s'applique en même temps que la v12 (RLS stricte), au go-live.
--
-- Règle cible (spec §2) :
--   admin / coordinateur / planificateur → lecture-écriture (via spc_has_role) ;
--   surveillant → LECTURE SEULE, et uniquement SES propres affectations
--   (celles où il est le surveillant affecté ou le remplaçant).
-- ============================================================================

-- Rôle applicatif de l'utilisateur dans une organisation (ou NULL). ----------
create or replace function spc_role_in(target uuid) returns text
  language sql stable security definer as $$
    select lower(role) from organization_members
    where user_id = auth.uid() and org_id = target limit 1;
  $$;

-- Vrai si l'utilisateur peut LIRE cette affectation :
--  - membre non-surveillant de l'org (accès complet en lecture) ; OU
--  - surveillant rattaché (surveillants.user_id = auth.uid()) et l'affectation
--    le concerne (surveillant_id ou remplacant_id).
create or replace function spc_can_read_affectation(
  p_org uuid, p_surveillant_id integer, p_remplacant_id integer
) returns boolean
  language sql stable security definer as $$
    select
      spc_member_of(p_org)
      and (
        coalesce(spc_role_in(p_org), '') <> 'surveillant'
        or exists (
          select 1 from surveillants s
          where s.user_id = auth.uid()
            and s.id in (p_surveillant_id, p_remplacant_id)
        )
      );
  $$;

-- ============================================================================
-- HARDENING (à exécuter avec la v12, PAS en mode transition) :
--
--   -- Purge des policies permissives d'affectations
--   drop policy if exists "Auth read affectations"   on affectations;
--   drop policy if exists "Auth insert affectations" on affectations;
--   drop policy if exists "Auth update affectations" on affectations;
--   drop policy if exists "Auth delete affectations" on affectations;
--   drop policy if exists "spc select affectations"  on affectations;
--
--   -- Lecture scopée surveillant
--   create policy "spc select affectations" on affectations for select to authenticated
--     using (spc_can_read_affectation(org_id, surveillant_id, remplacant_id));
--
--   -- Écriture réservée planificateur+ (le surveillant reste lecture seule)
--   create policy "spc insert affectations" on affectations for insert to authenticated
--     with check (spc_has_role(org_id, 1));
--   create policy "spc update affectations" on affectations for update to authenticated
--     using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1));
--   create policy "spc delete affectations" on affectations for delete to authenticated
--     using (spc_has_role(org_id, 3));
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 20_onboarding-rpc.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v20 : RPC d'onboarding (création d'organisation)
--
-- Création d'une organisation + rattachement du créateur en 'admin', de façon
-- atomique et sûre. security definer : contourne l'absence volontaire de policy
-- INSERT permissive sur organizations / organization_members (on ne veut PAS
-- qu'un utilisateur puisse s'ajouter arbitrairement à n'importe quelle org).
--
-- La fonction n'agit QUE pour l'utilisateur authentifié appelant (auth.uid()).
-- ============================================================================

create or replace function public.spc_create_organization(
  p_nom   text,
  p_taux  numeric default 12.31,
  p_coeff numeric default 0.7824
) returns uuid
  language plpgsql
  security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_slug text;
  v_base text;
  v_org  uuid;
  v_n    int := 0;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Le nom de l''organisation est obligatoire';
  end if;

  -- slugify (minuscules, sans accents, tirets)
  v_base := regexp_replace(
              regexp_replace(lower(translate(p_nom, 'àâäéèêëîïôöûüç', 'aaaeeeeiioouuc')), '[^a-z0-9]+', '-', 'g'),
              '(^-+|-+$)', '', 'g');
  if v_base = '' then v_base := 'org'; end if;
  v_slug := v_base;
  while exists (select 1 from organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into organizations (nom, slug, taux_horaire, coefficient_net)
  values (trim(p_nom), v_slug, coalesce(p_taux, 12.31), coalesce(p_coeff, 0.7824))
  returning id into v_org;

  insert into organization_members (org_id, user_id, role)
  values (v_org, v_uid, 'admin')
  on conflict (org_id, user_id) do update set role = 'admin';

  return v_org;
end;
$$;

-- Exécutable par les utilisateurs authentifiés uniquement.
revoke all on function public.spc_create_organization(text, numeric, numeric) from public;
grant execute on function public.spc_create_organization(text, numeric, numeric) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 21_disponibilites.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 22_affectations-decline.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v22 : refus d'affectation + statut d'invitation (phase 2)
--
-- Un REFUS ne modifie jamais le planning : il pose un drapeau `decline` + un
-- `motif` sur l'affectation (le statut reste 'prevue'/'Proposé'). Le coordinateur
-- décide ensuite (remplacement, annulation).
--
-- Ajoute aussi `surveillants.invited_at` pour tracer le statut d'invitation :
--   user_id non NULL        → compte actif
--   invited_at non NULL     → invité (en attente d'activation)
--   sinon                   → non invité
--
-- Additif, non destructif, idempotent.
-- ============================================================================

alter table affectations
  add column if not exists decline    boolean default false,
  add column if not exists motif      text,
  add column if not exists decided_at timestamptz;

create index if not exists affectations_decline_idx on affectations(decline) where decline = true;

comment on column affectations.decline    is 'Refus surveillant (le planning n''est PAS modifié ; le coordinateur tranche).';
comment on column affectations.motif      is 'Motif optionnel du refus.';
comment on column affectations.decided_at is 'Horodatage de la confirmation / du refus par le surveillant.';

alter table surveillants
  add column if not exists invited_at timestamptz;

comment on column surveillants.invited_at is 'Date d''envoi de l''invitation (statut : non invité / invité / compte actif via user_id).';


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 23_rls-portail-surveillant.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v23 : RLS role-aware pour le portail surveillant (phase 2)
--
-- Objectif (spec §5) : le rôle 'surveillant' ne LIT que SES données et n'ÉCRIT
-- (directement) que SES disponibilités ; la confirmation/refus d'affectation
-- passe par des RPC contrôlées (v24). Les rôles coordinateur/admin/planificateur
-- conservent l'accès complet à l'organisation (aucune régression cockpit).
--
-- Conçu pour être NON BLOQUANT en mode transition : les policies ne dépendent
-- PAS de org_id (qui peut être NULL sur des lignes legacy) mais du RÔLE de
-- l'utilisateur et du LIEN surveillants.user_id = auth.uid(). Les lignes à
-- org_id NULL restent donc visibles pour le coordinateur, comme aujourd'hui.
-- ============================================================================

-- Helpers -------------------------------------------------------------------
-- L'utilisateur courant est-il un surveillant (rôle 'surveillant' quelque part) ?
create or replace function spc_is_surveillant() returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from organization_members
      where user_id = auth.uid() and lower(role) = 'surveillant'
    );
  $$;

-- La ligne surveillants d'id `sid` est-elle rattachée au compte courant ?
create or replace function spc_owns_surveillant(sid integer) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from surveillants
      where id = sid and user_id = auth.uid()
    );
  $$;

-- SURVEILLANTS ---------------------------------------------------------------
alter table surveillants enable row level security;
drop policy if exists "Auth read surveillants"   on surveillants;
drop policy if exists "Auth insert surveillants" on surveillants;
drop policy if exists "Auth update surveillants" on surveillants;
drop policy if exists "Auth delete surveillants" on surveillants;
drop policy if exists "spc read surveillants"    on surveillants;
drop policy if exists "spc write surveillants"   on surveillants;

-- Lecture : coordinateur = tout ; surveillant = sa seule fiche (pas de fuite
-- de téléphone/heures d'autrui).
create policy "spc read surveillants" on surveillants for select to authenticated
  using (not spc_is_surveillant() or user_id = auth.uid());

-- Écriture (insert/update/delete) : réservée aux non-surveillants (coordinateur+).
create policy "spc insert surveillants" on surveillants for insert to authenticated
  with check (not spc_is_surveillant());
create policy "spc update surveillants" on surveillants for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
create policy "spc delete surveillants" on surveillants for delete to authenticated
  using (not spc_is_surveillant());

-- AFFECTATIONS ---------------------------------------------------------------
alter table affectations enable row level security;
drop policy if exists "Auth read affectations"   on affectations;
drop policy if exists "Auth insert affectations" on affectations;
drop policy if exists "Auth update affectations" on affectations;
drop policy if exists "Auth delete affectations" on affectations;
drop policy if exists "spc read affectations"    on affectations;

-- Lecture : coordinateur = tout ; surveillant = uniquement les affectations
-- où il est le surveillant affecté ou le remplaçant.
create policy "spc read affectations" on affectations for select to authenticated
  using (
    not spc_is_surveillant()
    or spc_owns_surveillant(surveillant_id)
    or spc_owns_surveillant(remplacant_id)
  );

-- Écriture directe : coordinateur+ uniquement. Le surveillant confirme/refuse
-- via les RPC de la v24 (contrôle de propriété + colonnes limitées).
create policy "spc insert affectations" on affectations for insert to authenticated
  with check (not spc_is_surveillant());
create policy "spc update affectations" on affectations for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
create policy "spc delete affectations" on affectations for delete to authenticated
  using (not spc_is_surveillant());

-- DISPONIBILITES -------------------------------------------------------------
drop policy if exists "spc read disponibilites"   on disponibilites;
drop policy if exists "spc insert disponibilites" on disponibilites;
drop policy if exists "spc update disponibilites" on disponibilites;
drop policy if exists "spc delete disponibilites" on disponibilites;

-- Lecture : coordinateur = tout ; surveillant = les siennes.
create policy "spc read disponibilites" on disponibilites for select to authenticated
  using (not spc_is_surveillant() or spc_owns_surveillant(surveillant_id));

-- Écriture : le surveillant gère les SIENNES ; le coordinateur peut aussi saisir.
create policy "spc insert disponibilites" on disponibilites for insert to authenticated
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
create policy "spc update disponibilites" on disponibilites for update to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
create policy "spc delete disponibilites" on disponibilites for delete to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 24_portail-rpc.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v24 : RPC du portail surveillant (confirmer / décliner)
--
-- Le surveillant n'a PAS le droit d'UPDATE direct sur affectations (v23). Ces
-- RPC security definer garantissent qu'il n'agit QUE sur SES affectations et ne
-- touche QUE les colonnes autorisées (statut / decline / motif / decided_at).
--
--  confirmer → statut = 'confirmee' (efface un éventuel refus)
--  décliner  → decline = true + motif ; le STATUT/planning reste INCHANGÉ
--              (le coordinateur tranche : remplacement ou annulation).
-- ============================================================================

create or replace function public.spc_confirmer_affectation(p_affectation_id integer)
  returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  update affectations
     set statut = 'confirmee', decline = false, motif = null, decided_at = now()
   where id = p_affectation_id;
end;
$$;

create or replace function public.spc_decliner_affectation(
  p_affectation_id integer,
  p_motif text default null
) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  -- Refus motivé : on NE modifie PAS le statut (planning intact), on lève le drapeau.
  update affectations
     set decline = true,
         motif = nullif(trim(coalesce(p_motif, '')), ''),
         decided_at = now()
   where id = p_affectation_id;
end;
$$;

revoke all on function public.spc_confirmer_affectation(integer) from public;
revoke all on function public.spc_decliner_affectation(integer, text) from public;
grant execute on function public.spc_confirmer_affectation(integer) to authenticated;
grant execute on function public.spc_decliner_affectation(integer, text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 25_rgpd-purges.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v25 : RGPD — table evenements + purges automatisées (pg_cron)
--
-- Durées de conservation appliquées (politique de confidentialité §5) :
--   * sessions d'examens / affectations  → purge à N+2 ans
--   * journaux (journal_sessions)         → 12 mois
--   * comptes inactifs 2 ans              → anonymisation (email/nom/tel),
--                                           agrégats d'heures conservés (paie 5 ans)
--   * candidats sans affectation 2 ans    → suppression
--
-- MODE DRY-RUN PAR DÉFAUT : la fonction lit rgpd_config.enforce (false par
-- défaut). Tant que enforce = false, elle COMPTE et journalise dans `evenements`
-- SANS rien supprimer. Passage en réel : update rgpd_config set enforce = true.
-- (Équivalent « variable d'env » adapté à pg_cron, qui s'exécute en base.)
--
-- Idempotent.
-- ============================================================================

-- Table de synthèse des événements (purges, exports, anonymisations…) ---------
create table if not exists evenements (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid references organizations(id) on delete set null,
  type       text not null,
  detail     jsonb default '{}'::jsonb,
  nb_lignes  integer default 0,
  created_at timestamptz default now()
);
create index if not exists evenements_created_idx on evenements(created_at desc);
alter table evenements enable row level security;
drop policy if exists "spc read evenements" on evenements;
create policy "spc read evenements" on evenements for select to authenticated
  using (org_id is null or spc_member_of(org_id));

-- Interrupteur d'application réelle des purges (dry-run tant que false) --------
create table if not exists rgpd_config (
  id         int primary key default 1,
  enforce    boolean not null default false,
  updated_at timestamptz default now(),
  constraint rgpd_config_singleton check (id = 1)
);
insert into rgpd_config (id, enforce) values (1, false) on conflict (id) do nothing;

-- Fonction de purge globale (security definer) --------------------------------
create or replace function spc_purge_rgpd() returns void
  language plpgsql security definer set search_path = public
as $$
declare
  v_enforce boolean := coalesce((select enforce from rgpd_config where id = 1), false);
  v_seuil2  date := current_date - interval '2 years';
  v_seuil12 timestamptz := now() - interval '12 months';
  n integer;
begin
  -- 1) Sessions d'examens / affectations à N+2 ans ---------------------------
  select count(*) into n
  from affectations a
  where a.mission_id in (select id from missions where date_mission < v_seuil2)
     or a.session_id in (select id from sessions  where date < v_seuil2);
  if v_enforce then
    delete from affectations a
    where a.mission_id in (select id from missions where date_mission < v_seuil2)
       or a.session_id in (select id from sessions  where date < v_seuil2);
    delete from sessions where date < v_seuil2;
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_sessions_affectations',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', 'N+2 ans'), n);

  -- 2) Journaux d'actions > 12 mois ------------------------------------------
  select count(*) into n from journal_sessions where created_at < v_seuil12;
  if v_enforce then
    delete from journal_sessions where created_at < v_seuil12;
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_journaux',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '12 mois'), n);

  -- 3) Comptes surveillants inactifs 2 ans → anonymisation -------------------
  --    (compte lié user_id, sans affectation récente). On PRÉSERVE heures /
  --    taux_horaire / nb_examens (agrégats paie conservés 5 ans).
  select count(*) into n
  from surveillants s
  where s.user_id is not null
    and s.nom <> 'Compte supprimé'
    and not exists (
      select 1 from affectations a
      join missions m on m.id = a.mission_id
      where a.surveillant_id = s.id and m.date_mission >= v_seuil2
    );
  if v_enforce then
    update surveillants s set
      nom = 'Compte supprimé',
      prenom = null,
      email = 'supprime-' || s.id || '@anonymise.invalid',
      telephone = null,
      zone = null,
      dispo_matin = null, dispo_apm = null,
      heures_matin = null, heures_aprem = null,
      user_id = null
    where s.user_id is not null
      and s.nom <> 'Compte supprimé'
      and not exists (
        select 1 from affectations a
        join missions m on m.id = a.mission_id
        where a.surveillant_id = s.id and m.date_mission >= v_seuil2
      );
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('anonymisation_comptes_inactifs',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '2 ans', 'agregats_preserves', 'heures/taux/nb_examens'), n);

  -- 4) Candidats (jamais liés à un compte) sans affectation depuis 2 ans → suppression
  select count(*) into n
  from surveillants s
  where s.user_id is null
    and s.created_at < v_seuil2::timestamptz
    and not exists (select 1 from affectations a where a.surveillant_id = s.id);
  if v_enforce then
    delete from surveillants s
    where s.user_id is null
      and s.created_at < v_seuil2::timestamptz
      and not exists (select 1 from affectations a where a.surveillant_id = s.id);
  end if;
  insert into evenements(type, detail, nb_lignes)
  values ('purge_candidats',
          jsonb_build_object('dry_run', not v_enforce, 'seuil', '2 ans'), n);
end;
$$;

-- Planification pg_cron (hebdomadaire, dimanche 03:00 UTC) --------------------
-- Nécessite l'extension pg_cron (à activer une fois dans Supabase).
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule('spc-purge-rgpd');
exception when others then null; -- pas encore planifié : on ignore
end $$;
select cron.schedule('spc-purge-rgpd', '0 3 * * 0', $cron$ select public.spc_purge_rgpd(); $cron$);

-- Exécution manuelle possible : select spc_purge_rgpd();  (dry-run par défaut)


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 27_mono-tenant-lockdown.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v27 : verrouillage mono-tenant (fondations d'autorisation)
--
-- CONTEXTE (audit sécurité) : en mode transition, l'application des rôles côté
-- applicatif est désactivée (`SPC_ENFORCE_ROLES ≠ 1`). Or certaines Server
-- Actions destructrices utilisent `service_role`, qui CONTOURNE la RLS
-- (ex. anonymisation d'un surveillant). Tant que les rôles ne sont pas appliqués,
-- tout compte authentifié peut déclencher ces actions → escalade de privilèges.
--
-- Activer l'application des rôles (`SPC_ENFORCE_ROLES=1`) ferme ce trou, MAIS
-- `getCurrentRole()` dégrade en « lecteur » tout compte SANS appartenance
-- (`organization_members`) → l'application deviendrait lecture seule pour lui.
--
-- Cette migration prépare une activation SANS VERROUILLAGE :
--   1. résout (ou crée) l'organisation unique ;
--   2. backfille `org_id` sur toutes les tables métier (plus aucune ligne
--      orpheline, invisible sous RLS stricte) + valeur par défaut ;
--   3. GARANTIT une appartenance à chaque compte auth (mono-tenant : tout
--      titulaire de compte est un employé SPC). Comptes liés à une fiche
--      surveillant → rôle « surveillant » ; les autres → « administrateur ».
--      Les appartenances existantes ne sont JAMAIS modifiées.
--
-- Elle NE réécrit AUCUNE policy RLS (le durcissement org+rôle des tables du
-- portail surveillant relève d'une phase multi-tenant, à tester contre le
-- portail). Elle est purement additive et idempotente.
--
-- APRÈS application : positionner `SPC_ENFORCE_ROLES=1` (Vercel) pour appliquer
-- les rôles côté applicatif — désormais sans risque de verrouillage.
-- ============================================================================

do $$
declare
  v_org uuid;
  t text;
  -- Tables métier portant une colonne org_id (cf. migration 11).
  biz_tables text[] := array[
    'missions','devis','devis_lignes','devis_equipe','devis_salles',
    'salles','surveillants','affectations','amenagements','factures',
    'incidents','journal_sessions'
  ];
begin
  -- 1) Organisation unique : la plus ancienne, ou création si aucune. -----------
  select id into v_org from organizations order by created_at nulls first, id limit 1;
  if v_org is null then
    insert into organizations (nom) values ('SPC') returning id into v_org;
    raise notice 'Aucune organisation : création de « SPC » (%).', v_org;
  else
    raise notice 'Organisation unique résolue : %.', v_org;
  end if;

  -- 2) Backfill org_id + valeur par défaut sur chaque table métier. -------------
  foreach t in array biz_tables loop
    execute format('update %I set org_id = %L where org_id is null', t, v_org);
    execute format('alter table %I alter column org_id set default %L', t, v_org);
  end loop;

  -- 3) Appartenance garantie pour chaque compte auth (anti-verrouillage). -------
  --    Rôle « surveillant » si le compte est lié à une fiche surveillant,
  --    sinon « administrateur » (employé SPC). N'écrase jamais l'existant.
  insert into organization_members (org_id, user_id, role)
  select
    v_org,
    u.id,
    case
      when exists (select 1 from surveillants s where s.user_id = u.id)
      then 'surveillant'
      else 'administrateur'
    end
  from auth.users u
  where not exists (
    select 1 from organization_members m where m.user_id = u.id
  )
  on conflict (org_id, user_id) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- VÉRIFICATIONS (à exécuter après la migration) :
--
--   -- Aucune ligne métier sans org_id :
--   select 'surveillants' t, count(*) from surveillants where org_id is null
--   union all select 'affectations', count(*) from affectations where org_id is null
--   union all select 'missions', count(*) from missions where org_id is null;
--   -- → toutes les lignes doivent afficher 0.
--
--   -- Chaque compte auth a au moins une appartenance :
--   select count(*) as comptes_sans_appartenance
--   from auth.users u
--   where not exists (select 1 from organization_members m where m.user_id = u.id);
--   -- → doit afficher 0.
--
--   -- Répartition des rôles :
--   select role, count(*) from organization_members group by role order by role;
--
-- ROLLBACK : cette migration est additive (backfill + appartenances). Pour
-- annuler l'effet « défaut org_id » : alter table <t> alter column org_id drop default;
-- (les appartenances créées peuvent être retirées manuellement si nécessaire).
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 28_mono-tenant-consolidation.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v28 : consolidation mono-tenant (CORRECTIF de la v27)
--
-- La v27 résolvait « l'organisation la plus ANCIENNE » comme org cible. Or, sur
-- l'instance de production, l'org la plus ancienne était « SPC Démo » (org de
-- test vide) et non « SPC » (la vraie org, créée après). La v27 aurait donc
-- rattaché toutes les données à l'org de démo.
--
-- Cette migration cible la VRAIE organisation de façon robuste :
--   priorité aux organisations dont le nom N'EST PAS « démo/demo »,
--   puis celle qui a le PLUS de membres, puis la plus récente.
-- Puis : backfill org_id + valeur par défaut + rattachement de TOUS les comptes
-- à cette org (surveillant si lié à une fiche, sinon administrateur).
--
-- Reflète l'état appliqué manuellement en production le 2026-07-20.
-- Idempotente, additive (aucune suppression). La suppression de l'org de démo
-- résiduelle est un geste d'exploitation distinct (voir bloc commenté en fin).
-- ============================================================================

do $$
declare
  v_org uuid;
  v_nom text;
  t text;
  biz_tables text[] := array[
    'missions','devis','devis_lignes','devis_equipe','devis_salles',
    'salles','surveillants','affectations','amenagements','factures',
    'incidents','journal_sessions'
  ];
begin
  -- 1) Organisation cible : la « vraie » org (nom ≠ démo, sinon la plus peuplée).
  select o.id, o.nom into v_org, v_nom
  from organizations o
  order by (o.nom ilike '%demo%' or o.nom ilike '%démo%'),                       -- démo en dernier
           (select count(*) from organization_members m where m.org_id = o.id) desc,
           o.created_at desc
  limit 1;

  if v_org is null then
    insert into organizations (nom) values ('SPC') returning id into v_org;
    v_nom := 'SPC';
  end if;
  raise notice 'Organisation cible : % (%).', v_nom, v_org;

  -- 2) Backfill org_id + valeur par défaut sur chaque table métier.
  foreach t in array biz_tables loop
    execute format('update %I set org_id = %L where org_id is null', t, v_org);
    execute format('alter table %I alter column org_id set default %L', t, v_org);
  end loop;

  -- 3) Rattachement de TOUS les comptes auth à l'org cible (anti-verrouillage).
  --    surveillant si lié à une fiche, sinon administrateur. N'écrase rien.
  insert into organization_members (org_id, user_id, role)
  select
    v_org,
    u.id,
    case
      when exists (select 1 from surveillants s where s.user_id = u.id)
      then 'surveillant'
      else 'administrateur'
    end
  from auth.users u
  where not exists (
    select 1 from organization_members m where m.org_id = v_org and m.user_id = u.id
  )
  on conflict (org_id, user_id) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- Nettoyage d'une org de démonstration résiduelle (geste d'exploitation).
-- Sûr : s'annule si l'org contient la moindre donnée métier. Décommenter pour
-- l'exécuter (les comptes concernés doivent déjà être membres de la vraie org).
--
-- do $$
-- declare v_demo uuid; v_rows int;
-- begin
--   select id into v_demo from organizations
--    where nom ilike '%démo%' or nom ilike '%demo%' limit 1;
--   if v_demo is null then raise notice 'Pas d''org démo.'; return; end if;
--   select (select count(*) from surveillants where org_id=v_demo)
--        + (select count(*) from missions where org_id=v_demo)
--        + (select count(*) from affectations where org_id=v_demo)
--        + (select count(*) from devis where org_id=v_demo)
--        + (select count(*) from salles where org_id=v_demo)
--        + (select count(*) from amenagements where org_id=v_demo)
--        + (select count(*) from factures where org_id=v_demo)
--        + (select count(*) from incidents where org_id=v_demo)
--        + (select count(*) from journal_sessions where org_id=v_demo) into v_rows;
--   if v_rows > 0 then raise exception 'Org démo NON vide (% lignes).', v_rows; end if;
--   delete from organization_members where org_id = v_demo;
--   delete from organizations where id = v_demo;
-- end $$;
--
-- VÉRIFICATION : select count(*) as nb_orgs from organizations;  -- attendu : 1
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 29_affectations-multi-creneaux.sql
-- ─────────────────────────────────────────────────────────────────────────
-- 29 · Multi-créneaux par demi-journée pour les affectations
--
-- Contexte : jusqu'ici chaque affectation portait UN créneau matin
-- (matin_debut/matin_fin) et UN créneau après-midi (apm_debut/apm_fin).
-- Le métier réel : un surveillant peut enchaîner plusieurs surveillances
-- sur une même demi-journée (ex. 08:00–09:30, 10:00–11:30, 12:00–13:30).
--
-- Approche non destructive : on conserve matin/matin_debut/matin_fin (et apm/…)
-- comme « 1er créneau » — tous les consommateurs existants (agents IA, portail
-- surveillant, journal, moteur) continuent de fonctionner sans changement. On
-- ajoute deux colonnes jsonb qui portent la LISTE COMPLÈTE des créneaux de la
-- demi-journée (chaque élément = {"debut":"HH:MM","fin":"HH:MM"}), source de
-- vérité pour la planification (total heures, timeline, détection de conflits).

alter table public.affectations
  add column if not exists matin_creneaux jsonb,
  add column if not exists apm_creneaux jsonb;

comment on column public.affectations.matin_creneaux is
  'Liste des créneaux du matin [{debut,fin}]. NULL = retomber sur matin_debut/matin_fin (1er créneau).';
comment on column public.affectations.apm_creneaux is
  'Liste des créneaux de l''après-midi [{debut,fin}]. NULL = retomber sur apm_debut/apm_fin (1er créneau).';


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 30_creneaux-table.sql
-- ─────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 31_unicite-salles-surveillants.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v31 : unicité métier des salles et surveillants
--
-- Audit QA forensic V2, BUG-012 / BUG-013.
--
-- Constat : `missions.reference` et `devis.reference` sont `unique`, ce qui
-- bloque en base les doublons créés par un double clic. `salles` et
-- `surveillants` ne portaient AUCUNE contrainte : trois clics rapides sur
-- « Ajouter la salle » (3 requêtes POST mesurées) y créaient trois lignes.
--
-- Ces index sont créés en `if not exists` et tolèrent les données existantes :
-- ils ne s'appliquent qu'aux lignes dont la clé est renseignée.

-- Une salle porte un nom unique DANS son organisation. Les lignes historiques
-- sans org_id restent hors index (mode mono-organisation avant migration 11).
create unique index if not exists salles_org_nom_uniq
  on salles (org_id, lower(btrim(nom)))
  where org_id is not null and btrim(nom) <> '';

-- Un surveillant a une adresse e-mail unique dans son organisation. Le nom
-- n'est volontairement PAS contraint : deux homonymes sont légitimes, la
-- déduplication par nom reste applicative (avec avertissement).
create unique index if not exists surveillants_org_email_uniq
  on surveillants (org_id, lower(btrim(email)))
  where org_id is not null and email is not null and btrim(email) <> '';

-- Le téléphone, quand il est renseigné, identifie aussi une personne unique.
create unique index if not exists surveillants_org_tel_uniq
  on surveillants (org_id, regexp_replace(telephone, '\D', '', 'g'))
  where org_id is not null and telephone is not null
    and regexp_replace(telephone, '\D', '', 'g') <> '';


-- ─────────────────────────────────────────────────────────────────────────
-- MIGRATION 32_integrite-salles-planning.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SPC Opérations — Migration v32 : intégrité référentielle salles ↔ planning
--
-- Audit QA forensic V2, BUG-004.
--
-- Constat : `affectations.salle` est une colonne TEXTE LIBRE (migration 03),
-- sans aucune clé étrangère vers `salles`. Relevé sur les données réelles :
--
--   référentiel : A21, A22, E31, Grand Amphithéâtre, B11
--   planning    : A21, C14, E31, AMP, A22, F11, F12, E32
--   fantômes    : C14, AMP, F11, F12, E32   (5 salles inexistantes)
--   orpheline   : B11
--
-- Supprimer, renommer ou recapacité une salle n'avait donc aucun effet sur le
-- planning, le cockpit ou la présence.
--
-- STRATÉGIE — cette migration est volontairement NON DESTRUCTIVE :
--   1. elle AJOUTE `affectations.salle_id`, nullable, en `on delete restrict` ;
--   2. elle rapproche l'existant par nom normalisé (casse, accents, préfixe
--      « Salle ») — les alias métier non devinables (« AMP » ↔ « Grand
--      Amphithéâtre ») restent à trancher par un humain ;
--   3. elle NE SUPPRIME AUCUNE ligne et NE VIDE PAS `affectations.salle`, qui
--      reste la valeur affichée tant que le rapprochement n'est pas complet ;
--   4. elle expose une vue de contrôle listant ce qui n'a pas pu être rapproché.
--
-- La colonne ne peut pas être passée en `not null` tant que la vue
-- `salles_non_rapprochees` n'est pas vide : ce sera une migration ultérieure,
-- après arbitrage humain sur les alias.

-- 1. Rattachement d'une salle à une session (référentiel global auparavant) ---
alter table salles add column if not exists mission_id integer
  references missions(id) on delete set null;

comment on column salles.mission_id is
  'Session à laquelle la salle est rattachée. NULL = salle du référentiel global (bâtiment permanent).';

create index if not exists salles_mission_idx on salles (mission_id);

-- 2. Clé étrangère affectations → salles ------------------------------------
alter table affectations add column if not exists salle_id integer
  references salles(id) on delete restrict;

comment on column affectations.salle_id is
  'Salle du référentiel. on delete restrict : une salle utilisée au planning ne peut pas être supprimée (BUG-004).';

create index if not exists affectations_salle_idx on affectations (salle_id);

-- 3. Rapprochement de l'existant par nom normalisé ---------------------------
-- Même normalisation que `normaliserNomSalle` côté applicatif : minuscules,
-- suppression du préfixe « Salle », suppression de tout caractère non
-- alphanumérique. Les accents ne sont pas dépliés ici (unaccent n'est pas
-- garanti installé) — un nom accentué non rapproché ressortira simplement dans
-- la vue de contrôle, ce qui est le comportement voulu : signaler, pas deviner.
create or replace function spc_cle_salle(nom text) returns text
  language sql immutable as $$
    select regexp_replace(
             regexp_replace(lower(coalesce(nom, '')), '^\s*salles?\s+', ''),
             '[^a-z0-9]', '', 'g')
  $$;

update affectations a
   set salle_id = s.id
  from salles s
 where a.salle_id is null
   and a.salle is not null
   and spc_cle_salle(a.salle) <> ''
   and spc_cle_salle(s.nom) = spc_cle_salle(a.salle)
   and (s.org_id is not distinct from a.org_id or s.org_id is null or a.org_id is null);

-- 4. Vue de contrôle — ce qui reste à arbitrer -------------------------------
-- Non vide = l'invariant INV-004 n'est pas encore rétabli. À consulter avant de
-- passer `salle_id` en `not null`.
create or replace view salles_non_rapprochees as
  select a.salle          as nom_au_planning,
         count(*)         as affectations,
         min(a.mission_id) as exemple_mission_id
    from affectations a
   where a.salle_id is null
     and a.salle is not null
     and btrim(a.salle) <> ''
   group by a.salle
   order by count(*) desc, a.salle;

comment on view salles_non_rapprochees is
  'Salles citées au planning sans contrepartie au référentiel (BUG-004). Doit être vide avant de rendre affectations.salle_id obligatoire.';
