-- ============================================================================
-- SPC — Migration v20 : RPC d'onboarding (création d'organisation)
--
-- Création d'une organisation + rattachement du créateur en 'admin', de façon
-- atomique et sûre. security definer : contourne l'absence volontaire de policy
-- INSERT permissive sur organizations / organization_members (on ne veut PAS
-- qu'un utilisateur puisse s'ajouter arbitrairement à n'importe quelle org).
--
-- La fonction n'agit QUE pour l'utilisateur authentifié appelant (auth.uid()).
-- ============================================================================

create or replace function public.spc_create_organization(
  p_nom   text,
  p_taux  numeric default 12.31,
  p_coeff numeric default 0.7824
) returns uuid
  language plpgsql
  security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_slug text;
  v_base text;
  v_org  uuid;
  v_n    int := 0;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;
  if coalesce(trim(p_nom), '') = '' then
    raise exception 'Le nom de l''organisation est obligatoire';
  end if;

  -- slugify (minuscules, sans accents, tirets)
  v_base := regexp_replace(
              regexp_replace(lower(translate(p_nom, 'àâäéèêëîïôöûüç', 'aaaeeeeiioouuc')), '[^a-z0-9]+', '-', 'g'),
              '(^-+|-+$)', '', 'g');
  if v_base = '' then v_base := 'org'; end if;
  v_slug := v_base;
  while exists (select 1 from organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into organizations (nom, slug, taux_horaire, coefficient_net)
  values (trim(p_nom), v_slug, coalesce(p_taux, 12.31), coalesce(p_coeff, 0.7824))
  returning id into v_org;

  insert into organization_members (org_id, user_id, role)
  values (v_org, v_uid, 'admin')
  on conflict (org_id, user_id) do update set role = 'admin';

  return v_org;
end;
$$;

-- Exécutable par les utilisateurs authentifiés uniquement.
revoke all on function public.spc_create_organization(text, numeric, numeric) from public;
grant execute on function public.spc_create_organization(text, numeric, numeric) to authenticated;
