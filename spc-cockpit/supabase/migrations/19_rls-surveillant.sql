-- ============================================================================
-- SPC — Migration v19 : rôle « surveillant » (préparation phase 2)
--
-- MODE TRANSITION (choix projet) : cette migration installe les HELPERS et
-- documente le durcissement, mais NE bascule PAS encore les policies
-- permissives d'affectations. Le durcissement réel (bloc « HARDENING » ci-bas)
-- s'applique en même temps que la v12 (RLS stricte), au go-live.
--
-- Règle cible (spec §2) :
--   admin / coordinateur / planificateur → lecture-écriture (via spc_has_role) ;
--   surveillant → LECTURE SEULE, et uniquement SES propres affectations
--   (celles où il est le surveillant affecté ou le remplaçant).
-- ============================================================================

-- Rôle applicatif de l'utilisateur dans une organisation (ou NULL). ----------
create or replace function spc_role_in(target uuid) returns text
  language sql stable security definer as $$
    select lower(role) from organization_members
    where user_id = auth.uid() and org_id = target limit 1;
  $$;

-- Vrai si l'utilisateur peut LIRE cette affectation :
--  - membre non-surveillant de l'org (accès complet en lecture) ; OU
--  - surveillant rattaché (surveillants.user_id = auth.uid()) et l'affectation
--    le concerne (surveillant_id ou remplacant_id).
create or replace function spc_can_read_affectation(
  p_org uuid, p_surveillant_id integer, p_remplacant_id integer
) returns boolean
  language sql stable security definer as $$
    select
      spc_member_of(p_org)
      and (
        coalesce(spc_role_in(p_org), '') <> 'surveillant'
        or exists (
          select 1 from surveillants s
          where s.user_id = auth.uid()
            and s.id in (p_surveillant_id, p_remplacant_id)
        )
      );
  $$;

-- ============================================================================
-- HARDENING (à exécuter avec la v12, PAS en mode transition) :
--
--   -- Purge des policies permissives d'affectations
--   drop policy if exists "Auth read affectations"   on affectations;
--   drop policy if exists "Auth insert affectations" on affectations;
--   drop policy if exists "Auth update affectations" on affectations;
--   drop policy if exists "Auth delete affectations" on affectations;
--   drop policy if exists "spc select affectations"  on affectations;
--
--   -- Lecture scopée surveillant
--   create policy "spc select affectations" on affectations for select to authenticated
--     using (spc_can_read_affectation(org_id, surveillant_id, remplacant_id));
--
--   -- Écriture réservée planificateur+ (le surveillant reste lecture seule)
--   create policy "spc insert affectations" on affectations for insert to authenticated
--     with check (spc_has_role(org_id, 1));
--   create policy "spc update affectations" on affectations for update to authenticated
--     using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1));
--   create policy "spc delete affectations" on affectations for delete to authenticated
--     using (spc_has_role(org_id, 3));
-- ============================================================================
