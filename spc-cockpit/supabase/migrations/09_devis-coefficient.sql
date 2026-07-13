-- SPC Opérations — Migration v10 : coefficient d'ajustement du devis
-- (Master Prompt §10.5 — 1.00 = aucun ajustement, appliqué une seule fois
-- à la base brute HT, avant les frais)
-- À exécuter dans Supabase > SQL Editor (après la v9)

alter table devis add column if not exists coefficient numeric(5,2) default 1.00;

update devis set coefficient = 1.00 where coefficient is null or coefficient <= 0;

-- Vérification
select reference, coefficient from devis order by id;
