-- ============================================================================
-- SPC — Migration v34 : Demandes client (Lot B) — pièces jointes
--
-- Stockage sécurisé des documents d'une demande (convocations, plan de salles,
-- consignes). Bucket PRIVÉ, chemins préfixés par org_id, RLS stricte, accès
-- par URL signée à durée courte côté application. Additive et idempotente.
-- ============================================================================

-- 1) Métadonnées des pièces (le binaire vit dans Storage) --------------------
create table if not exists demandes_client_pieces (
  id          bigint generated always as identity primary key,
  org_id      uuid references organizations(id),
  demande_id  bigint not null references demandes_client(id) on delete cascade,
  nom         text not null,        -- nom d'affichage (original)
  chemin      text not null,        -- chemin dans le bucket : {org}/{demande}/{fichier}
  taille      integer not null default 0,
  type_mime   text,
  created_at  timestamptz not null default now(),
  created_by  uuid
);

create index if not exists dc_pieces_org_idx     on demandes_client_pieces(org_id);
create index if not exists dc_pieces_demande_idx on demandes_client_pieces(demande_id);

-- org_id par défaut (cohérent v28/v31)
do $$
declare v_org uuid;
begin
  select o.id into v_org from organizations o
  order by (o.nom ilike '%demo%' or o.nom ilike '%démo%'),
           (select count(*) from organization_members m where m.org_id = o.id) desc, o.created_at desc
  limit 1;
  if v_org is not null then
    execute format('alter table demandes_client_pieces alter column org_id set default %L', v_org);
  end if;
end $$;

-- RLS métadonnées : select = membre ; insert/delete = planificateur+ ----------
do $$
begin
  execute 'alter table demandes_client_pieces enable row level security';
  execute 'drop policy if exists "dcp select" on demandes_client_pieces';
  execute $f$create policy "dcp select" on demandes_client_pieces for select to authenticated
             using (org_id is null or spc_member_of(org_id))$f$;
  execute 'drop policy if exists "dcp insert" on demandes_client_pieces';
  execute $f$create policy "dcp insert" on demandes_client_pieces for insert to authenticated
             with check (org_id is null or spc_has_role(org_id, 1))$f$;
  execute 'drop policy if exists "dcp delete" on demandes_client_pieces';
  execute $f$create policy "dcp delete" on demandes_client_pieces for delete to authenticated
             using (org_id is null or spc_has_role(org_id, 1))$f$;
end $$;

-- 2) Bucket Storage privé ----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('demandes-pieces', 'demandes-pieces', false)
on conflict (id) do nothing;

-- RLS Storage : accès limité aux objets dont le 1er dossier = org du membre.
-- Convention de chemin : {org_id}/{demande_id}/{timestamp}-{fichier}
do $$
begin
  execute 'drop policy if exists "dc pieces read"   on storage.objects';
  execute $f$create policy "dc pieces read" on storage.objects for select to authenticated
             using (bucket_id = 'demandes-pieces'
                    and spc_member_of(((storage.foldername(name))[1])::uuid))$f$;

  execute 'drop policy if exists "dc pieces insert" on storage.objects';
  execute $f$create policy "dc pieces insert" on storage.objects for insert to authenticated
             with check (bucket_id = 'demandes-pieces'
                    and spc_has_role(((storage.foldername(name))[1])::uuid, 1))$f$;

  execute 'drop policy if exists "dc pieces delete" on storage.objects';
  execute $f$create policy "dc pieces delete" on storage.objects for delete to authenticated
             using (bucket_id = 'demandes-pieces'
                    and spc_has_role(((storage.foldername(name))[1])::uuid, 1))$f$;
end $$;

-- ROLLBACK (manuel) :
--   drop table if exists demandes_client_pieces;
--   delete from storage.buckets where id = 'demandes-pieces';
