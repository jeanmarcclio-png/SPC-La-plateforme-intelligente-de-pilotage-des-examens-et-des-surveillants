-- ============================================================================
-- SPC — Migration v34 : unicité réelle des noms de salles (D-2b)
--
-- CE QUE LA RECETTE A ÉTABLI
-- --------------------------
-- Sonde D-2b : « RECETTE  A21 » (deux espaces) a été ACCEPTÉE à côté de
-- « RECETTE A21 ». L'index `salles_org_nom_uniq` (migration 31) indexe
-- `lower(btrim(nom))`, et `btrim` ne retire que les espaces DE BORD.
--
-- L'application, elle, compare avec `normaliserNomSalle()`
-- (`lib/operations/referentiel-salles.ts`), qui retire TOUS les caractères non
-- alphanumériques. Les deux fiches sont donc un doublon pour l'écran et deux
-- fiches distinctes pour la base.
--
-- Impact métier : deux fiches pour une même salle, avec des capacités, des
-- indicateurs PMR et tiers-temps potentiellement divergents. Le rapprochement
-- salles ↔ planning en retient une au hasard ; un étudiant PMR peut se voir
-- affecter une salle enregistrée comme non accessible.
--
-- CE QUE FAIT CETTE MIGRATION
-- ---------------------------
-- Elle aligne la base sur l'application — jamais l'inverse : c'est
-- l'application qui porte la règle métier, et elle est déjà la plus stricte.
--
-- Comme la v33, elle NE FUSIONNE RIEN. Fusionner deux fiches de salle est une
-- décision humaine : capacité, bâtiment, étage, PMR et tiers-temps diffèrent, et
-- des affectations pointent sur l'une ou l'autre. Elle se contente de :
--
--   1. poser la fonction de normalisation `spc_salle_cle()` ;
--   2. exposer la vue `salles_nom_doublons` — QUI fusionner, avec de quoi
--      décider ;
--   3. créer le nouvel index UNIQUEMENT si plus aucun doublon ne subsiste, et
--      ne retirer l'ancien qu'après ce succès.
--
-- Rendre l'unicité plus stricte peut échouer sur des données existantes
-- légitimement distinctes. Plutôt que de faire tomber la migration — et tout ce
-- qui suit — elle s'abstient et le dit par un NOTICE.
--
-- Idempotente.
-- ============================================================================

-- 1) Clé de comparaison ------------------------------------------------------
--
-- Transposition fidèle de `normaliserNomSalle()`, étape pour étape :
--
--   .normalize("NFD").replace(/[̀-ͯ]/g, "")  → `translate` ci-dessous
--   .toLowerCase()                                     → `lower`
--   .replace(/^\s*salles?\s+/, "")                     → 1er `regexp_replace`
--   .replace(/[^a-z0-9]/g, "")                         → 2nd `regexp_replace`
--
-- POURQUOI `translate` ET NON `unaccent()` : l'extension `unaccent` fournit une
-- fonction STABLE, et PostgreSQL n'indexe que des expressions IMMUTABLE. Elle
-- dépend en outre d'un dictionnaire installé, que la base peut ne pas avoir.
-- `translate` est IMMUTABLE et se suffit à elle-même.
--
-- POURQUOI `translate` PRÉCÈDE `lower` : la base de recette peut tourner en
-- locale C, où `lower()` ne sait pas abaisser les lettres accentuées
-- multi-octets. En dépliant les majuscules accentuées AVANT, `lower()` n'a plus
-- que de l'ASCII à traiter — le résultat ne dépend donc plus de la locale.
--
-- La table de correspondance ne couvre QUE les lettres que NFD décompose en
-- « base ASCII + diacritique ». « œ » et « æ » n'en font pas partie : le
-- `[^a-z0-9]` final les supprime, côté application comme ici. Les développer en
-- « oe » / « ae » créerait justement l'écart que cette migration corrige.
create or replace function spc_salle_cle(n text) returns text
  language sql immutable
as $$
  select regexp_replace(
           regexp_replace(
             lower(translate(coalesce(n, ''),
               'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
               'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy')),
             '^\s*salles?\s+', ''),
           '[^a-z0-9]', '', 'g');
$$;

comment on function spc_salle_cle(text) is
  'Clé de comparaison des noms de salles. Transposition SQL de '
  'normaliserNomSalle() (lib/operations/referentiel-salles.ts) : sans accent, '
  'en minuscules, sans préfixe « salle »/« salles », réduite aux caractères '
  'alphanumériques. Toute divergence avec la fonction TypeScript rouvre D-2b.';

-- 2) Qui fusionner, et avec quoi décider -------------------------------------
--
-- Une ligne par fiche impliquée dans une collision, groupée par clé. Les
-- colonnes de droite existent pour l'arbitrage : on garde en général la fiche
-- que le planning référence, et il faut vérifier que PMR et tiers-temps
-- concordent avant de supprimer l'autre.
create or replace view salles_nom_doublons as
select
  s.org_id,
  spc_salle_cle(s.nom)                                        as cle,
  s.id,
  s.nom                                                       as nom_saisi,
  s.batiment,
  s.etage,
  s.capacite,
  s.pmr,
  s.tiers_temps,
  (select count(*) from affectations a where a.salle_id = s.id) as affectations,
  s.created_at
from salles s
where s.org_id is not null
  and spc_salle_cle(s.nom) <> ''
  and exists (
    select 1 from salles t
    where t.org_id = s.org_id
      and t.id <> s.id
      and spc_salle_cle(t.nom) = spc_salle_cle(s.nom)
  )
order by s.org_id, cle, s.created_at;

comment on view salles_nom_doublons is
  'Fiches de salles partageant un même nom une fois normalisé (D-2b). '
  'Non vide ⇒ l''index salles_org_cle_uniq ne peut pas être créé : fusionner '
  'd''abord, en vérifiant que capacité, PMR et tiers-temps concordent.';

-- 3) Index d'unicité — seulement si la voie est libre ------------------------
do $$
declare
  v_doublons integer;
  v_fiches   integer;
begin
  select count(distinct (org_id, cle)), count(*)
    into v_doublons, v_fiches
    from salles_nom_doublons;

  if v_doublons > 0 then
    raise notice E'\n'
      '>>> MIGRATION 34 — index NON créé, volontairement.\n'
      '>>> % nom(s) de salle portés par % fiche(s) distinctes.\n'
      '>>> Créer l''index maintenant ferait échouer la migration entière.\n'
      '>>> Arbitrer puis fusionner :  select * from salles_nom_doublons;\n'
      '>>> Puis rejouer cette migration — elle est idempotente.',
      v_doublons, v_fiches;
    return;
  end if;

  -- La chaîne vide est exclue : deux salles sans nom exploitable ne sont pas
  -- la même salle, et l'ancien index excluait déjà `btrim(nom) = ''`.
  create unique index if not exists salles_org_cle_uniq
    on salles (org_id, spc_salle_cle(nom))
    where org_id is not null and spc_salle_cle(nom) <> '';

  -- L'ancien index n'est retiré qu'APRÈS le succès du nouveau : à aucun moment
  -- la table ne se retrouve sans protection d'unicité.
  drop index if exists salles_org_nom_uniq;

  raise notice '>>> MIGRATION 34 — salles_org_cle_uniq créé, salles_org_nom_uniq retiré.';
end $$;
