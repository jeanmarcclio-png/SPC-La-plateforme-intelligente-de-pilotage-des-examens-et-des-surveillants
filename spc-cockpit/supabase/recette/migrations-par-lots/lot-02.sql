-- ============================================================================
-- SPC Opérations — RECETTE · LOT 2/7
--
-- Migrations de ce lot : 06, 07, 08, 09, 10
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 06_devis-lignes.sql ───────────────────────────────────────────
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
drop policy if exists "Auth read devis_lignes" on devis_lignes;
create policy "Auth read devis_lignes"   on devis_lignes for select to authenticated using (true);
drop policy if exists "Auth insert devis_lignes" on devis_lignes;
create policy "Auth insert devis_lignes" on devis_lignes for insert to authenticated with check (true);
drop policy if exists "Auth update devis_lignes" on devis_lignes;
create policy "Auth update devis_lignes" on devis_lignes for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete devis_lignes" on devis_lignes;
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


-- ── MIGRATION 07_devis-salles-champs.sql ───────────────────────────────────────────
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
drop policy if exists "Auth read devis_salles" on devis_salles;
create policy "Auth read devis_salles"   on devis_salles for select to authenticated using (true);
drop policy if exists "Auth insert devis_salles" on devis_salles;
create policy "Auth insert devis_salles" on devis_salles for insert to authenticated with check (true);
drop policy if exists "Auth update devis_salles" on devis_salles;
create policy "Auth update devis_salles" on devis_salles for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete devis_salles" on devis_salles;
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


-- ── MIGRATION 08_devis-equipe-frais.sql ───────────────────────────────────────────
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
drop policy if exists "Auth read devis_equipe" on devis_equipe;
create policy "Auth read devis_equipe"   on devis_equipe for select to authenticated using (true);
drop policy if exists "Auth insert devis_equipe" on devis_equipe;
create policy "Auth insert devis_equipe" on devis_equipe for insert to authenticated with check (true);
drop policy if exists "Auth update devis_equipe" on devis_equipe;
create policy "Auth update devis_equipe" on devis_equipe for update to authenticated using (true) with check (true);
drop policy if exists "Auth delete devis_equipe" on devis_equipe;
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


-- ── MIGRATION 09_devis-coefficient.sql ───────────────────────────────────────────
-- SPC Opérations — Migration v10 : coefficient d'ajustement du devis
-- (Master Prompt §10.5 — 1.00 = aucun ajustement, appliqué une seule fois
-- à la base brute HT, avant les frais)
-- À exécuter dans Supabase > SQL Editor (après la v9)

alter table devis add column if not exists coefficient numeric(5,2) default 1.00;

update devis set coefficient = 1.00 where coefficient is null or coefficient <= 0;

-- Vérification
select reference, coefficient from devis order by id;


-- ── MIGRATION 10_journal-sessions.sql ───────────────────────────────────────────
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
drop policy if exists "Auth read journal" on journal_sessions;
create policy "Auth read journal"   on journal_sessions for select to authenticated using (true);
drop policy if exists "Auth insert journal" on journal_sessions;
create policy "Auth insert journal" on journal_sessions for insert to authenticated with check (true);
-- Volontairement AUCUNE policy update/delete : journal immuable.

-- Vérification
select count(*) as entrees_journal from journal_sessions;
