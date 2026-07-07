-- SPC Opérations — Migration v11 : journal de session (Master Prompt §15.6)
-- Historique append-only : utilisateur, date/heure, objet, ancienne et
-- nouvelle valeur. Aucune policy UPDATE/DELETE : les entrées sont immuables
-- pour les utilisateurs ordinaires.
-- À exécuter dans Supabase > SQL Editor (après la v10)

create table if not exists journal_sessions (
  id serial primary key,
  mission_id integer references missions(id) on delete cascade,
  utilisateur text not null default 'inconnu',
  objet text not null,          -- ex : "Affectation — Fatima Benali"
  ancienne text,                -- valeur avant (null pour un ajout)
  nouvelle text,                -- valeur après (null pour une suppression)
  created_at timestamptz default now()
);

create index if not exists journal_sessions_mission_idx on journal_sessions(mission_id, created_at desc);

alter table journal_sessions enable row level security;
drop policy if exists "Auth read journal"   on journal_sessions;
drop policy if exists "Auth insert journal" on journal_sessions;
create policy "Auth read journal"   on journal_sessions for select to authenticated using (true);
create policy "Auth insert journal" on journal_sessions for insert to authenticated with check (true);
-- Volontairement AUCUNE policy update/delete : journal immuable.

-- Vérification
select count(*) as entrees_journal from journal_sessions;
