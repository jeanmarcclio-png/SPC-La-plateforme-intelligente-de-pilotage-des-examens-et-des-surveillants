-- ============================================================================
-- SPC — Migration v27 : verrouillage mono-tenant (fondations d'autorisation)
--
-- CONTEXTE (audit sécurité) : en mode transition, l'application des rôles côté
-- applicatif est désactivée (`SPC_ENFORCE_ROLES ≠ 1`). Or certaines Server
-- Actions destructrices utilisent `service_role`, qui CONTOURNE la RLS
-- (ex. anonymisation d'un surveillant). Tant que les rôles ne sont pas appliqués,
-- tout compte authentifié peut déclencher ces actions → escalade de privilèges.
--
-- Activer l'application des rôles (`SPC_ENFORCE_ROLES=1`) ferme ce trou, MAIS
-- `getCurrentRole()` dégrade en « lecteur » tout compte SANS appartenance
-- (`organization_members`) → l'application deviendrait lecture seule pour lui.
--
-- Cette migration prépare une activation SANS VERROUILLAGE :
--   1. résout (ou crée) l'organisation unique ;
--   2. backfille `org_id` sur toutes les tables métier (plus aucune ligne
--      orpheline, invisible sous RLS stricte) + valeur par défaut ;
--   3. GARANTIT une appartenance à chaque compte auth (mono-tenant : tout
--      titulaire de compte est un employé SPC). Comptes liés à une fiche
--      surveillant → rôle « surveillant » ; les autres → « administrateur ».
--      Les appartenances existantes ne sont JAMAIS modifiées.
--
-- Elle NE réécrit AUCUNE policy RLS (le durcissement org+rôle des tables du
-- portail surveillant relève d'une phase multi-tenant, à tester contre le
-- portail). Elle est purement additive et idempotente.
--
-- APRÈS application : positionner `SPC_ENFORCE_ROLES=1` (Vercel) pour appliquer
-- les rôles côté applicatif — désormais sans risque de verrouillage.
-- ============================================================================

do $$
declare
  v_org uuid;
  t text;
  -- Tables métier portant une colonne org_id (cf. migration 11).
  biz_tables text[] := array[
    'missions','devis','devis_lignes','devis_equipe','devis_salles',
    'salles','surveillants','affectations','amenagements','factures',
    'incidents','journal_sessions'
  ];
begin
  -- 1) Organisation unique : la plus ancienne, ou création si aucune. -----------
  select id into v_org from organizations order by created_at nulls first, id limit 1;
  if v_org is null then
    insert into organizations (nom) values ('SPC') returning id into v_org;
    raise notice 'Aucune organisation : création de « SPC » (%).', v_org;
  else
    raise notice 'Organisation unique résolue : %.', v_org;
  end if;

  -- 2) Backfill org_id + valeur par défaut sur chaque table métier. -------------
  foreach t in array biz_tables loop
    execute format('update %I set org_id = %L where org_id is null', t, v_org);
    execute format('alter table %I alter column org_id set default %L', t, v_org);
  end loop;

  -- 3) Appartenance garantie pour chaque compte auth (anti-verrouillage). -------
  --    Rôle « surveillant » si le compte est lié à une fiche surveillant,
  --    sinon « administrateur » (employé SPC). N'écrase jamais l'existant.
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
    select 1 from organization_members m where m.user_id = u.id
  )
  on conflict (org_id, user_id) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- VÉRIFICATIONS (à exécuter après la migration) :
--
--   -- Aucune ligne métier sans org_id :
--   select 'surveillants' t, count(*) from surveillants where org_id is null
--   union all select 'affectations', count(*) from affectations where org_id is null
--   union all select 'missions', count(*) from missions where org_id is null;
--   -- → toutes les lignes doivent afficher 0.
--
--   -- Chaque compte auth a au moins une appartenance :
--   select count(*) as comptes_sans_appartenance
--   from auth.users u
--   where not exists (select 1 from organization_members m where m.user_id = u.id);
--   -- → doit afficher 0.
--
--   -- Répartition des rôles :
--   select role, count(*) from organization_members group by role order by role;
--
-- ROLLBACK : cette migration est additive (backfill + appartenances). Pour
-- annuler l'effet « défaut org_id » : alter table <t> alter column org_id drop default;
-- (les appartenances créées peuvent être retirées manuellement si nécessaire).
-- ============================================================================
