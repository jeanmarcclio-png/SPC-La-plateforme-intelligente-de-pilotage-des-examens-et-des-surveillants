-- ============================================================================
-- SPC Opérations — RECETTE · LOT 6/7
--
-- Migrations de ce lot : 27, 28, 29, 30, 31
--
-- Généré par supabase/recette/generer-lots.py — ne pas éditer à la main.
--
-- À coller dans Supabase → SQL Editor → Run. LOTS DANS L'ORDRE : 1, puis 2, etc.
-- Attendre la fin d'un lot avant de lancer le suivant.
--
-- SÛR À REJOUER : tables, colonnes, index et vues en « if not exists » /
-- « or replace », et chaque politique RLS précédée de son « drop policy if
-- exists ». Un lot interrompu se relance depuis son début, sans risque.
-- ============================================================================


-- ── MIGRATION 27_mono-tenant-lockdown.sql ───────────────────────────────────────────
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


-- ── MIGRATION 28_mono-tenant-consolidation.sql ───────────────────────────────────────────
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


-- ── MIGRATION 29_affectations-multi-creneaux.sql ───────────────────────────────────────────
-- 29 · Multi-créneaux par demi-journée pour les affectations
--
-- Contexte : jusqu'ici chaque affectation portait UN créneau matin
-- (matin_debut/matin_fin) et UN créneau après-midi (apm_debut/apm_fin).
-- Le métier réel : un surveillant peut enchaîner plusieurs surveillances
-- sur une même demi-journée (ex. 08:00–09:30, 10:00–11:30, 12:00–13:30).
--
-- Approche non destructive : on conserve matin/matin_debut/matin_fin (et apm/…)
-- comme « 1er créneau » — tous les consommateurs existants (agents IA, portail
-- surveillant, journal, moteur) continuent de fonctionner sans changement. On
-- ajoute deux colonnes jsonb qui portent la LISTE COMPLÈTE des créneaux de la
-- demi-journée (chaque élément = {"debut":"HH:MM","fin":"HH:MM"}), source de
-- vérité pour la planification (total heures, timeline, détection de conflits).

alter table public.affectations
  add column if not exists matin_creneaux jsonb,
  add column if not exists apm_creneaux jsonb;

comment on column public.affectations.matin_creneaux is
  'Liste des créneaux du matin [{debut,fin}]. NULL = retomber sur matin_debut/matin_fin (1er créneau).';
comment on column public.affectations.apm_creneaux is
  'Liste des créneaux de l''après-midi [{debut,fin}]. NULL = retomber sur apm_debut/apm_fin (1er créneau).';


-- ── MIGRATION 30_creneaux-table.sql ───────────────────────────────────────────
-- 30 · Table enfant `creneaux` = source de vérité des créneaux de surveillance
--
-- Phase 2 du multi-créneaux : au lieu de stocker les créneaux dans des colonnes
-- (matin_debut/fin, apm_debut/fin) + un jsonb (§29), on les normalise dans une
-- vraie table enfant. Objectif : que TOUS les créneaux d'une demi-journée soient
-- visibles partout (cockpit, portail surveillant, agent Risques IA), avec une
-- seule source de vérité.
--
-- Les colonnes matin*/apm* d'affectations sont conservées (compat + repli), mais
-- `creneaux` fait foi. RLS calquée à l'identique sur celle d'affectations (§23).

