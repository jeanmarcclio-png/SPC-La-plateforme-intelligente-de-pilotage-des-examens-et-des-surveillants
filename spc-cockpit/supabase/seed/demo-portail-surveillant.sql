-- ============================================================================
-- SPC — Seed démo PORTAIL SURVEILLANT (phase 2)
--
-- Crée un jeu de test reproductible : organisation démo, 2 surveillants avec
-- COMPTES ACTIFS (auth + membership 'surveillant' + user_id lié), une session
-- (mission) et 2 affectations dont 1 REFUS EN ATTENTE (decline = true).
--
-- À exécuter APRÈS phase2-portail.sql, dans le SQL Editor (rôle service).
-- Idempotent. Mots de passe démo : Demo1234!
--   surv1@demo.spc  (Alice Martin — a REFUSÉ)
--   surv2@demo.spc  (Bruno Dupont — en attente de confirmation)
-- ============================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_org   uuid;
  v_u1    uuid;
  v_u2    uuid;
  v_s1    integer;
  v_s2    integer;
  v_mis   integer;
  v_a1    integer;
begin
  -- Organisation démo
  select id into v_org from organizations where slug = 'spc-demo';
  if v_org is null then
    insert into organizations (nom, slug, taux_horaire, coefficient_net)
    values ('SPC — Organisation démo', 'spc-demo', 12.31, 0.7824) returning id into v_org;
  end if;

  -- Comptes auth surveillants (créés si absents)
  select id into v_u1 from auth.users where email = 'surv1@demo.spc';
  if v_u1 is null then
    v_u1 := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_u1, 'authenticated', 'authenticated',
            'surv1@demo.spc', crypt('Demo1234!', gen_salt('bf')), now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{"nom":"Alice Martin"}');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_u1, v_u1::text, format('{"sub":"%s","email":"%s"}', v_u1, 'surv1@demo.spc')::jsonb,
            'email', now(), now(), now());
  end if;

  select id into v_u2 from auth.users where email = 'surv2@demo.spc';
  if v_u2 is null then
    v_u2 := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_u2, 'authenticated', 'authenticated',
            'surv2@demo.spc', crypt('Demo1234!', gen_salt('bf')), now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{"nom":"Bruno Dupont"}');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_u2, v_u2::text, format('{"sub":"%s","email":"%s"}', v_u2, 'surv2@demo.spc')::jsonb,
            'email', now(), now(), now());
  end if;

  -- Memberships 'surveillant'
  insert into organization_members (org_id, user_id, role) values
    (v_org, v_u1, 'surveillant'), (v_org, v_u2, 'surveillant')
  on conflict (org_id, user_id) do update set role = 'surveillant';

  -- Fiches surveillants (créées si absentes) + liaison compte
  select id into v_s1 from surveillants where org_id = v_org and nom = 'Alice Martin' limit 1;
  if v_s1 is null then
    insert into surveillants (org_id, nom, role, statut, matin, aprem, email, telephone)
    values (v_org, 'Alice Martin', 'Surveillant salle', 'Disponible', true, true, 'surv1@demo.spc', '0600000101')
    returning id into v_s1;
  end if;
  update surveillants set user_id = v_u1, invited_at = now() where id = v_s1;

  select id into v_s2 from surveillants where org_id = v_org and nom = 'Bruno Dupont' limit 1;
  if v_s2 is null then
    insert into surveillants (org_id, nom, role, statut, matin, aprem, email, telephone)
    values (v_org, 'Bruno Dupont', 'Surveillant salle', 'Disponible', true, false, 'surv2@demo.spc', '0600000102')
    returning id into v_s2;
  end if;
  update surveillants set user_id = v_u2, invited_at = now() where id = v_s2;

  -- Session (mission) démo
  select id into v_mis from missions where org_id = v_org and reference = 'EX-DEMO-PORTAIL' limit 1;
  if v_mis is null then
    insert into missions (org_id, reference, client, session, date_mission, type, nb_salles, nb_surveillants, statut)
    values (v_org, 'EX-DEMO-PORTAIL', 'Business School démo', 'Session test portail',
            (current_date + 5)::text, 'Examen écrit', 1, 2, 'Planifiée')
    returning id into v_mis;
  end if;

  -- Affectations : Alice (refus en attente) + Bruno (à confirmer)
  insert into affectations (org_id, mission_id, surveillant_id, role_mission, statut, salle, matin, matin_debut, matin_fin, decline, motif, decided_at)
  values (v_org, v_mis, v_s1, 'Surveillant salle', 'prevue', 'A101', true, '08:30', '11:30', true, 'Indisponible ce jour', now())
  on conflict (mission_id, surveillant_id) do update set decline = true, motif = 'Indisponible ce jour', decided_at = now()
  returning id into v_a1;

  insert into affectations (org_id, mission_id, surveillant_id, role_mission, statut, salle, matin, matin_debut, matin_fin)
  values (v_org, v_mis, v_s2, 'Surveillant salle', 'prevue', 'A102', true, '08:30', '11:30')
  on conflict (mission_id, surveillant_id) do nothing;

  raise notice 'Seed portail OK — org=% s1=% s2=% mission=% refus_affectation=%', v_org, v_s1, v_s2, v_mis, v_a1;
end $$;

-- Vérification
select 'surveillants actifs' as t, count(*) from surveillants where user_id is not null
union all select 'refus en attente', count(*) from affectations where decline = true;
