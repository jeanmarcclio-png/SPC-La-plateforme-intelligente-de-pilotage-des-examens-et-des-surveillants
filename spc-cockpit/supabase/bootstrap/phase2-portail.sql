-- ============================================================================
-- SPC — PHASE 2 : Portail surveillant (script consolidé, migrations 21→24)
--
-- À coller en UNE fois dans Supabase → SQL Editor → Run, APRÈS la phase 1
-- (organizations, surveillants, affectations doivent exister).
-- 100% idempotent (if not exists / create or replace / drop policy if exists).
--
-- Contenu : disponibilites, refus d'affectation, RLS role-aware (surveillant
-- limité à SES données), RPC confirmer/décliner sécurisées.
-- ============================================================================

-- ####### migrations/21_disponibilites.sql #######
-- ============================================================================
-- SPC — Migration v21 : disponibilités surveillants (portail — phase 2)
--
-- Déclaration de disponibilité par surveillant et par date (matin / après-midi).
-- Contrainte dure consommée par le copilote d'affectation (suggestions.ts) :
-- une date/créneau marqué indisponible ne sera JAMAIS suggéré.
--
-- Additif, idempotent. RLS activée ici ; les policies role-aware sont posées
-- en v23 (bloc unique et auditable pour surveillants/affectations/disponibilites).
-- ============================================================================

create table if not exists disponibilites (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizations(id) on delete cascade,
  surveillant_id integer not null references surveillants(id) on delete cascade,
  date           date not null,
  matin          boolean default false,
  aprem          boolean default false,
  commentaire    text,
  updated_at     timestamptz default now(),
  unique (surveillant_id, date)
);

create index if not exists disponibilites_surv_date_idx on disponibilites(surveillant_id, date);
create index if not exists disponibilites_org_idx        on disponibilites(org_id);

alter table disponibilites enable row level security;

comment on table  disponibilites               is 'Disponibilités déclarées par surveillant et par date (portail /moi).';
comment on column disponibilites.matin         is 'Disponible le matin ce jour-là.';
comment on column disponibilites.aprem         is 'Disponible l''après-midi ce jour-là.';
comment on column disponibilites.commentaire   is 'Note libre du surveillant (ex. « après 10h »).';


-- ####### migrations/22_affectations-decline.sql #######
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


-- ####### migrations/23_rls-portail-surveillant.sql #######
-- ============================================================================
-- SPC — Migration v23 : RLS role-aware pour le portail surveillant (phase 2)
--
-- Objectif (spec §5) : le rôle 'surveillant' ne LIT que SES données et n'ÉCRIT
-- (directement) que SES disponibilités ; la confirmation/refus d'affectation
-- passe par des RPC contrôlées (v24). Les rôles coordinateur/admin/planificateur
-- conservent l'accès complet à l'organisation (aucune régression cockpit).
--
-- Conçu pour être NON BLOQUANT en mode transition : les policies ne dépendent
-- PAS de org_id (qui peut être NULL sur des lignes legacy) mais du RÔLE de
-- l'utilisateur et du LIEN surveillants.user_id = auth.uid(). Les lignes à
-- org_id NULL restent donc visibles pour le coordinateur, comme aujourd'hui.
-- ============================================================================

-- Helpers -------------------------------------------------------------------
-- L'utilisateur courant est-il un surveillant (rôle 'surveillant' quelque part) ?
create or replace function spc_is_surveillant() returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from organization_members
      where user_id = auth.uid() and lower(role) = 'surveillant'
    );
  $$;

-- La ligne surveillants d'id `sid` est-elle rattachée au compte courant ?
create or replace function spc_owns_surveillant(sid integer) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from surveillants
      where id = sid and user_id = auth.uid()
    );
  $$;

-- SURVEILLANTS ---------------------------------------------------------------
alter table surveillants enable row level security;
drop policy if exists "Auth read surveillants"   on surveillants;
drop policy if exists "Auth insert surveillants" on surveillants;
drop policy if exists "Auth update surveillants" on surveillants;
drop policy if exists "Auth delete surveillants" on surveillants;
drop policy if exists "spc read surveillants"    on surveillants;
drop policy if exists "spc write surveillants"   on surveillants;

