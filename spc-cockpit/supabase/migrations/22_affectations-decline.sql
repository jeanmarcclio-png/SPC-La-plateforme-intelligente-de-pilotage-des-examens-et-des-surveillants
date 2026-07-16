-- ============================================================================
-- SPC — Migration v22 : refus d'affectation + statut d'invitation (phase 2)
--
-- Un REFUS ne modifie jamais le planning : il pose un drapeau `decline` + un
-- `motif` sur l'affectation (le statut reste 'prevue'/'Proposé'). Le coordinateur
-- décide ensuite (remplacement, annulation).
--
-- Ajoute aussi `surveillants.invited_at` pour tracer le statut d'invitation :
--   user_id non NULL        → compte actif
--   invited_at non NULL     → invité (en attente d'activation)
--   sinon                   → non invité
--
-- Additif, non destructif, idempotent.
-- ============================================================================

alter table affectations
  add column if not exists decline    boolean default false,
  add column if not exists motif      text,
  add column if not exists decided_at timestamptz;

create index if not exists affectations_decline_idx on affectations(decline) where decline = true;

comment on column affectations.decline    is 'Refus surveillant (le planning n''est PAS modifié ; le coordinateur tranche).';
comment on column affectations.motif      is 'Motif optionnel du refus.';
comment on column affectations.decided_at is 'Horodatage de la confirmation / du refus par le surveillant.';

alter table surveillants
  add column if not exists invited_at timestamptz;

comment on column surveillants.invited_at is 'Date d''envoi de l''invitation (statut : non invité / invité / compte actif via user_id).';
