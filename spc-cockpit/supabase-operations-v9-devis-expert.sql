-- SPC Opérations — Migration v9 : devis expert
-- Équipe & volume horaire, lignes financières, lien facture↔devis
-- À exécuter dans Supabase > SQL Editor (après la v8)

alter table devis add column if not exists frais_deplacement numeric(10,2) default 0;
alter table devis add column if not exists frais_coordination numeric(10,2) default 0;
alter table devis add column if not exists remise numeric(10,2) default 0;

alter table factures add column if not exists devis_id integer references devis(id);

update factures set devis_id = (select id from devis where reference = 'SPC-20260605-001')
where reference = 'FA-2026-003' and devis_id is null;
update factures set devis_id = (select id from devis where reference = 'SPC-20260514-001')
where reference = 'FA-2026-001' and devis_id is null;

-- Équipe & volume horaire par devis
create table if not exists devis_equipe (
  id serial primary key,
  devis_id integer references devis(id) on delete cascade,
  role text not null,
  effectif integer default 1,
  heures_pers numeric(6,2) default 0,   -- heures facturées par personne
  taux_h numeric(8,2) default 0,
  ordre integer default 1,
  created_at timestamptz default now()
);

create unique index if not exists devis_equipe_uniq on devis_equipe(devis_id, role);

alter table devis_equipe enable row level security;
drop policy if exists "Auth read devis_equipe"   on devis_equipe;
drop policy if exists "Auth insert devis_equipe" on devis_equipe;
drop policy if exists "Auth update devis_equipe" on devis_equipe;
drop policy if exists "Auth delete devis_equipe" on devis_equipe;
create policy "Auth read devis_equipe"   on devis_equipe for select to authenticated using (true);
create policy "Auth insert devis_equipe" on devis_equipe for insert to authenticated with check (true);
create policy "Auth update devis_equipe" on devis_equipe for update to authenticated using (true) with check (true);
create policy "Auth delete devis_equipe" on devis_equipe for delete to authenticated using (true);

-- Équipe ICP Reims — cohérente avec les lignes (262,3 h × 28 € = 7 344,40 € HT)
insert into devis_equipe (devis_id, role, effectif, heures_pers, taux_h, ordre)
select d.id, v.role, v.effectif, v.heures_pers, v.taux_h, v.ordre
from devis d
join (values
  ('SPC-20260605-001', 'Surveillant·e en salle — semaine du 15 au 19 juin', 5, 23.64, 28.00, 1),
  ('SPC-20260605-001', 'Surveillant·e en salle — semaine du 22 au 26 juin', 5, 28.82, 28.00, 2)
) as v(ref, role, effectif, heures_pers, taux_h, ordre) on v.ref = d.reference
on conflict (devis_id, role) do nothing;

-- Équipe Sciences Po — exactement 5 200 € HT (700 + 4 500), effectif 18
insert into devis_equipe (devis_id, role, effectif, heures_pers, taux_h, ordre)
select d.id, v.role, v.effectif, v.heures_pers, v.taux_h, v.ordre
from devis d
join (values
  ('SPC-20260514-001', 'Coordinateur·rice',      2, 10.00, 35.00, 1),
  ('SPC-20260514-001', 'Surveillant·e en salle', 16, 11.25, 25.00, 2)
) as v(ref, role, effectif, heures_pers, taux_h, ordre) on v.ref = d.reference
on conflict (devis_id, role) do nothing;
