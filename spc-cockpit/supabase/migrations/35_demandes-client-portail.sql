-- ============================================================================
-- SPC — Migration v35 : Demandes client (Lot E) — portail client public
--
-- Permet à un établissement client de compléter/corriger une demande via un
-- LIEN SÉCURISÉ, sans compte. Garde-fous :
--   • On ne stocke QUE le hash SHA-256 du token (jamais le token en clair).
--   • Le rôle public (anon) ne lit AUCUNE table directement : la seule porte
--     est un couple de fonctions SECURITY DEFINER scellées, scopées à UNE
--     demande via le token. RLS deny-by-default partout ailleurs.
--   • Expiration + révocation + soumission unique.
--   • Données minimisées : les champs internes SPC (resp_spc, org_id…) ne sont
--     jamais renvoyés au client.
--
-- Additive et idempotente.
-- ============================================================================

-- 1) Table des liens ---------------------------------------------------------
create table if not exists demandes_client_liens (
  id           bigint generated always as identity primary key,
  org_id       uuid references organizations(id),
  demande_id   bigint not null references demandes_client(id) on delete cascade,
  token_hash   text not null unique,          -- SHA-256 du token (hex)
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  submitted_at timestamptz,
  viewed_at    timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid
);

create index if not exists dc_liens_org_idx     on demandes_client_liens(org_id);
create index if not exists dc_liens_demande_idx on demandes_client_liens(demande_id);

-- org_id par défaut (cohérent v31/v34)
do $$
declare v_org uuid;
begin
  select o.id into v_org from organizations o
  order by (o.nom ilike '%demo%' or o.nom ilike '%démo%'),
           (select count(*) from organization_members m where m.org_id = o.id) desc, o.created_at desc
  limit 1;
  if v_org is not null then
    execute format('alter table demandes_client_liens alter column org_id set default %L', v_org);
  end if;
end $$;

-- 2) RLS interne : membre pour lire ; planificateur+ pour créer/mettre à jour.
--    AUCUNE policy pour anon : l'accès public passe uniquement par les RPC.
do $$
begin
  execute 'alter table demandes_client_liens enable row level security';
  execute 'drop policy if exists "dcl select" on demandes_client_liens';
  execute $f$create policy "dcl select" on demandes_client_liens for select to authenticated
             using (org_id is null or spc_member_of(org_id))$f$;
  execute 'drop policy if exists "dcl insert" on demandes_client_liens';
  execute $f$create policy "dcl insert" on demandes_client_liens for insert to authenticated
             with check (org_id is null or spc_has_role(org_id, 1))$f$;
  execute 'drop policy if exists "dcl update" on demandes_client_liens';
  execute $f$create policy "dcl update" on demandes_client_liens for update to authenticated
             using (org_id is null or spc_has_role(org_id, 1))
             with check (org_id is null or spc_has_role(org_id, 1))$f$;
end $$;

