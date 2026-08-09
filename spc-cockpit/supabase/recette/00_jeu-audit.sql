-- SPC Opérations — Jeu de recette reproduisant le relevé de l'audit QA forensic V2
--
-- À jouer dans le SQL Editor d'une instance de RECETTE, après les 32 migrations.
-- JAMAIS en production : ce script insère des données fictives.
--
-- Il reproduit volontairement les anomalies constatées par l'audit, afin que les
-- contrôles de `01_controles.sql` aient quelque chose à trouver :
--
--   * mission ICP Paris — 14 surveillants requis, 6 salles déclarées ;
--   * 10 affectations dont 2 SANS salle ;
--   * 8 salles citées au planning pour 5 fiches au référentiel
--     (fantômes : C14, AMP, F11, F12, E32 — orpheline : B11) ;
--   * un devis dont la grille et les heures facturées ne se recoupent pas.
--
-- Idempotent : relancer le script repart d'un état propre pour ces références.

begin;

-- Nettoyage du périmètre de recette uniquement (jamais un TRUNCATE global).
delete from affectations where mission_id in (select id from missions where reference like 'RECETTE-%');
delete from devis_salles  where devis_id  in (select id from devis    where reference like 'RECETTE-%');
delete from devis_equipe  where devis_id  in (select id from devis    where reference like 'RECETTE-%');
delete from devis         where reference like 'RECETTE-%';
delete from missions      where reference like 'RECETTE-%';
delete from surveillants  where email like '%@recette.spc.test';
delete from salles        where nom like 'RECETTE %';

-- 1. Référentiel de salles : 5 fiches, dont une qu'aucune affectation n'utilise.
insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('RECETTE A21',    'Bâtiment A', '2e étage',  80,  75,  2, false, false),
  ('RECETTE A22',    'Bâtiment A', '2e étage',  80,  72,  2, false, false),
  ('RECETTE E31',    'Bâtiment E', '3e étage',  30,   8,  2, true,  true),
  ('RECETTE AMPHI',  'Bâtiment C', 'RDC',      300, 280,  8, false, false),
  ('RECETTE B11',    'Bâtiment B', '1er étage', 50,  44,  2, false, true);

-- 2. Surveillants de recette. Les deux derniers portent volontairement un
--    e-mail et un téléphone qui NE SONT PAS des doublons : c'est le contrôle
--    D-3/D-4 qui tentera d'en créer.
insert into surveillants (nom, role, statut, email, telephone, nb_examens, heures, note, taux_horaire) values
  ('Recette Un',    'Coordinatrice',     'Disponible', 'un@recette.spc.test',    '0612000001', 3, 20, 4.5, 30),
  ('Recette Deux',  'Surveillant salle', 'Disponible', 'deux@recette.spc.test',  '0612000002', 2, 15, 4.0, 30),
  ('Recette Trois', 'Surveillant salle', 'Disponible', 'trois@recette.spc.test', '0612000003', 4, 32, 4.2, 30),
  ('Recette Quatre','Surveillant PMR',   'Disponible', 'quatre@recette.spc.test','0612000004', 1,  8, 4.8, 30),
  ('Recette Cinq',  'Surveillant salle', 'Disponible', 'cinq@recette.spc.test',  '0612000005', 5, 41, 3.9, 30),
  ('Recette Six',   'Surveillant salle', 'Disponible', 'six@recette.spc.test',   '0612000006', 2, 12, 4.1, 30),
  ('Recette Sept',  'Surveillant salle', 'Disponible', 'sept@recette.spc.test',  '0612000007', 3, 18, 4.3, 30),
  ('Recette Huit',  'Coordinateur',      'Disponible', 'huit@recette.spc.test',  '0612000008', 6, 55, 4.6, 30),
  ('Recette Neuf',  'Surveillant salle', 'Disponible', 'neuf@recette.spc.test',  '0612000009', 1,  6, 4.0, 30),
  ('Recette Dix',   'Surveillant salle', 'Disponible', 'dix@recette.spc.test',   '0612000010', 2, 14, 4.4, 30);