create table if not exists public.creneaux (
  id            bigint generated always as identity primary key,
  affectation_id bigint not null references public.affectations(id) on delete cascade,
  org_id        uuid references public.organizations(id),
  periode       text not null check (periode in ('matin', 'apm')),
  debut         text not null,   -- "HH:MM"
  fin           text not null,   -- "HH:MM"
  ordre         int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists creneaux_affectation_idx on public.creneaux(affectation_id);
create index if not exists creneaux_org_idx         on public.creneaux(org_id);

-- Backfill depuis l'existant : la liste jsonb (§29) prime, sinon le créneau
-- unique matin_debut/fin (et apm_debut/fin).
insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'matin',
       (c->>'debut'), (c->>'fin'),
       (ord.n - 1)
from public.affectations a
cross join lateral jsonb_array_elements(a.matin_creneaux) with ordinality as ord(c, n)
where a.matin_creneaux is not null and jsonb_typeof(a.matin_creneaux) = 'array';

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'matin', a.matin_debut, a.matin_fin, 0
from public.affectations a
where a.matin is true and a.matin_creneaux is null
  and a.matin_debut is not null and a.matin_fin is not null;

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'apm',
       (c->>'debut'), (c->>'fin'),
       (ord.n - 1)
from public.affectations a
cross join lateral jsonb_array_elements(a.apm_creneaux) with ordinality as ord(c, n)
where a.apm_creneaux is not null and jsonb_typeof(a.apm_creneaux) = 'array';

insert into public.creneaux (affectation_id, org_id, periode, debut, fin, ordre)
select a.id, a.org_id, 'apm', a.apm_debut, a.apm_fin, 0
from public.affectations a
where a.apm is true and a.apm_creneaux is null
  and a.apm_debut is not null and a.apm_fin is not null;

-- RLS — calquée à l'identique sur affectations (§23) :
--  · coordinateur+ : accès complet
--  · surveillant   : lecture des créneaux de SES affectations uniquement,
--                    aucune écriture directe (le cockpit écrit côté coordinateur).
alter table public.creneaux enable row level security;

drop policy if exists "spc read creneaux"   on public.creneaux;
drop policy if exists "spc insert creneaux" on public.creneaux;
drop policy if exists "spc update creneaux" on public.creneaux;
drop policy if exists "spc delete creneaux" on public.creneaux;

drop policy if exists "spc read creneaux" on public.creneaux;
create policy "spc read creneaux" on public.creneaux for select to authenticated
  using (
    not spc_is_surveillant()
    or exists (
      select 1 from public.affectations a
      where a.id = creneaux.affectation_id
        and (spc_owns_surveillant(a.surveillant_id) or spc_owns_surveillant(a.remplacant_id))
    )
  );

drop policy if exists "spc insert creneaux" on public.creneaux;
create policy "spc insert creneaux" on public.creneaux for insert to authenticated
  with check (not spc_is_surveillant());
drop policy if exists "spc update creneaux" on public.creneaux;
create policy "spc update creneaux" on public.creneaux for update to authenticated
  using (not spc_is_surveillant()) with check (not spc_is_surveillant());
drop policy if exists "spc delete creneaux" on public.creneaux;
create policy "spc delete creneaux" on public.creneaux for delete to authenticated
  using (not spc_is_surveillant());


-- ── MIGRATION 31_unicite-salles-surveillants.sql ───────────────────────────────────────────
-- SPC Opérations — Migration v31 : unicité métier des salles et surveillants
--
-- Audit QA forensic V2, BUG-012 / BUG-013.
--
-- Constat : `missions.reference` et `devis.reference` sont `unique`, ce qui
-- bloque en base les doublons créés par un double clic. `salles` et
-- `surveillants` ne portaient AUCUNE contrainte : trois clics rapides sur
-- « Ajouter la salle » (3 requêtes POST mesurées) y créaient trois lignes.
--
-- Ces index sont créés en `if not exists` et tolèrent les données existantes :
-- ils ne s'appliquent qu'aux lignes dont la clé est renseignée.

-- Une salle porte un nom unique DANS son organisation. Les lignes historiques
-- sans org_id restent hors index (mode mono-organisation avant migration 11).
create unique index if not exists salles_org_nom_uniq
  on salles (org_id, lower(btrim(nom)))
  where org_id is not null and btrim(nom) <> '';

-- Un surveillant a une adresse e-mail unique dans son organisation. Le nom
-- n'est volontairement PAS contraint : deux homonymes sont légitimes, la
-- déduplication par nom reste applicative (avec avertissement).
create unique index if not exists surveillants_org_email_uniq
  on surveillants (org_id, lower(btrim(email)))
  where org_id is not null and email is not null and btrim(email) <> '';

-- Le téléphone, quand il est renseigné, identifie aussi une personne unique.
create unique index if not exists surveillants_org_tel_uniq
  on surveillants (org_id, regexp_replace(telephone, '\D', '', 'g'))
  where org_id is not null and telephone is not null
    and regexp_replace(telephone, '\D', '', 'g') <> '';
