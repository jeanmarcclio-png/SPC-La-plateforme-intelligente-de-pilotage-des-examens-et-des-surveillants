-- ============================================================================
-- SPC — Migration v36 : clôture partie client (M1 + m2 + m4)
--
--  M1 — garde-fou : la soumission publique refuse une demande déjà verrouillée
--       (convertie / validée / annulée / archivée / expirée) pour éviter de
--       réécrire une demande déjà transformée en mission.
--  m2 — spc_portail_get renvoie le commentaire de correction quand la demande
--       est « À corriger », pour l'afficher au client.
--  m4 — table de paramètres org (taux horaire de facturation configurable).
--
-- Additive et idempotente.
-- ============================================================================

-- 1) m2 — lecture publique : ajoute le commentaire de correction --------------
create or replace function spc_portail_get(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lien       demandes_client_liens;
  v_dem        demandes_client;
  v_salles     jsonb;
  v_correction text;
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

  -- Commentaire de correction : uniquement si la demande est « À corriger ».
  if v_dem.statut = 'À corriger' then
    select detail into v_correction
    from demandes_client_journal
    where demande_id = v_dem.id and action = 'Demande de correction'
    order by created_at desc limit 1;
  end if;

  update demandes_client_liens set viewed_at = coalesce(viewed_at, now()) where id = v_lien.id;

  return jsonb_build_object(
    'etat', 'ok',
    'expires_at', v_lien.expires_at,
    'correction', v_correction,
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

-- 2) M1 — soumission publique : refuse une demande déjà verrouillée -----------
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
  v_statut     text;
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

  -- Garde-fou d'état (M1) : ne jamais réécrire une demande déjà transformée.
  select statut into v_statut from demandes_client where id = v_demande_id;
  if v_statut in ('Validée SPC', 'Convertie en mission', 'Annulée', 'Archivée', 'Expirée') then
    return jsonb_build_object('etat', 'revoque');
  end if;

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

revoke all on function spc_portail_get(text)          from public;
revoke all on function spc_portail_submit(text, jsonb) from public;
grant execute on function spc_portail_get(text)          to anon, authenticated;
grant execute on function spc_portail_submit(text, jsonb) to anon, authenticated;

-- 3) m4 — paramètres d'organisation (taux horaire de facturation, etc.) -------
create table if not exists org_parametres (
  org_id     uuid not null references organizations(id),
  cle        text not null,
  valeur     text,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (org_id, cle)
);

do $$
begin
  execute 'alter table org_parametres enable row level security';
  execute 'drop policy if exists "op select" on org_parametres';
  execute $f$create policy "op select" on org_parametres for select to authenticated
             using (org_id is null or spc_member_of(org_id))$f$;
  execute 'drop policy if exists "op upsert" on org_parametres';
  execute $f$create policy "op upsert" on org_parametres for insert to authenticated
             with check (org_id is null or spc_has_role(org_id, 2))$f$;
  execute 'drop policy if exists "op update" on org_parametres';
  execute $f$create policy "op update" on org_parametres for update to authenticated
             using (org_id is null or spc_has_role(org_id, 2))
             with check (org_id is null or spc_has_role(org_id, 2))$f$;
end $$;

-- ROLLBACK (manuel) : drop table if exists org_parametres;