-- 3. Mission sous-dotée : 14 postes requis, 10 surveillants distincts affectés.
insert into missions (reference, client, session, date_mission, type, nb_salles, nb_surveillants, montant_ht, statut)
values ('RECETTE-EX-001', 'ICP Paris (recette)', 'Session principale', current_date, 'Examen écrit', 6, 14, 4042, 'Planifiée');

-- 4. Affectations : 8 salles citées, dont 5 absentes du référentiel, et 2
--    créneaux planifiés SANS salle.
insert into affectations (mission_id, surveillant_id, role_mission, statut, salle, matin, matin_debut, matin_fin, apm, apm_debut, apm_fin, presence)
select m.id, s.id, s.role, 'Confirmée', v.salle, true, '08:30', '12:30', false, null, null, 'En attente'
  from missions m
  cross join lateral (values
      ('RECETTE A21', 'un@recette.spc.test'),
      ('C14',         'deux@recette.spc.test'),    -- fantôme
      ('RECETTE E31', 'trois@recette.spc.test'),
      ('AMP',         'quatre@recette.spc.test'),  -- fantôme
      ('RECETTE A22', 'cinq@recette.spc.test'),
      ('F11',         'six@recette.spc.test'),     -- fantôme
      ('F12',         'sept@recette.spc.test'),    -- fantôme
      ('E32',         'huit@recette.spc.test'),    -- fantôme
      (null,          'neuf@recette.spc.test'),    -- sans salle
      (null,          'dix@recette.spc.test')      -- sans salle
    ) as v(salle, email)
  join surveillants s on s.email = v.email
 where m.reference = 'RECETTE-EX-001';

-- 5. Devis dont la grille et les heures facturées ne se recoupent pas.
--    Grille : 23,33 h facturables pour une journée · 10 jours retenus = 233,33 h
--    Équipe : 5 × 23,64 h + 5 × 28,82 h = 262,30 h → écart 28,97 h ≈ 811 € HT
--    Effectif annoncé (6) ≠ équipe (10) ≠ simultané matin (4).
insert into devis (reference, client, session, statut, montant_ht, montant_ttc, nb_surveillants, date_debut, date_fin, coefficient, frais_deplacement, frais_coordination, remise)
values ('RECETTE-DEVIS-001', 'ICP Reims (recette)', 'Rattrapages', 'Accepté', 7344.4, 8813.28, 6,
        current_date, current_date + 11, 1, 0, 0, 0);

insert into devis_salles (devis_id, session, salle, etudiants, surveillants, pmr, tiers_temps, debut, fin, ordre)
select d.id, v.session, v.salle, v.etudiants, v.surveillants, false, v.tt, v.debut, v.fin, v.ordre
  from devis d
  cross join lateral (values
      ('matin',      'B22',              30, 1, false, '08:30', '12:15', 1),
      ('matin',      'B23',              30, 1, false, '08:30', '12:15', 2),
      ('matin',      'B11 Tiers-temps',  30, 1, true,  '08:30', '13:15', 3),
      ('matin',      'B21 Isolé',         1, 1, false, '08:30', '13:15', 4),
      ('apres-midi', 'B22',              30, 1, false, '13:30', '16:15', 1),
      ('apres-midi', 'B11 Tiers-temps',  30, 1, true,  '13:30', '17:05', 2)
    ) as v(session, salle, etudiants, surveillants, tt, debut, fin, ordre)
 where d.reference = 'RECETTE-DEVIS-001';

insert into devis_equipe (devis_id, role, effectif, heures_pers, taux_h, ordre)
select d.id, v.role, v.effectif, v.heures, 28, v.ordre
  from devis d
  cross join lateral (values
      ('Surveillant·e en salle — semaine 1', 5, 23.64, 1),
      ('Surveillant·e en salle — semaine 2', 5, 28.82, 2)
    ) as v(role, effectif, heures, ordre)
 where d.reference = 'RECETTE-DEVIS-001';

commit;
