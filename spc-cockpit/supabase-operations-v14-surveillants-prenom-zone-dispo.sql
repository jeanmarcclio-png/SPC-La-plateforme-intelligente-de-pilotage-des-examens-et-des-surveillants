-- SPC Operations — v14
-- Champs structurés pour les surveillants : prénom, zone, disponibilités.
-- À exécuter dans Supabase (SQL Editor). Idempotent : sans effet si déjà appliqué.
-- Aucune donnée existante n'est modifiée ni supprimée ; `nom` reste le nom complet.

alter table public.surveillants
  add column if not exists prenom      text,
  add column if not exists zone        text,
  add column if not exists dispo_matin text,
  add column if not exists dispo_apm   text;

comment on column public.surveillants.prenom      is 'Prénom structuré (le nom complet reste dans « nom »)';
comment on column public.surveillants.zone        is 'Zone / secteur d''intervention';
comment on column public.surveillants.dispo_matin is 'Disponibilité matin (texte libre : horaires ou Oui/Non)';
comment on column public.surveillants.dispo_apm   is 'Disponibilité après-midi (texte libre)';
