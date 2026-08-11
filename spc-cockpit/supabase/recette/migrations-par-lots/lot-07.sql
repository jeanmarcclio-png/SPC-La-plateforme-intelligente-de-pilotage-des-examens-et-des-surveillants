-- ============================================================================
-- SPC Opérations — RECETTE · LOT 7/7
--
-- Migrations de ce lot : 32
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
