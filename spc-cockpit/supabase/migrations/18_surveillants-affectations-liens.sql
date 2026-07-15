-- ============================================================================
-- SPC — Migration v18 : alignement surveillants / affectations sur la spec SaaS
--
-- Additif et NON destructif. On NE réécrit PAS les colonnes existantes
-- (`dispo_matin`, `dispo_apm`, `statut`…) : on complète le modèle avec les
-- champs attendus par la spec, en cohérence avec l'existant.
--
--  surveillants : matin/aprem (booléens) + heures_matin/heures_aprem (texte),
--                 user_id (lien futur vers un compte auth — portail phase 2).
--  affectations : session_id (lien vers la nouvelle table sessions),
--                 remplacant_id (surveillant remplaçant).
--
-- NB statut d'affectation : conservé en texte libre pour ne pas casser les
-- lignes existantes ('Proposé', 'Confirmé'). Vocabulaire cible documenté :
--   'prevue' | 'confirmee' | 'annulee' | 'remplacee'.
-- ============================================================================

-- Surveillants ---------------------------------------------------------------
alter table surveillants
  add column if not exists matin         boolean default false,
  add column if not exists aprem         boolean default false,
  add column if not exists heures_matin  text,
  add column if not exists heures_aprem  text,
  add column if not exists user_id       uuid references auth.users(id) on delete set null;

create index if not exists surveillants_user_idx on surveillants(user_id);

comment on column surveillants.matin        is 'Disponible le matin (booléen). Complète dispo_matin (texte libre).';
comment on column surveillants.aprem        is 'Disponible l''après-midi (booléen). Complète dispo_apm (texte libre).';
comment on column surveillants.heures_matin is 'Plage horaire matin (texte, ex. « 08:30-11:30 »).';
comment on column surveillants.heures_aprem is 'Plage horaire après-midi (texte).';
comment on column surveillants.user_id      is 'Lien futur vers auth.users (portail surveillant, phase 2). NULL tant que non rattaché.';

-- Affectations ---------------------------------------------------------------
alter table affectations
  add column if not exists session_id    uuid references sessions(id) on delete cascade,
  add column if not exists remplacant_id integer references surveillants(id) on delete set null;

create index if not exists affectations_session_idx    on affectations(session_id);
create index if not exists affectations_remplacant_idx on affectations(remplacant_id);

comment on column affectations.session_id    is 'Lien vers sessions (spec SaaS). Coexiste avec mission_id (modèle Opérations).';
comment on column affectations.remplacant_id is 'Surveillant remplaçant (statut « remplacee »).';
