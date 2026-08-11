-- user_preferences (notifications)
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value boolean not null default false,
  created_at timestamptz default now(),
  unique(user_id, key)
);
alter table user_preferences enable row level security;
create policy "user own prefs" on user_preferences for all using (auth.uid() = user_id);

-- team_members
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nom text not null,
  role text not null default 'Commercial',
  created_at timestamptz default now()
);
alter table team_members enable row level security;
create policy "authenticated read team" on team_members for select using (auth.role() = 'authenticated');
create policy "authenticated write team" on team_members for all using (auth.role() = 'authenticated');

-- email_logs
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  prospect_id text not null,
  type text not null,
  subject text not null,
  sent_at timestamptz not null,
  status text not null default 'sent',
  created_at timestamptz default now()
);
alter table email_logs enable row level security;
create policy "authenticated read logs" on email_logs for select using (auth.role() = 'authenticated');
create policy "authenticated write logs" on email_logs for insert using (auth.role() = 'authenticated');

-- Colonne email dans `prospects` — RÉELLEMENT optionnelle.
--
-- `prospects` appartient à la lignée COMMERCIALE (supabase/commercial/schema.sql),
-- séparée du cockpit examens : elle n'existe pas sur une base Opérations seule.
-- `add column if not exists` ne protège que contre une COLONNE déjà présente,
-- jamais contre une TABLE absente — la migration échouait donc sur
-- « relation "prospects" does not exist », alors que son propre commentaire
-- l'annonce comme optionnelle.
do $$
begin
  if to_regclass('public.prospects') is not null then
    alter table prospects add column if not exists email text;
  end if;
end $$;
