-- SPC Opérations — Migration v4 : salles d'examen
-- À exécuter dans Supabase > SQL Editor (après supabase-operations-v3.sql)

create table if not exists salles (
  id serial primary key,
  nom text not null,
  batiment text,
  etage text,
  capacite integer default 0,
  etudiants integer default 0,
  nb_surveillants integer default 0,
  pmr boolean default false,
  tiers_temps boolean default false,
  created_at timestamptz default now()
);

alter table salles enable row level security;

create policy "Auth read salles"   on salles for select to authenticated using (true);
create policy "Auth insert salles" on salles for insert to authenticated with check (true);
create policy "Auth update salles" on salles for update to authenticated using (true) with check (true);
create policy "Auth delete salles" on salles for delete to authenticated using (true);

insert into salles (nom, batiment, etage, capacite, etudiants, nb_surveillants, pmr, tiers_temps) values
  ('Salle A21',          'Bâtiment A', '2e étage', 80,  75,  2, false, false),
  ('Salle A22',          'Bâtiment A', '2e étage', 80,  72,  2, false, false),
  ('Salle E31',          'Bâtiment E', '3e étage', 30,  8,   2, true,  true),
  ('Grand Amphithéâtre', 'Bâtiment C', 'RDC',      300, 280, 8, false, false),
  ('Salle B11',          'Bâtiment B', '1er étage', 50, 44,  2, false, true)
on conflict do nothing;
