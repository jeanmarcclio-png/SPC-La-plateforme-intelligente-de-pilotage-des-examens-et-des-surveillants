-- ============================================================================
-- SPC Opérations — RECETTE · LOT 7/7
--
-- Migrations de ce lot : 32, 33
--
-- Généré par supabase/recette/generer-lots.py — ne pas éditer à la main.
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 32_integrite-salles-planning.sql ───────────────────────────────────────────
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


-- ── MIGRATION 33_unicite-telephone-normalise.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v33 : unicité réelle des téléphones de surveillants (D-4b)
--
-- CE QUE LA RECETTE A ÉTABLI
-- --------------------------
-- Sonde D-4b, exécutée sur l'instance spc-recette : un même numéro entre DEUX
-- FOIS dans le référentiel. L'index `surveillants_org_tel_uniq` (migration 31)
-- indexe `regexp_replace(telephone, '\D', '', 'g')`, qui donne
--
--     « +33 6 12 00 00 01 »  →  33612000001
--     « 06 12 00 00 01 »     →  0612000001
--
-- Deux clés pour un seul numéro. L'insertion a été ACCEPTÉE là où elle devait
-- être refusée. Le même défaut existe côté application : `chercherDoublon()` et
-- l'import utilisent la même normalisation faible.
--
-- Impact métier : deux fiches pour une personne — double affectation possible
-- sur un même créneau, double comptage dans la couverture, double paie, et une
-- seule des deux fiches anonymisée par la purge RGPD.
--
-- CETTE MIGRATION NE SUPPRIME RIEN ET NE FUSIONNE RIEN.
-- -----------------------------------------------------
-- Fusionner deux fiches de surveillant est une décision humaine : il faut
-- choisir laquelle garder, et leurs affectations, heures et notes diffèrent.
-- La migration se contente de :
--
--   1. poser la fonction de normalisation `spc_tel_cle()` ;
--   2. exposer la vue `surveillants_tel_doublons` — QUI fusionner, avec de quoi
--      décider ;
--   3. créer le nouvel index d'unicité UNIQUEMENT si plus aucun doublon ne
--      subsiste, et ne retirer l'ancien qu'après ce succès.
--
-- Sur une base contenant déjà les deux formes d'un même numéro, la création
-- ÉCHOUERAIT. Plutôt que de faire tomber la migration — et tout ce qui suit —
-- elle s'abstient et le dit par un NOTICE. C'est le scénario M-1 de la recette,
-- pris au sérieux.
--
-- INDICATIF RETENU : +33 (France). Décision métier, écrite ici et dans
-- `lib/operations/telephone.ts`. La changer impose de reconstruire l'index.
--
-- Idempotente.
-- ============================================================================

-- 1) Clé de comparaison ------------------------------------------------------
--
-- IMMUTABLE est obligatoire : PostgreSQL n'indexe que des expressions dont le
-- résultat ne dépend que des arguments. C'est aussi pourquoi l'indicatif est
-- écrit en dur plutôt que lu dans une table de configuration — une fonction qui
-- lit une table ne peut pas servir d'index.
create or replace function spc_tel_cle(t text) returns text
  language sql immutable
as $$
  select case
    -- Aucun chiffre : pas de clé. Deux fiches sans téléphone ne sont PAS la
    -- même personne — la chaîne vide est exclue de l'index plus bas.
    when d = '' then ''
    -- Préfixe international explicite : 0033… → 0…
    when left(d, 4) = '0033' then '0' || right(d, length(d) - 4)
    -- 33 suivi des 9 chiffres d'un numéro français → 0 + ces 9 chiffres.
    -- La contrainte de longueur évite de mutiler un numéro étranger commençant
    -- par 33 sans être français.
    when left(d, 2) = '33' and length(d) = 11 then '0' || right(d, 9)
    else d
  end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x;
$$;

-- 2) Qui fusionner, et avec quoi décider -------------------------------------
--
-- Une ligne par fiche impliquée dans une collision, groupée par clé. Les
-- colonnes de droite existent pour l'arbitrage : on garde en général la fiche
-- qui porte les affectations et les heures.
create or replace view surveillants_tel_doublons as
select
  s.org_id,
  spc_tel_cle(s.telephone)                             as cle,
  s.id,
  s.nom,
  s.email,
  s.telephone                                          as telephone_saisi,
  s.heures,
  s.nb_examens,
  (select count(*) from affectations a where a.surveillant_id = s.id) as affectations,
  s.user_id is not null                                as compte_lie,
  s.created_at
from surveillants s
where s.org_id is not null
  and spc_tel_cle(s.telephone) <> ''
  and exists (
    select 1 from surveillants t
    where t.org_id = s.org_id
      and t.id <> s.id
      and spc_tel_cle(t.telephone) = spc_tel_cle(s.telephone)
  )
order by s.org_id, cle, s.created_at;

comment on view surveillants_tel_doublons is
  'Fiches de surveillants partageant un même numéro une fois normalisé (D-4b). '
  'Non vide ⇒ l''index surveillants_org_tel_cle_uniq ne peut pas être créé : '
  'fusionner d''abord, en conservant la fiche qui porte les affectations.';

-- 3) Index d'unicité — seulement si la voie est libre ------------------------
do $$
declare
  v_doublons integer;
  v_fiches   integer;
begin
  select count(distinct (org_id, cle)), count(*)
    into v_doublons, v_fiches
    from surveillants_tel_doublons;

  if v_doublons > 0 then
    raise notice E'\n'
      '>>> MIGRATION 33 — index NON créé, volontairement.\n'
      '>>> % numéro(s) portés par % fiche(s) distinctes.\n'
      '>>> Créer l''index maintenant ferait échouer la migration entière.\n'
      '>>> Arbitrer puis fusionner :  select * from surveillants_tel_doublons;\n'
      '>>> Puis rejouer cette migration — elle est idempotente.',
      v_doublons, v_fiches;
    return;
  end if;

  -- Le nouvel index d'abord. L'ancien ne part qu'ensuite : si la création
  -- échouait malgré tout, la table resterait protégée par l'index existant
  -- plutôt que de se retrouver sans aucune contrainte.
  create unique index if not exists surveillants_org_tel_cle_uniq
    on surveillants (org_id, spc_tel_cle(telephone))
    where org_id is not null
      and telephone is not null
      and spc_tel_cle(telephone) <> '';

  drop index if exists surveillants_org_tel_uniq;

  raise notice '>>> MIGRATION 33 — surveillants_org_tel_cle_uniq en place, '
               'ancien index retiré. Les formes +33/0033/nationale sont '
               'désormais un seul et même numéro.';
end $$;

-- Vérification manuelle :
--   select spc_tel_cle('+33 6 12 00 00 01'), spc_tel_cle('06 12 00 00 01');
--   -- doit renvoyer deux fois « 0612000001 »
