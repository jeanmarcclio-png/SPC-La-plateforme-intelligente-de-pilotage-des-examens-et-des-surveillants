-- SPC Opérations — Migration v7 : lignes de prestation des devis
-- Permet d'afficher le devis en intégralité (détail + impression PDF)
-- À exécuter dans Supabase > SQL Editor (après le script consolidé)

create table if not exists devis_lignes (
  id serial primary key,
  devis_id integer references devis(id) on delete cascade,
  designation text not null,
  quantite numeric(8,2) default 1,
  unite text default 'forfait',
  prix_unitaire numeric(10,2) default 0,
  ordre integer default 1,
  created_at timestamptz default now()
);

create unique index if not exists devis_lignes_uniq on devis_lignes(devis_id, ordre);

alter table devis_lignes enable row level security;
drop policy if exists "Auth read devis_lignes"   on devis_lignes;
drop policy if exists "Auth insert devis_lignes" on devis_lignes;
drop policy if exists "Auth update devis_lignes" on devis_lignes;
drop policy if exists "Auth delete devis_lignes" on devis_lignes;
create policy "Auth read devis_lignes"   on devis_lignes for select to authenticated using (true);
create policy "Auth insert devis_lignes" on devis_lignes for insert to authenticated with check (true);
create policy "Auth update devis_lignes" on devis_lignes for update to authenticated using (true) with check (true);
create policy "Auth delete devis_lignes" on devis_lignes for delete to authenticated using (true);

-- Correction de cohérence : montants ICP Reims alignés sur le détail des lignes
-- (262,3 h × 28 € = 7 344,40 € HT · 8 813,28 € TTC)
update devis    set montant_ht = 7344.40, montant_ttc = 8813.28 where reference = 'SPC-20260605-001';
update factures set montant_ht = 7344.40, montant_ttc = 8813.28 where reference = 'FA-2026-003';

-- Lignes de prestation
insert into devis_lignes (devis_id, designation, quantite, unite, prix_unitaire, ordre)
select d.id, v.designation, v.quantite, v.unite, v.prix_unitaire, v.ordre
from devis d
join (values
  ('SPC-20260605-001', 'Surveillance rattrapages — semaine du 15 au 19 juin 2026 (35 créneaux, salles B11 TT/B13/B21/B22/B23)', 118.20, 'h', 28.00, 1),
  ('SPC-20260605-001', 'Surveillance rattrapages — semaine du 22 au 26 juin 2026 (39 créneaux, salles B11 TT/B12/B13/B21/B22/B23)', 144.10, 'h', 28.00, 2),
  ('SPC-20260514-001', 'Surveillance concours écrit 2026 — 8 salles · 18 surveillants · coordination incluse', 200.00, 'h', 26.00, 1),
  ('SPC-20260524-001', 'Surveillance session principale mai 2026 — 6 salles · 14 surveillants', 1.00, 'forfait', 4042.00, 1),
  ('SPC-20260528-001', 'Surveillance rattrapages juin 2026 — 4 salles · 8 surveillants', 1.00, 'forfait', 2600.00, 1)
) as v(ref, designation, quantite, unite, prix_unitaire, ordre) on v.ref = d.reference
on conflict (devis_id, ordre) do nothing;
