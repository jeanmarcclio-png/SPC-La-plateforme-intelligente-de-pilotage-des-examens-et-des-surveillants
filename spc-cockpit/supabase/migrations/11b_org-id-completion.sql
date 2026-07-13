-- SPC Operations — migration corrective 11b
--
-- CONTEXTE : la migration 12 (RLS strict) crée des policies scopées par
-- `org_id` sur affectations, amenagements, incidents, journal_sessions et
-- factures. Or la migration 11 (org-isolation) n'a ajouté `org_id` qu'à 7
-- tables (missions, devis, devis_lignes, devis_equipe, devis_salles, salles,
-- surveillants). Sans cette correction, la migration 12 échoue (« column
-- org_id does not exist ») — d'où le fonctionnement actuel en mode transition.
--
-- Cette migration NE RÉÉCRIT AUCUNE migration appliquée : elle complète, de
-- façon additive et idempotente, les colonnes `org_id` manquantes. À jouer
-- APRÈS 11_org-isolation et AVANT 12_rls-strict.
--
-- Non destructif : `org_id` reste NULLABLE. Voir docs/AUDIT_SUPABASE_RLS.md
-- pour la stratégie de backfill avant d'activer réellement l'isolation stricte.

alter table affectations     add column if not exists org_id uuid references organizations(id);
alter table amenagements     add column if not exists org_id uuid references organizations(id);
alter table incidents        add column if not exists org_id uuid references organizations(id);
alter table journal_sessions add column if not exists org_id uuid references organizations(id);
alter table factures         add column if not exists org_id uuid references organizations(id);
