-- 31 · Suivi commercial des devis (cockpit /operations/devis)
--
-- Le cockpit commercial doit répondre à trois questions sans inventer de
-- chiffre : quand ce devis a-t-il bougé pour la dernière fois, depuis combien
-- de temps attend-il une réponse, et l'équipe l'a-t-elle épinglé ?
--
--   · updated_at        — dernière modification, quelle qu'elle soit
--   · statut_change_at  — dernier CHANGEMENT DE STATUT (envoi, acceptation…)
--   · prioritaire       — épingle manuelle (« Marquer comme prioritaire »)
--
-- Les deux horodatages sont maintenus par trigger : aucune écriture applicative,
-- donc aucune régression si le code tourne avant que la migration soit passée
-- (les colonnes sont simplement absentes et le suivi retombe sur created_at).
--
-- Backfill : statut_change_at = created_at pour l'existant. C'est la seule date
-- connue — les libellés de l'interface disent alors « Créé le … », jamais
-- « Accepté le … » sur une date qu'on n'a pas.

alter table public.devis add column if not exists updated_at       timestamptz not null default now();
alter table public.devis add column if not exists statut_change_at timestamptz;
alter table public.devis add column if not exists prioritaire      boolean not null default false;

update public.devis set statut_change_at = created_at where statut_change_at is null;

create index if not exists devis_statut_change_idx on public.devis(statut_change_at desc);
create index if not exists devis_prioritaire_idx   on public.devis(prioritaire) where prioritaire;

-- Trigger : horodate toute modification, et le changement de statut à part.
create or replace function public.devis_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.statut_change_at := coalesce(new.statut_change_at, now());
  elsif new.statut is distinct from old.statut then
    new.statut_change_at := now();
  else
    -- Modification sans changement de statut : on conserve l'horodatage
    -- existant (une correction explicite reste possible).
    new.statut_change_at := coalesce(new.statut_change_at, old.statut_change_at);
  end if;
  return new;
end;
$$;

drop trigger if exists devis_touch_trg on public.devis;
create trigger devis_touch_trg
  before insert or update on public.devis
  for each row execute function public.devis_touch();

-- Jeu de démonstration : aligne le suivi des devis semés (migrations 01 et 06)
-- sur leur réalité commerciale, pour que le cockpit ne soit pas plat au premier
-- lancement. Sans effet si les références n'existent pas.
update public.devis set statut_change_at = timestamptz '2026-05-25 09:40:00+02' where reference = 'SPC-20260514-001' and statut = 'Accepté';
update public.devis set statut_change_at = timestamptz '2026-06-20 14:05:00+02' where reference = 'SPC-20260605-001' and statut = 'Accepté';
update public.devis set statut_change_at = timestamptz '2026-05-28 16:45:00+02' where reference = 'SPC-20260528-001' and statut = 'Envoyé';
