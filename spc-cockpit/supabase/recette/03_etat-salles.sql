-- SPC Opérations — Recette : ÉTAT DES SALLES, en lecture seule.
--
-- Aucune écriture. Aucune transaction. À jouer quand `02_organisation.sql`
-- s'arrête sur :
--
--   ERROR 23505: duplicate key value violates unique constraint "salles_org_nom_uniq"
--   DETAIL: Key (org_id, lower(btrim(nom)))=(…, recette a21) already exists.
--
-- Ce message dit QUELLE clé pose problème, jamais QUELLES LIGNES la portent ni
-- où elles vivent. Sans cette photo, corriger le script revient à deviner — et
-- trois corrections successives ont déjà échoué faute de cette information.
--
-- Colle le résultat tel quel : il contient tout ce qu'il faut pour trancher.

select
  s.id,
  '['     || s.nom || ']'                     as nom_exact,   -- crochets = espaces visibles
  lower(btrim(s.nom))                         as cle_index,   -- ce que voit salles_org_nom_uniq
  coalesce(o.nom, '(aucune organisation)')    as organisation,
  s.org_id,
  count(*) over (partition by s.org_id, lower(btrim(s.nom))) as lignes_sur_cette_cle
from salles s
left join organizations o on o.id = s.org_id
where lower(btrim(s.nom)) like 'recette%'
   or s.nom like 'RECETTE%'
order by cle_index, organisation, s.id;

-- Si `lignes_sur_cette_cle` vaut 2 ou plus quelque part, l'index est déjà violé
-- en base — et c'est cette ligne-là qu'il faut supprimer, pas le script qu'il
-- faut réécrire.