-- 3) Lecture publique scellée : renvoie UNE demande via le hash du token ------
--    Retour jsonb { etat, demande?, salles?, expires_at? }. etat ∈
--    ok | invalide | expire | revoque | soumis. Champs internes SPC exclus.
create or replace function spc_portail_get(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lien   demandes_client_liens;
  v_dem    demandes_client;
  v_salles jsonb;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('etat', 'invalide');
  end if;

  select * into v_lien from demandes_client_liens where token_hash = p_token_hash;
  if v_lien.id is null then return jsonb_build_object('etat', 'invalide'); end if;
  if v_lien.revoked_at is not null then return jsonb_build_object('etat', 'revoque'); end if;
  if v_lien.submitted_at is not null then return jsonb_build_object('etat', 'soumis'); end if;
  if v_lien.expires_at < now() then return jsonb_build_object('etat', 'expire'); end if;

  select * into v_dem from demandes_client where id = v_lien.demande_id;
  if v_dem.id is null then return jsonb_build_object('etat', 'invalide'); end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'date_examen', s.date_examen, 'creneau', s.creneau, 'salle', s.salle,
             'batiment', s.batiment, 'etudiants', s.etudiants, 'surveillants', s.surveillants,
             'pmr', s.pmr, 'tiers_temps', s.tiers_temps,
             'debut_examen', s.debut_examen, 'fin_examen', s.fin_examen,
             'debut_surveillance', s.debut_surveillance, 'fin_surveillance', s.fin_surveillance,
             'observations', s.observations, 'ordre', s.ordre
           ) order by s.ordre), '[]'::jsonb)
    into v_salles
    from demandes_client_salles s where s.demande_id = v_dem.id;

  update demandes_client_liens set viewed_at = coalesce(viewed_at, now()) where id = v_lien.id;

  return jsonb_build_object(
    'etat', 'ok',
    'expires_at', v_lien.expires_at,
    'demande', jsonb_build_object(
      'reference', v_dem.reference,
      'statut', v_dem.statut,
      'etablissement', v_dem.etablissement,
      'campus', v_dem.campus,
      'adresse', v_dem.adresse,
      'ville', v_dem.ville,
      'code_postal', v_dem.code_postal,
      'reference_client', v_dem.reference_client,
      'type_etablissement', v_dem.type_etablissement,
      'demandeur_prenom', v_dem.demandeur_prenom, 'demandeur_nom', v_dem.demandeur_nom,
      'demandeur_fonction', v_dem.demandeur_fonction, 'demandeur_email', v_dem.demandeur_email,
      'demandeur_telephone', v_dem.demandeur_telephone, 'demandeur_service', v_dem.demandeur_service,
      'resp_client_prenom', v_dem.resp_client_prenom, 'resp_client_nom', v_dem.resp_client_nom,
      'resp_client_fonction', v_dem.resp_client_fonction, 'resp_client_email', v_dem.resp_client_email,
      'resp_client_telephone', v_dem.resp_client_telephone,
      'pmr_present', v_dem.pmr_present, 'pmr_nombre', v_dem.pmr_nombre, 'pmr_details', v_dem.pmr_details,
      'tiers_temps_present', v_dem.tiers_temps_present, 'tiers_temps_nombre', v_dem.tiers_temps_nombre,
      'tiers_temps_details', v_dem.tiers_temps_details,
      'besoins_specifiques', v_dem.besoins_specifiques,
      'observations', v_dem.observations
    ),
    'salles', v_salles
  );
end;
$$;

