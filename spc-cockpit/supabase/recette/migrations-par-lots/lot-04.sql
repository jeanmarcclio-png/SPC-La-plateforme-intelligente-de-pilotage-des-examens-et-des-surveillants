-- ============================================================================
-- SPC Opérations — RECETTE · LOT 4/7
--
-- Migrations de ce lot : 15, 16, 17, 18, 19, 20, 21
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 15_profiles.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v15 : table profiles (SaaS multi-tenant, phase 1)
--
-- Profil applicatif adossé 1:1 à auth.users. Alimenté automatiquement à la
-- création d'un compte (trigger), et modifiable par son propriétaire uniquement.
-- Additif et idempotent : ne touche à aucune table métier existante.
-- ============================================================================

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nom        text,
  telephone  text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Un utilisateur ne voit et ne modifie que SON profil.
drop policy if exists "profile self select" on profiles;
drop policy if exists "profile self select" on profiles;
create policy "profile self select" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profile self insert" on profiles;
drop policy if exists "profile self insert" on profiles;
create policy "profile self insert" on profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profile self update" on profiles;
drop policy if exists "profile self update" on profiles;
create policy "profile self update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Création automatique du profil à l'inscription d'un compte auth.
-- security definer : le trigger s'exécute avec les droits du propriétaire du
-- schéma, indispensable pour écrire dans public.profiles depuis auth.
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom, telephone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'telephone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill des comptes déjà existants (idempotent).
insert into public.profiles (id, nom)
select u.id, coalesce(u.raw_user_meta_data->>'nom', u.raw_user_meta_data->>'full_name')
from auth.users u
on conflict (id) do nothing;


-- ── MIGRATION 16_org-parametres.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v16 : paramètres d'organisation (SaaS multi-tenant, phase 1)
--
-- Complète la table `organizations` (créée en v11) avec les champs attendus par
-- la spec SaaS : slug unique, taux horaire et coefficient net par organisation.
-- Additif et idempotent. Ne réécrit aucune donnée existante.
--
-- Valeurs par défaut alignées sur le moteur financier SPC :
--   taux_horaire    = 12.31  (€/h)
--   coefficient_net = 0.7824 (net / brut)
-- ============================================================================

alter table organizations
  add column if not exists slug            text,
  add column if not exists taux_horaire    numeric(6,2) default 12.31,
  add column if not exists coefficient_net numeric(6,4) default 0.7824;

-- Slug unique quand renseigné (les lignes legacy sans slug ne bloquent pas).
create unique index if not exists organizations_slug_key
  on organizations(slug) where slug is not null;

-- Renseigne un slug pour les organisations de démo existantes si absent
-- (slugify minimal : minuscules, tirets, sans accents).
update organizations
set slug = regexp_replace(
             regexp_replace(lower(translate(nom, 'àâäéèêëîïôöûüç', 'aaaeeeeiioouuc')), '[^a-z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g')
where slug is null;


-- ── MIGRATION 17_sessions.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v17 : table `sessions` (sessions d'examen) — SaaS phase 1
--
-- NOUVELLE table distincte de `missions` (décision produit). Modèle de la spec :
--   date, creneau, salle, duree_minutes, statut (prevue|annulee), besoin.
-- Scopée par organisation, RLS stricte dès l'origine (table greenfield, aucune
-- donnée legacy à protéger — pas de mode transition nécessaire ici).
--
-- Cette migration (re)définit aussi les helpers d'autorisation spc_member_of /
-- spc_has_role de façon idempotente, en élargissant la reconnaissance des rôles
-- au vocabulaire de la spec ('admin', 'surveillant'), afin que la table
-- `sessions` fonctionne que la migration v12 ait été appliquée ou non.
-- ============================================================================

-- Helpers d'autorisation (superset compatible v12 + rôles spec) ---------------
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
        and case lower(role)
              when 'administrateur' then 3
              when 'admin'          then 3
              when 'coordinateur'   then 2
              when 'planificateur'  then 1
              when 'surveillant'    then 0
              when 'lecteur'        then 0
              else 0
            end >= min_rank
    );
  $$;

-- Table sessions -------------------------------------------------------------
create table if not exists sessions (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references organizations(id) on delete cascade,
  date               date,
  creneau            text,                 -- ex. « Matin », « 08:30-11:30 »
  salle              text,
  duree_minutes      integer,
  statut             text default 'prevue',
  besoin_surveillants integer default 0,
  created_at         timestamptz default now(),
  constraint sessions_statut_chk check (statut in ('prevue', 'annulee'))
);

create index if not exists sessions_org_idx  on sessions(org_id);
create index if not exists sessions_date_idx on sessions(date);

alter table sessions enable row level security;

-- select : tout membre de l'organisation de la ligne.
drop policy if exists "spc select sessions" on sessions;
drop policy if exists "spc select sessions" on sessions;
create policy "spc select sessions" on sessions for select to authenticated
  using (spc_member_of(org_id));

