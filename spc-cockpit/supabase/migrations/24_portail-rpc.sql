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
