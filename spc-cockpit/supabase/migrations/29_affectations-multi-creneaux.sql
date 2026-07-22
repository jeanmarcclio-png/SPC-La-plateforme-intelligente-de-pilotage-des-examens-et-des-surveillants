-- 29 · Multi-créneaux par demi-journée pour les affectations
--
-- Contexte : jusqu'ici chaque affectation portait UN créneau matin
-- (matin_debut/matin_fin) et UN créneau après-midi (apm_debut/apm_fin).
-- Le métier réel : un surveillant peut enchaîner plusieurs surveillances
-- sur une même demi-journée (ex. 08:00–09:30, 10:00–11:30, 12:00–13:30).
--
-- Approche non destructive : on conserve matin/matin_debut/matin_fin (et apm/…)
-- comme « 1er créneau » — tous les consommateurs existants (agents IA, portail
-- surveillant, journal, moteur) continuent de fonctionner sans changement. On
-- ajoute deux colonnes jsonb qui portent la LISTE COMPLÈTE des créneaux de la
-- demi-journée (chaque élément = {"debut":"HH:MM","fin":"HH:MM"}), source de
-- vérité pour la planification (total heures, timeline, détection de conflits).

alter table public.affectations
  add column if not exists matin_creneaux jsonb,
  add column if not exists apm_creneaux jsonb;

comment on column public.affectations.matin_creneaux is
  'Liste des créneaux du matin [{debut,fin}]. NULL = retomber sur matin_debut/matin_fin (1er créneau).';
comment on column public.affectations.apm_creneaux is
  'Liste des créneaux de l''après-midi [{debut,fin}]. NULL = retomber sur apm_debut/apm_fin (1er créneau).';
