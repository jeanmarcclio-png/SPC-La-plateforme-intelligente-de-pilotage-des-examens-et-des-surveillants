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
