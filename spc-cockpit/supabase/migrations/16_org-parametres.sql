-- ============================================================================
-- SPC — Migration v16 : paramètres d'organisation (SaaS multi-tenant, phase 1)
--
-- Complète la table `organizations` (créée en v11) avec les champs attendus par
-- la spec SaaS : slug unique, taux horaire et coefficient net par organisation.
-- Additif et idempotent. Ne réécrit aucune donnée existante.
--
-- Valeurs par défaut alignées sur le moteur financier SPC :
--   taux_horaire    = 12.31  (€/h)
--   coefficient_net = 0.7824 (net / brut)
-- ============================================================================

alter table organizations
  add column if not exists slug            text,
  add column if not exists taux_horaire    numeric(6,2) default 12.31,
  add column if not exists coefficient_net numeric(6,4) default 0.7824;

-- Slug unique quand renseigné (les lignes legacy sans slug ne bloquent pas).
create unique index if not exists organizations_slug_key
  on organizations(slug) where slug is not null;

-- Renseigne un slug pour les organisations de démo existantes si absent
-- (slugify minimal : minuscules, tirets, sans accents).
update organizations
set slug = regexp_replace(
             regexp_replace(lower(translate(nom, 'àâäéèêëîïôöûüç', 'aaaeeeeiioouuc')), '[^a-z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g')
where slug is null;