-- Lecture : coordinateur = tout ; surveillant = sa seule fiche (pas de fuite
-- de téléphone/heures d'autrui).
create policy "spc read surveillants" on surveillants for select to authenticated
  using (not spc_is_surveillant() or user_id = auth.uid());

-- Écriture (insert/update/delete) : réservée aux non-surveillants (coordinateur+).
create policy "spc insert surveillants" on surveillants for insert to authenticated
  with check (not spc_is_surveillant());
create policy "spc update surveillants" on surveillants for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
create policy "spc delete surveillants" on surveillants for delete to authenticated
  using (not spc_is_surveillant());

-- AFFECTATIONS ---------------------------------------------------------------
alter table affectations enable row level security;
drop policy if exists "Auth read affectations"   on affectations;
drop policy if exists "Auth insert affectations" on affectations;
drop policy if exists "Auth update affectations" on affectations;
drop policy if exists "Auth delete affectations" on affectations;
drop policy if exists "spc read affectations"    on affectations;

-- Lecture : coordinateur = tout ; surveillant = uniquement les affectations
-- où il est le surveillant affecté ou le remplaçant.
create policy "spc read affectations" on affectations for select to authenticated
  using (
    not spc_is_surveillant()
    or spc_owns_surveillant(surveillant_id)
    or spc_owns_surveillant(remplacant_id)
  );

-- Écriture directe : coordinateur+ uniquement. Le surveillant confirme/refuse
-- via les RPC de la v24 (contrôle de propriété + colonnes limitées).
create policy "spc insert affectations" on affectations for insert to authenticated
  with check (not spc_is_surveillant());
create policy "spc update affectations" on affectations for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
create policy "spc delete affectations" on affectations for delete to authenticated
  using (not spc_is_surveillant());

-- DISPONIBILITES -------------------------------------------------------------
drop policy if exists "spc read disponibilites"   on disponibilites;
drop policy if exists "spc insert disponibilites" on disponibilites;
drop policy if exists "spc update disponibilites" on disponibilites;
drop policy if exists "spc delete disponibilites" on disponibilites;

-- Lecture : coordinateur = tout ; surveillant = les siennes.
create policy "spc read disponibilites" on disponibilites for select to authenticated
  using (not spc_is_surveillant() or spc_owns_surveillant(surveillant_id));

-- Écriture : le surveillant gère les SIENNES ; le coordinateur peut aussi saisir.
create policy "spc insert disponibilites" on disponibilites for insert to authenticated
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
create policy "spc update disponibilites" on disponibilites for update to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant())
  with check (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());
create policy "spc delete disponibilites" on disponibilites for delete to authenticated
  using (spc_owns_surveillant(surveillant_id) or not spc_is_surveillant());


-- ####### migrations/24_portail-rpc.sql #######
-- ============================================================================
-- SPC — Migration v24 : RPC du portail surveillant (confirmer / décliner)
--
-- Le surveillant n'a PAS le droit d'UPDATE direct sur affectations (v23). Ces
-- RPC security definer garantissent qu'il n'agit QUE sur SES affectations et ne
-- touche QUE les colonnes autorisées (statut / decline / motif / decided_at).
--
--  confirmer → statut = 'confirmee' (efface un éventuel refus)
--  décliner  → decline = true + motif ; le STATUT/planning reste INCHANGÉ
--              (le coordinateur tranche : remplacement ou annulation).
-- ============================================================================

create or replace function public.spc_confirmer_affectation(p_affectation_id integer)
  returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  update affectations
     set statut = 'confirmee', decline = false, motif = null, decided_at = now()
   where id = p_affectation_id;
end;
$$;

create or replace function public.spc_decliner_affectation(
  p_affectation_id integer,
  p_motif text default null
) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from affectations a
    join surveillants s on s.id = a.surveillant_id
    where a.id = p_affectation_id and s.user_id = auth.uid()
  ) then
    raise exception 'Affectation non autorisée';
  end if;

  -- Refus motivé : on NE modifie PAS le statut (planning intact), on lève le drapeau.
  update affectations
     set decline = true,
         motif = nullif(trim(coalesce(p_motif, '')), ''),
         decided_at = now()
   where id = p_affectation_id;
end;
$$;

revoke all on function public.spc_confirmer_affectation(integer) from public;
revoke all on function public.spc_decliner_affectation(integer, text) from public;
grant execute on function public.spc_confirmer_affectation(integer) to authenticated;
grant execute on function public.spc_decliner_affectation(integer, text) to authenticated;

