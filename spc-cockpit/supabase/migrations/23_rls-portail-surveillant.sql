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