-- 4) Soumission publique scellée : écrit les champs client + remplace salles --
--    Passe la demande en « Soumise par client », consomme le lien, journalise.
create or replace function spc_portail_submit(p_token_hash text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lien       demandes_client_liens;
  v_demande_id bigint;
  v_org_id     uuid;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('etat', 'invalide');
  end if;

  select * into v_lien from demandes_client_liens where token_hash = p_token_hash for update;
  if v_lien.id is null then return jsonb_build_object('etat', 'invalide'); end if;
  if v_lien.revoked_at is not null then return jsonb_build_object('etat', 'revoque'); end if;
  if v_lien.submitted_at is not null then return jsonb_build_object('etat', 'soumis'); end if;
  if v_lien.expires_at < now() then return jsonb_build_object('etat', 'expire'); end if;

  v_demande_id := v_lien.demande_id;
  v_org_id     := v_lien.org_id;

  -- Garde-fou minimal : établissement obligatoire.
  if coalesce(trim(p_payload->>'etablissement'), '') = '' then
    return jsonb_build_object('etat', 'erreur', 'message', 'Établissement obligatoire');
  end if;

  update demandes_client set
    etablissement        = trim(p_payload->>'etablissement'),
    campus               = nullif(trim(coalesce(p_payload->>'campus', '')), ''),
    adresse              = nullif(trim(coalesce(p_payload->>'adresse', '')), ''),
    ville                = nullif(trim(coalesce(p_payload->>'ville', '')), ''),
    code_postal          = nullif(trim(coalesce(p_payload->>'code_postal', '')), ''),
    reference_client     = nullif(trim(coalesce(p_payload->>'reference_client', '')), ''),
    type_etablissement   = nullif(trim(coalesce(p_payload->>'type_etablissement', '')), ''),
    demandeur_prenom     = nullif(trim(coalesce(p_payload->>'demandeur_prenom', '')), ''),
    demandeur_nom        = nullif(trim(coalesce(p_payload->>'demandeur_nom', '')), ''),
    demandeur_fonction   = nullif(trim(coalesce(p_payload->>'demandeur_fonction', '')), ''),
    demandeur_email      = nullif(trim(coalesce(p_payload->>'demandeur_email', '')), ''),
    demandeur_telephone  = nullif(trim(coalesce(p_payload->>'demandeur_telephone', '')), ''),
    demandeur_service    = nullif(trim(coalesce(p_payload->>'demandeur_service', '')), ''),
    resp_client_prenom   = nullif(trim(coalesce(p_payload->>'resp_client_prenom', '')), ''),
    resp_client_nom      = nullif(trim(coalesce(p_payload->>'resp_client_nom', '')), ''),
    resp_client_fonction = nullif(trim(coalesce(p_payload->>'resp_client_fonction', '')), ''),
    resp_client_email    = nullif(trim(coalesce(p_payload->>'resp_client_email', '')), ''),
    resp_client_telephone= nullif(trim(coalesce(p_payload->>'resp_client_telephone', '')), ''),
    pmr_present          = coalesce((p_payload->>'pmr_present')::boolean, false),
    pmr_nombre           = coalesce((p_payload->>'pmr_nombre')::int, 0),
    pmr_details          = nullif(trim(coalesce(p_payload->>'pmr_details', '')), ''),
    tiers_temps_present  = coalesce((p_payload->>'tiers_temps_present')::boolean, false),
    tiers_temps_nombre   = coalesce((p_payload->>'tiers_temps_nombre')::int, 0),
    tiers_temps_details  = nullif(trim(coalesce(p_payload->>'tiers_temps_details', '')), ''),
    besoins_specifiques  = coalesce(p_payload->'besoins_specifiques', besoins_specifiques),
    observations         = nullif(trim(coalesce(p_payload->>'observations', '')), ''),
    statut               = 'Soumise par client',
    updated_at           = now()
  where id = v_demande_id;

  -- Remplace intégralement les salles par celles soumises.
  delete from demandes_client_salles where demande_id = v_demande_id;
  insert into demandes_client_salles
    (org_id, demande_id, date_examen, creneau, salle, batiment, etudiants, surveillants,
     pmr, tiers_temps, debut_examen, fin_examen, debut_surveillance, fin_surveillance, observations, ordre)
  select
    v_org_id, v_demande_id,
    nullif(e->>'date_examen', '')::date,
    coalesce(nullif(e->>'creneau', ''), 'matin'),
    trim(e->>'salle'),
    nullif(trim(coalesce(e->>'batiment', '')), ''),
    coalesce((e->>'etudiants')::int, 0),
    coalesce((e->>'surveillants')::int, 1),
    coalesce((e->>'pmr')::boolean, false),
    coalesce((e->>'tiers_temps')::boolean, false),
    nullif(trim(coalesce(e->>'debut_examen', '')), ''),
    nullif(trim(coalesce(e->>'fin_examen', '')), ''),
    nullif(trim(coalesce(e->>'debut_surveillance', '')), ''),
    nullif(trim(coalesce(e->>'fin_surveillance', '')), ''),
    nullif(trim(coalesce(e->>'observations', '')), ''),
    ord::int
  from jsonb_array_elements(coalesce(p_payload->'salles', '[]'::jsonb)) with ordinality as t(e, ord)
  where coalesce(trim(e->>'salle'), '') <> '';

  update demandes_client_liens set submitted_at = now() where id = v_lien.id;

  insert into demandes_client_journal (demande_id, org_id, action, detail)
  values (v_demande_id, v_org_id, 'Soumission client', 'Demande complétée via le portail sécurisé');

  return jsonb_build_object('etat', 'ok');
end;
$$;

-- 5) Grants : seules ces deux fonctions sont exécutables par le public --------
revoke all on function spc_portail_get(text)          from public;
revoke all on function spc_portail_submit(text, jsonb) from public;
grant execute on function spc_portail_get(text)          to anon, authenticated;
grant execute on function spc_portail_submit(text, jsonb) to anon, authenticated;

-- ROLLBACK (manuel) :
--   drop function if exists spc_portail_submit(text, jsonb);
--   drop function if exists spc_portail_get(text);
--   drop table if exists demandes_client_liens;
