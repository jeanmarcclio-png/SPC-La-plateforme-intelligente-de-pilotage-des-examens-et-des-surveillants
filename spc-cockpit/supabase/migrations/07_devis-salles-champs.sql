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