-- insert / update : planificateur+ (rang 1).
drop policy if exists "spc insert sessions" on sessions;
drop policy if exists "spc insert sessions" on sessions;
create policy "spc insert sessions" on sessions for insert to authenticated
  with check (spc_has_role(org_id, 1));

drop policy if exists "spc update sessions" on sessions;
drop policy if exists "spc update sessions" on sessions;
create policy "spc update sessions" on sessions for update to authenticated
  using (spc_has_role(org_id, 1)) with check (spc_has_role(org_id, 1));

-- delete : administrateur uniquement (rang 3).
drop policy if exists "spc delete sessions" on sessions;
drop policy if exists "spc delete sessions" on sessions;
create policy "spc delete sessions" on sessions for delete to authenticated
  using (spc_has_role(org_id, 3));


-- ── MIGRATION 18_surveillants-affectations-liens.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v18 : alignement surveillants / affectations sur la spec SaaS
--
-- Additif et NON destructif. On NE réécrit PAS les colonnes existantes
-- (`dispo_matin`, `dispo_apm`, `statut`…) : on complète le modèle avec les
-- champs attendus par la spec, en cohérence avec l'existant.
--
--  surveillants : matin/aprem (booléens) + heures_matin/heures_aprem (texte),
--                 user_id (lien futur vers un compte auth — portail phase 2).
--  affectations : session_id (lien vers la nouvelle table sessions),
--                 remplacant_id (surveillant remplaçant).
--
-- NB statut d'affectation : conservé en texte libre pour ne pas casser les
-- lignes existantes ('Proposé', 'Confirmé'). Vocabulaire cible documenté :
--   'prevue' | 'confirmee' | 'annulee' | 'remplacee'.
-- ============================================================================

-- Surveillants ---------------------------------------------------------------
alter table surveillants
  add column if not exists matin         boolean default false,
  add column if not exists aprem         boolean default false,
  add column if not exists heures_matin  text,
  add column if not exists heures_aprem  text,
  add column if not exists user_id       uuid references auth.users(id) on delete set null;

create index if not exists surveillants_user_idx on surveillants(user_id);

comment on column surveillants.matin        is 'Disponible le matin (booléen). Complète dispo_matin (texte libre).';
comment on column surveillants.aprem        is 'Disponible l''après-midi (booléen). Complète dispo_apm (texte libre).';
comment on column surveillants.heures_matin is 'Plage horaire matin (texte, ex. « 08:30-11:30 »).';
comment on column surveillants.heures_aprem is 'Plage horaire après-midi (texte).';
comment on column surveillants.user_id      is 'Lien futur vers auth.users (portail surveillant, phase 2). NULL tant que non rattaché.';

-- Affectations ---------------------------------------------------------------
alter table affectations
  add column if not exists session_id    uuid references sessions(id) on delete cascade,
  add column if not exists remplacant_id integer references surveillants(id) on delete set null;

create index if not exists affectations_session_idx    on affectations(session_id);
create index if not exists affectations_remplacant_idx on affectations(remplacant_id);

comment on column affectations.session_id    is 'Lien vers sessions (spec SaaS). Coexiste avec mission_id (modèle Opérations).';
comment on column affectations.remplacant_id is 'Surveillant remplaçant (statut « remplacee »).';


-- ── MIGRATION 19_rls-surveillant.sql ───────────────────────────────────────────
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


-- ── MIGRATION 20_onboarding-rpc.sql ───────────────────────────────────────────
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


-- ── MIGRATION 21_disponibilites.sql ───────────────────────────────────────────
-- ============================================================================
-- SPC — Migration v21 : disponibilités surveillants (portail — phase 2)
--
-- Déclaration de disponibilité par surveillant et par date (matin / après-midi).
-- Contrainte dure consommée par le copilote d'affectation (suggestions.ts) :
-- une date/créneau marqué indisponible ne sera JAMAIS suggéré.
--
-- Additif, idempotent. RLS activée ici ; les policies role-aware sont posées
-- en v23 (bloc unique et auditable pour surveillants/affectations/disponibilites).
-- ============================================================================

create table if not exists disponibilites (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizations(id) on delete cascade,
  surveillant_id integer not null references surveillants(id) on delete cascade,
  date           date not null,
  matin          boolean default false,
  aprem          boolean default false,
  commentaire    text,
  updated_at     timestamptz default now(),
  unique (surveillant_id, date)
);

create index if not exists disponibilites_surv_date_idx on disponibilites(surveillant_id, date);
create index if not exists disponibilites_org_idx        on disponibilites(org_id);

alter table disponibilites enable row level security;

comment on table  disponibilites               is 'Disponibilités déclarées par surveillant et par date (portail /moi).';
comment on column disponibilites.matin         is 'Disponible le matin ce jour-là.';
comment on column disponibilites.aprem         is 'Disponible l''après-midi ce jour-là.';
comment on column disponibilites.commentaire   is 'Note libre du surveillant (ex. « après 10h »).';
