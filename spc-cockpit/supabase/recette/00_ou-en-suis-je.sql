-- SPC Opérations — RECETTE : où en est la base ?
--
-- Requête de DIAGNOSTIC, à jouer AVANT ou APRÈS n'importe quel lot. Elle ne
-- modifie rien et tient en quelques lignes : elle passe là où un gros script
-- échoue sur « Failed to fetch ».
--
-- Elle dit quel lot a réellement pris, pour reprendre au bon endroit.

select 'lot 1 — tables de base'        as etape,
       (select count(*) from information_schema.tables
         where table_schema = 'public'
           and table_name in ('surveillants','missions','affectations','devis','incidents','salles'))
         || ' / 6 tables' as observe
union all
select 'lot 2 — devis détaillé',
       (select count(*)::text from information_schema.tables
         where table_schema='public'
           and table_name in ('devis_lignes','devis_salles','devis_equipe','journal_sessions')) || ' / 4 tables'
union all
select 'lot 3 — multi-organisation',
       (select count(*)::text from information_schema.columns
         where table_schema='public' and table_name='missions' and column_name='org_id') || ' / 1 colonne org_id'
union all
select 'lot 4 — profils et sessions',
       (select count(*)::text from information_schema.tables
         where table_schema='public'
           and table_name in ('profiles','sessions','user_preferences','disponibilites')) || ' / 4 tables'
union all
select 'lot 5 — portail surveillant',
       (select count(*)::text from information_schema.routines
         where routine_schema='public' and routine_name like 'spc_%') || ' fonction(s) spc_*'
union all
select 'lot 6 — créneaux et unicité',
       (select count(*)::text from information_schema.tables
         where table_schema='public' and table_name='creneaux') || ' / 1 table creneaux · '
       || (select count(*)::text from pg_indexes
            where indexname in ('salles_org_nom_uniq','surveillants_org_email_uniq','surveillants_org_tel_uniq'))
       || ' / 3 index d''unicité'
union all
select 'lot 7 — intégrité salles ↔ planning',
       (select count(*)::text from information_schema.columns
         where table_schema='public' and table_name='affectations' and column_name='salle_id')
       || ' / 1 colonne salle_id · '
       || (select count(*)::text from information_schema.views
            where table_schema='public' and table_name='salles_non_rapprochees') || ' / 1 vue'
order by etape;
