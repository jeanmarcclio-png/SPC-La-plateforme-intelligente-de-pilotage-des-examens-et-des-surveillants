-- ============================================================================
-- SPC — Seed de démonstration SaaS multi-tenant (phase 1)
--
-- Crée : 1 organisation, 3 comptes (admin / coordinateur / surveillant),
--        10 surveillants, 5 sessions d'examen.
--
-- À exécuter APRÈS les migrations 15 → 19, dans le SQL Editor Supabase
-- (rôle service — accès au schéma auth requis). Idempotent : ré-exécutable
-- sans créer de doublons (clé sur les emails / le slug d'organisation).
--
-- Mots de passe de démo (à changer hors démo) :
--   admin@demo.spc         / Demo1234!
--   coordinateur@demo.spc  / Demo1234!
--   surveillant@demo.spc   / Demo1234!
-- ============================================================================

-- pgcrypto pour crypt()/gen_salt() (présent par défaut sur Supabase).
create extension if not exists pgcrypto;

do $$
declare
  v_org_id  uuid;
  v_admin   uuid;
  v_coord   uuid;
  v_surv    uuid;
  v_surv_row uuid;  -- surveillant lié au compte surveillant (surveillants.user_id)
begin
  -- 1) Organisation de démo ---------------------------------------------------
  select id into v_org_id from organizations where slug = 'spc-demo';
  if v_org_id is null then
    insert into organizations (nom, slug, taux_horaire, coefficient_net)
    values ('SPC — Organisation démo', 'spc-demo', 12.31, 0.7824)
    returning id into v_org_id;
  end if;

  -- 2) Comptes auth (créés si absents) ---------------------------------------
  -- Fonction interne : crée un utilisateur GoTrue complet (users + identities).
  --   Retourne l'id existant si l'email est déjà pris.
  perform 1;

  -- admin
  select id into v_admin from auth.users where email = 'admin@demo.spc';
  if v_admin is null then
    v_admin := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
            'admin@demo.spc', crypt('Demo1234!', gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}',
            '{"nom":"Admin Démo"}');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_admin, v_admin::text,
            format('{"sub":"%s","email":"%s"}', v_admin, 'admin@demo.spc')::jsonb,
            'email', now(), now(), now());
  end if;

  -- coordinateur
  select id into v_coord from auth.users where email = 'coordinateur@demo.spc';
  if v_coord is null then
    v_coord := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_coord, 'authenticated', 'authenticated',
            'coordinateur@demo.spc', crypt('Demo1234!', gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}',
            '{"nom":"Coordinateur Démo"}');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_coord, v_coord::text,
            format('{"sub":"%s","email":"%s"}', v_coord, 'coordinateur@demo.spc')::jsonb,
            'email', now(), now(), now());
  end if;

  -- surveillant
  select id into v_surv from auth.users where email = 'surveillant@demo.spc';
  if v_surv is null then
    v_surv := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', v_surv, 'authenticated', 'authenticated',
            'surveillant@demo.spc', crypt('Demo1234!', gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}',
            '{"nom":"Surveillant Démo"}');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_surv, v_surv::text,
            format('{"sub":"%s","email":"%s"}', v_surv, 'surveillant@demo.spc')::jsonb,
            'email', now(), now(), now());
  end if;

  -- Profils (le trigger v15 les crée déjà ; upsert défensif) ------------------
  insert into profiles (id, nom) values
    (v_admin, 'Admin Démo'), (v_coord, 'Coordinateur Démo'), (v_surv, 'Surveillant Démo')
  on conflict (id) do update set nom = excluded.nom;

  -- 3) Appartenances (rôles spec : admin / coordinateur / surveillant) --------
  insert into organization_members (org_id, user_id, role) values
    (v_org_id, v_admin, 'admin'),
    (v_org_id, v_coord, 'coordinateur'),
    (v_org_id, v_surv,  'surveillant')
  on conflict (org_id, user_id) do update set role = excluded.role;

  -- 4) 10 surveillants (rattachés à l'org) -----------------------------------
  insert into surveillants (org_id, nom, role, statut, matin, aprem, heures_matin, heures_aprem, telephone, email)
  values
    (v_org_id, 'Marie Lecomte',      'Coordinatrice',      'Disponible', true,  false, '08:00-14:00', null,          '0600000001', 'marie.lecomte@demo.spc'),
    (v_org_id, 'Jean-Pierre Moreau', 'Surveillant volant', 'Disponible', true,  true,  '08:00-13:00', '13:30-18:00', '0600000002', 'jp.moreau@demo.spc'),
    (v_org_id, 'Fatima Benali',      'Surveillant salle',  'Disponible', false, true,  null,          '13:00-18:00', '0600000003', 'fatima.benali@demo.spc'),
    (v_org_id, 'Thomas Girard',      'Surveillant PMR',    'Disponible', true,  true,  '08:30-13:00', '13:30-18:30', '0600000004', 'thomas.girard@demo.spc'),
    (v_org_id, 'Sophie Dubois',      'Coordinatrice',      'Disponible', false, true,  null,          '13:00-19:00', '0600000005', 'sophie.dubois@demo.spc'),
    (v_org_id, 'Karim Haddad',       'Surveillant salle',  'Disponible', true,  false, '08:30-13:30', null,          '0600000006', 'karim.haddad@demo.spc'),
    (v_org_id, 'Léa Fontaine',       'Surveillant volant', 'Disponible', true,  true,  '08:00-12:00', '13:00-17:00', '0600000007', 'lea.fontaine@demo.spc'),
    (v_org_id, 'Marc Petit',         'Surveillant salle',  'Disponible', false, false, null,          null,          '0600000008', 'marc.petit@demo.spc'),
    (v_org_id, 'Nadia Cherif',       'Surveillant salle',  'Disponible', true,  true,  '08:30-11:30', '14:00-17:00', '0600000009', 'nadia.cherif@demo.spc'),
    (v_org_id, 'Paul Rousseau',      'Surveillant PMR',    'Disponible', true,  false, '08:00-12:00', null,          '0600000010', 'paul.rousseau@demo.spc')
  on conflict do nothing;

  -- Rattache le compte « surveillant » au surveillant Marc Petit (démo portail).
  select id into v_surv_row from surveillants where org_id = v_org_id and nom = 'Marc Petit' limit 1;
  if v_surv_row is not null then
    update surveillants set user_id = v_surv where id = v_surv_row;
  end if;

  -- 5) 5 sessions d'examen ---------------------------------------------------
  insert into sessions (org_id, date, creneau, salle, duree_minutes, statut, besoin_surveillants)
  values
    (v_org_id, current_date + 7,  'Matin (08:30-11:30)',  'Amphi A',  180, 'prevue', 4),
    (v_org_id, current_date + 7,  'Après-midi (14:00-17:00)', 'Amphi A', 180, 'prevue', 4),
    (v_org_id, current_date + 8,  'Matin (09:00-12:00)',  'Salle B21', 180, 'prevue', 2),
    (v_org_id, current_date + 14, 'Journée (09:00-17:00)', 'Amphi C', 480, 'prevue', 6),
    (v_org_id, current_date + 21, 'Matin (08:30-10:30)',  'Salle D14', 120, 'annulee', 2)
  on conflict do nothing;

  raise notice 'Seed SPC démo OK — org=% admin=% coord=% surv=%', v_org_id, v_admin, v_coord, v_surv;
end $$;

-- Vérification ---------------------------------------------------------------
select 'organizations' as t, count(*) from organizations where slug = 'spc-demo'
union all select 'members', count(*) from organization_members where org_id in (select id from organizations where slug='spc-demo')
union all select 'surveillants', count(*) from surveillants where org_id in (select id from organizations where slug='spc-demo')
union all select 'sessions', count(*) from sessions where org_id in (select id from organizations where slug='spc-demo');
