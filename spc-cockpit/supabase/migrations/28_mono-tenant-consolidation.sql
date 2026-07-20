-- ============================================================================
-- SPC — Migration v28 : consolidation mono-tenant (CORRECTIF de la v27)
--
-- La v27 résolvait « l'organisation la plus ANCIENNE » comme org cible. Or, sur
-- l'instance de production, l'org la plus ancienne était « SPC Démo » (org de
-- test vide) et non « SPC » (la vraie org, créée après). La v27 aurait donc
-- rattaché toutes les données à l'org de démo.
--
-- Cette migration cible la VRAIE organisation de façon robuste :
--   priorité aux organisations dont le nom N'EST PAS « démo/demo »,
--   puis celle qui a le PLUS de membres, puis la plus récente.
-- Puis : backfill org_id + valeur par défaut + rattachement de TOUS les comptes
-- à cette org (surveillant si lié à une fiche, sinon administrateur).
--
-- Reflète l'état appliqué manuellement en production le 2026-07-20.
-- Idempotente, additive (aucune suppression). La suppression de l'org de démo
-- résiduelle est un geste d'exploitation distinct (voir bloc commenté en fin).
-- ============================================================================

do $$
declare
  v_org uuid;
  v_nom text;
  t text;
  biz_tables text[] := array[
    'missions','devis','devis_lignes','devis_equipe','devis_salles',
    'salles','surveillants','affectations','amenagements','factures',
    'incidents','journal_sessions'
  ];
begin
  -- 1) Organisation cible : la « vraie » org (nom ≠ démo, sinon la plus peuplée).
  select o.id, o.nom into v_org, v_nom
  from organizations o
  order by (o.nom ilike '%demo%' or o.nom ilike '%démo%'),                       -- démo en dernier
           (select count(*) from organization_members m where m.org_id = o.id) desc,
           o.created_at desc
  limit 1;

  if v_org is null then
    insert into organizations (nom) values ('SPC') returning id into v_org;
    v_nom := 'SPC';
  end if;
  raise notice 'Organisation cible : % (%).', v_nom, v_org;

  -- 2) Backfill org_id + valeur par défaut sur chaque table métier.
  foreach t in array biz_tables loop
    execute format('update %I set org_id = %L where org_id is null', t, v_org);
    execute format('alter table %I alter column org_id set default %L', t, v_org);
  end loop;

  -- 3) Rattachement de TOUS les comptes auth à l'org cible (anti-verrouillage).
  --    surveillant si lié à une fiche, sinon administrateur. N'écrase rien.
  insert into organization_members (org_id, user_id, role)
  select
    v_org,
    u.id,
    case
      when exists (select 1 from surveillants s where s.user_id = u.id)
      then 'surveillant'
      else 'administrateur'
    end
  from auth.users u
  where not exists (
    select 1 from organization_members m where m.org_id = v_org and m.user_id = u.id
  )
  on conflict (org_id, user_id) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- Nettoyage d'une org de démonstration résiduelle (geste d'exploitation).
-- Sûr : s'annule si l'org contient la moindre donnée métier. Décommenter pour
-- l'exécuter (les comptes concernés doivent déjà être membres de la vraie org).
--
-- do $$
-- declare v_demo uuid; v_rows int;
-- begin
--   select id into v_demo from organizations
--    where nom ilike '%démo%' or nom ilike '%demo%' limit 1;
--   if v_demo is null then raise notice 'Pas d''org démo.'; return; end if;
--   select (select count(*) from surveillants where org_id=v_demo)
--        + (select count(*) from missions where org_id=v_demo)
--        + (select count(*) from affectations where org_id=v_demo)
--        + (select count(*) from devis where org_id=v_demo)
--        + (select count(*) from salles where org_id=v_demo)
--        + (select count(*) from amenagements where org_id=v_demo)
--        + (select count(*) from factures where org_id=v_demo)
--        + (select count(*) from incidents where org_id=v_demo)
--        + (select count(*) from journal_sessions where org_id=v_demo) into v_rows;
--   if v_rows > 0 then raise exception 'Org démo NON vide (% lignes).', v_rows; end if;
--   delete from organization_members where org_id = v_demo;
--   delete from organizations where id = v_demo;
-- end $$;
--
-- VÉRIFICATION : select count(*) as nb_orgs from organizations;  -- attendu : 1
-- ============================================================================
