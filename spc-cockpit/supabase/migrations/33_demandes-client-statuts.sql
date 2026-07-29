-- ============================================================================
-- SPC — Migration v33 : Demandes client (Lot A) — nomenclature de statuts
--
-- Passe à la nomenclature unique du processus complet (canal interne + client +
-- Excel). Renomme les anciens statuts du MVP interne vers la nouvelle échelle.
-- Additive, idempotente, non destructive (aucune ligne supprimée).
-- ============================================================================

-- Défaut aligné sur la nouvelle nomenclature.
alter table demandes_client alter column statut set default 'Brouillon interne';

-- Backfill des anciens libellés (P1) vers la nouvelle échelle. Ne touche que
-- les lignes portant l'ancien libellé — rejouable sans effet de bord.
update demandes_client set statut = 'Brouillon interne' where statut = 'Brouillon';
update demandes_client set statut = 'À vérifier SPC'    where statut = 'À vérifier';

-- ROLLBACK (manuel) :
--   alter table demandes_client alter column statut set default 'Brouillon';
