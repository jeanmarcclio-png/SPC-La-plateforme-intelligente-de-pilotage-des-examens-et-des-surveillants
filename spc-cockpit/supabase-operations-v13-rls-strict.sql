-- ============================================================================
-- SPC Opérations — Migration v13 : RLS restrictive par organisation + rôle (LOT 2)
--
-- ⚠️ À APPLIQUER SEULEMENT APRÈS :
--    1. avoir exécuté v12 ;
--    2. avoir fait le BACKFILL (org_id renseigné sur toutes les lignes) ;
--    3. avoir rattaché ton utilisateur via organization_members.
--    Sinon l'application n'affichera plus tes données (org_id NULL non visible).
--
-- Remplace les policies permissives « using(true) » par des policies scopées
-- à l'organisation de l'utilisateur, avec droits par rôle.
--
-- ROLLBACK : réappliquer supabase-setup-operations-complet.sql restaure les
-- policies permissives d'origine (ou voir le bloc « ROLLBACK » en fin de fichier).
-- ============================================================================

-- Helpers ---------------------------------------------------------------------
create or replace function spc_member_of(target uuid) returns boolean
  language sql stable security definer as $$
    select exists (select 1 from organization_members
                   where user_id = auth.uid() and org_id = target);
  $$;

create or replace function spc_has_role(target uuid, min_rank int) returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from organization_members
      where user_id = auth.uid() and org_id = target
        and case role
              when 'administrateur' then 3
              when 'coordinateur'   then 2
              when 'planificateur'  then 1
              else 0
            end >= min_rank
    );
  $$;

-- Modèle appliqué à chaque table métier (rangs : plan=1, valide/finance=2, admin=3)
--   select  → membre de l'org
--   insert  → planificateur+ (données planning) ; à ajuster pour finance
--   update  → planificateur+
--   delete  → administrateur uniquement
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  -- tables où insert/update = planificateur (rang 1)
  plan_tables text[] := array['missions','salles','surveillants','affectations','amenagements','incidents','devis_salles','journal_sessions'];
  -- tables financières où insert/update = coordinateur (rang 2)
  fin_tables text[]  := array['devis','devis_lignes','devis_equipe','factures'];
begin
  foreach t in array (plan_tables || fin_tables) loop
    execute format('alter table %I enable row level security', t);
    -- purge des policies permissives connues
    execute format('drop policy if exists "Auth read %1$s"   on %1$s', t);
    execute format('drop policy if exists "Auth insert %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth update %1$s" on %1$s', t);
    execute format('drop policy if exists "Auth delete %1$s" on %1$s', t);
    execute format('drop policy if exists "spc select %1$s" on %1$s', t);
    execute format('drop policy if exists "spc insert %1$s" on %1$s', t);
    execute format('drop policy if exists "spc update %1$s" on %1$s', t);
    execute format('drop policy if exists "spc delete %1$s" on %1$s', t);
    -- select : membre de l'organisation de la ligne
    execute format('create policy "spc select %1$s" on %1$s for select to authenticated using (spc_member_of(org_id))', t);
    -- delete : admin de l'org uniquement
    execute format('create policy "spc delete %1$s" on %1$s for delete to authenticated using (spc_has_role(org_id, 3))', t);
  end loop;

  foreach t in array plan_tables loop
    execute format('create policy "spc insert %1$s" on %1$s for insert to authenticated with check (spc_has_role(org_id, 1))', t);
    execute format('create policy "spc update %1$s" on %1$s for update to authenticated using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1))', t);
  end loop;

  foreach t in array fin_tables loop
    execute format('create policy "spc insert %1$s" on %1$s for insert to authenticated with check (spc_has_role(org_id, 2))', t);
    execute format('create policy "spc update %1$s" on %1$s for update to authenticated using (spc_has_role(org_id, 2)) with check (spc_has_role(org_id, 2))', t);
  end loop;
end $$;

-- Vérification : plus aucune policy permissive « true » sur les tables métier
select schemaname, tablename, policyname, qual
from pg_policies
where tablename in ('missions','devis','devis_lignes','devis_equipe','devis_salles',
                    'salles','surveillants','affectations','amenagements','factures',
                    'incidents','journal_sessions')
order by tablename, policyname;

-- ============================================================================
-- ROLLBACK (si besoin de revenir à l'état permissif) :
--   Réexécuter supabase-setup-operations-complet.sql, OU pour chaque table :
--   drop policy if exists "spc select <t>" on <t>; (idem insert/update/delete)
--   create policy "Auth read <t>" on <t> for select to authenticated using (true);
--   ... (recréer les 4 policies permissives)
-- ============================================================================
