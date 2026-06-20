-- SPC Cockpit — Schéma base de données
-- À exécuter dans Supabase > SQL Editor

-- Campagnes
create table if not exists campagnes (
  id text primary key,
  nom text not null,
  perimetre text,
  deadline text,
  jours_restants integer default 0,
  score numeric(4,1) default 0,
  statut text default 'En cours',
  nombre_prospects integer default 0,
  tres_chaudes integer default 0,
  created_at timestamptz default now()
);

-- Prospects
create table if not exists prospects (
  id text primary key,
  nom text not null,
  segment text,
  cluster text,
  score_bant numeric(4,1) default 0,
  niveau text,
  priorite text,
  vague integer default 1,
  interlocuteur text,
  canal text,
  statut text default 'Non contacté',
  action text,
  campagne_id text references campagnes(id),
  created_at timestamptz default now()
);

-- Livrables
create table if not exists livrables (
  id serial primary key,
  nom text not null,
  description text,
  statut text default 'À rédiger',
  fichier text,
  campagne_id text references campagnes(id),
  created_at timestamptz default now()
);

-- Alertes
create table if not exists alertes (
  id text primary key,
  type text not null,
  titre text not null,
  description text,
  count integer default 0,
  created_at timestamptz default now()
);

-- Echéances
create table if not exists echeances (
  id serial primary key,
  date text not null,
  nom text not null,
  tag text,
  urgent boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security (lecture pour utilisateurs authentifiés)
alter table campagnes enable row level security;
alter table prospects enable row level security;
alter table livrables enable row level security;
alter table alertes enable row level security;
alter table echeances enable row level security;

create policy "Auth users can read campagnes" on campagnes for select to authenticated using (true);
create policy "Auth users can read prospects" on prospects for select to authenticated using (true);
create policy "Auth users can read livrables" on livrables for select to authenticated using (true);
create policy "Auth users can read alertes" on alertes for select to authenticated using (true);
create policy "Auth users can read echeances" on echeances for select to authenticated using (true);

-- Données initiales
insert into campagnes values
  ('idf-2026', 'IDF Complète 2026', 'Paris · Île-de-France · Paris-Saclay', '30/06/2026', 8, 9.4, 'Actif', 43, 14, now()),
  ('national-2026', 'National Écoles 2026', 'Lyon · Lille · Bordeaux · Marseille · Nancy', '08/07/2026', 20, 9.2, 'En cours', 32, 23, now()),
  ('saclay-2026', 'Paris-Saclay Juin 2026', 'Cluster Paris-Saclay · 29 cibles', '15/06/2026', 0, 9.1, 'Terminé', 29, 12, now())
on conflict (id) do nothing;

insert into alertes values
  ('a1', 'rouge', 'Contacts manquants', '7 établissements sans interlocuteur nominatif identifié', 7, now()),
  ('a2', 'orange', 'Relances J+7 dues', '2 établissements sans réponse depuis la vague 1', 2, now()),
  ('a3', 'jaune', 'Analytics J+30 à prévoir', '3 campagnes en attente de rapport de performance', 3, now())
on conflict (id) do nothing;

insert into echeances (date, nom, tag, urgent) values
  ('24/06', 'Relances CPGE Lyon', 'J+7', false),
  ('26/06', 'Email IFSI CHU Bordeaux', 'J+3', false),
  ('30/06', 'Fin Vague 1 IDF', 'Deadline', true),
  ('01/09', 'Lancement Vague 2', 'National', false);
