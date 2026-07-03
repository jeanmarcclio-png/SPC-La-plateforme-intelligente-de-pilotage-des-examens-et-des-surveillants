-- SPC Opérations — Migration v2 : type de mission + montant estimé
-- À exécuter dans Supabase > SQL Editor (après supabase-operations.sql)

alter table missions add column if not exists type text default 'Examen écrit';
alter table missions add column if not exists montant_ht numeric(10,2) default 0;

update missions set montant_ht = 6400 where reference = 'EX-2026-037' and montant_ht = 0;
update missions set montant_ht = 1925 where reference = 'EX-2026-038' and montant_ht = 0;
update missions set montant_ht = 5200 where reference = 'EX-2026-039' and montant_ht = 0;
update missions set montant_ht = 2600 where reference = 'EX-2026-040' and montant_ht = 0;
update missions set montant_ht = 4042 where reference = 'EX-2026-041' and montant_ht = 0;
