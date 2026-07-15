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
create policy "profile self select" on profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profile self insert" on profiles;
create policy "profile self insert" on profiles for insert to authenticated
  with check (id = auth.uid());

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
