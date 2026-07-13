-- SPC Opérations — Exemple réel : ICP Reims, rattrapages du 15 au 26 juin 2026
-- Source : demande email du Pôle Scolarité ICP Campus de Reims (fichier Excel joint)
-- 74 créneaux · 262,3 h de surveillance · 6 salles · hypothèse 28 € HT/h
-- À exécuter dans Supabase > SQL Editor (après supabase-operations-v5.sql)

-- Salles du campus de Reims
insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('B11 Tiers-temps', 'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, true),
  ('B12',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false),
  ('B13 Isolé',       'ICP Reims — Campus', 'Bâtiment B', 1,  1,  1, false, false),
  ('B21 Isolé',       'ICP Reims — Campus', 'Bâtiment B', 1,  1,  1, false, false),
  ('B22',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false),
  ('B23',             'ICP Reims — Campus', 'Bâtiment B', 30, 30, 1, false, false)
on conflict do nothing;

-- Deux missions (une par semaine de rattrapages)
insert into missions (reference, client, session, date_mission, type, nb_salles, nb_surveillants, montant_ht, statut) values
  ('EX-2026-042', 'ICP Reims', 'Rattrapages — semaine du 15 au 19 juin (35 créneaux · 118,2 h)', '2026-06-15', 'Rattrapage', 5, 5, 3310.00, 'Terminée'),
  ('EX-2026-043', 'ICP Reims', 'Rattrapages — semaine du 22 au 26 juin (39 créneaux · 144,1 h)', '2026-06-22', 'Rattrapage', 6, 6, 4035.00, 'Terminée')
on conflict (reference) do nothing;

-- Devis accepté couvrant les deux semaines
insert into devis (reference, client, session, statut, montant_ht, montant_ttc, nb_surveillants) values
  ('SPC-20260605-001', 'ICP Reims', 'Rattrapages juin 2026 — 74 créneaux · 262,3 h', 'Accepté', 7345.00, 8814.00, 6)
on conflict (reference) do nothing;

-- Facture émise fin de mission
insert into factures (reference, client, session, statut, montant_ht, montant_ttc, emission, echeance) values
  ('FA-2026-003', 'ICP Reims', 'Rattrapages juin 2026', 'Facturée', 7345.00, 8814.00, '2026-06-30', '2026-07-30')
on conflict (reference) do nothing;

-- Aménagements spécifiques identifiés dans le tableau
insert into amenagements (amenagement, salle, tiers_temps, surveillant) values
  ('Tiers-temps — salle dédiée B11 (ICP Reims)', 'B11', true, null),
  ('Isolement — candidat seul (ICP Reims)',      'B21', false, null),
  ('Isolement — candidat seul (ICP Reims)',      'B13', false, null)
on conflict do nothing;
