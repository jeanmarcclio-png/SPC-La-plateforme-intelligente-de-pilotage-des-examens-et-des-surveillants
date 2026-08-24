-- SPC Opérations — Contrôles de recette (audit QA forensic V2)
--
-- À jouer après `00_jeu-audit.sql`, dans le SQL Editor d'une instance de RECETTE.
-- Retourne UN TABLEAU : un contrôle par ligne, avec l'attendu, l'observé et le
-- verdict. Aucun contrôle ne modifie de donnée.
--
-- ⚠️ Ce fichier couvre ce qui est vérifiable EN SQL. Les contrôles qui passent
-- par l'application (refus de suppression, transitions, messages métier) sont
-- listés dans `tests/RECETTE-SUPABASE.md` et se rejouent à l'écran.

with controles as (

  -- M-2 : la migration 32 a bien créé la clé étrangère.
  select 'M-2  affectations.salle_id existe' as controle,
         'colonne présente' as attendu,
         coalesce((select 'présente' from information_schema.columns
                    where table_name = 'affectations' and column_name = 'salle_id' limit 1),
                  'ABSENTE') as observe

  union all
  -- M-2b : la contrainte est bien en RESTRICT (et non en CASCADE ou SET NULL).
  select 'M-2b contrainte on delete RESTRICT',
         'NO ACTION ou RESTRICT',
         coalesce((select rc.delete_rule
                     from information_schema.referential_constraints rc
                     join information_schema.key_column_usage k
                       on k.constraint_name = rc.constraint_name
                    where k.table_name = 'affectations' and k.column_name = 'salle_id'
                    limit 1), 'AUCUNE CONTRAINTE')

  union all
  -- M-3 : les salles du planning sans contrepartie au référentiel.
  select 'M-3  salles non rapprochées',
         '0 une fois les alias arbitrés',
         (select count(*)::text from salles_non_rapprochees)

  union all
  -- M-3b : le détail, pour savoir QUOI arbitrer.
  select 'M-3b noms restés hors référentiel',
         'liste à arbitrer (AMP ↔ AMPHI ?)',
         coalesce((select string_agg(nom_au_planning, ', ' order by nom_au_planning)
                     from salles_non_rapprochees), '—')

  union all
  -- D-2/D-3/D-4 : les index d'unicité sont bien en place.
  --
  -- ATTENTION AUX NOMS D'INDEX. Deux d'entre eux ont été REMPLACÉS après les
  -- échecs de sonde de la recette : la migration 33 substitue
  -- `surveillants_org_tel_cle_uniq` à `surveillants_org_tel_uniq` (D-4b), et la
  -- 34 substitue `salles_org_cle_uniq` à `salles_org_nom_uniq` (D-2b). Chercher
  -- l'ancien nom afficherait « ABSENT » sur une base pourtant correctement
  -- migrée — un faux rouge. On accepte donc l'un OU l'autre, et on publie
  -- lequel est en place : c'est ce qui distingue une base à jour d'une base
  -- restée sur l'index faible.
  select 'D-2  index unicité salles (org, nom normalisé)',
         'salles_org_cle_uniq (v34)',
         coalesce((select indexname from pg_indexes
                    where indexname in ('salles_org_cle_uniq', 'salles_org_nom_uniq')
                    order by indexname limit 1), 'ABSENT')

  union all
  select 'D-3  index unicité surveillants (org, e-mail)',
         'présent',
         coalesce((select 'présent' from pg_indexes where indexname = 'surveillants_org_email_uniq' limit 1), 'ABSENT')

  union all
  select 'D-4  index unicité surveillants (org, téléphone normalisé)',
         'surveillants_org_tel_cle_uniq (v33)',
         coalesce((select indexname from pg_indexes
                    where indexname in ('surveillants_org_tel_cle_uniq', 'surveillants_org_tel_uniq')
                    order by indexname limit 1), 'ABSENT')

  union all
  -- D-1b : PORTÉE RÉELLE des index de la migration 31.
  --
  -- Ces index sont PARTIELS : `where org_id is not null`. Sur une base sans
  -- organisation — le cas d'une recette montée à vide — ils existent mais ne
  -- contraignent aucune ligne. Sans ce contrôle, D-2/D-3/D-4 affichent
  -- « présent » et M-1/M-1b affichent « 0 doublon » : quatre lignes vertes qui
  -- ne prouvent rien. Le périmètre est donc publié explicitement.
  select 'D-1b périmètre couvert par les index partiels',
         'périmètre non vide',
         (select count(*)::text from salles       where org_id is not null) || ' salle(s) · '
      || (select count(*)::text from surveillants where org_id is not null) || ' surveillant(s)'

  union all
  -- M-1 : les index d'unicité ne peuvent PAS être créés sur une base contenant
  -- déjà des doublons. On compte ce qui bloquerait — ET le nombre de fiches
  -- réellement examinées, sans quoi « 0 » est une vérité vide.
  select 'M-1  doublons de salles restants',
         '0 doublon, sur un périmètre non vide',
         (select count(*)::text from (
            select org_id, lower(btrim(nom)) from salles
             where org_id is not null and btrim(nom) <> ''
             group by 1, 2 having count(*) > 1) x)
         || ' doublon(s) · '
         || (select count(*)::text from salles
              where org_id is not null and btrim(nom) <> '') || ' fiche(s) examinée(s)'

  union all
  select 'M-1b doublons d''e-mail surveillant restants',
         '0 doublon, sur un périmètre non vide',
         (select count(*)::text from (
            select org_id, lower(btrim(email)) from surveillants
             where org_id is not null and email is not null and btrim(email) <> ''
             group by 1, 2 having count(*) > 1) x)
         || ' doublon(s) · '
         || (select count(*)::text from surveillants
              where org_id is not null and email is not null and btrim(email) <> '') || ' fiche(s) examinée(s)'

  union all
  -- Cohérence du jeu de recette : la sous-dotation que le moteur doit refuser.
  select 'V-1  couverture de la session de recette',
         '10 / 14 → validation refusée',
         (select count(distinct a.surveillant_id) || ' / ' || max(m.nb_surveillants)
            from missions m join affectations a on a.mission_id = m.id
           where m.reference = 'RECETTE-EX-001')

  union all
  select 'I-1  affectations sans salle',
         '2 (jeu de recette)',
         (select count(*)::text from affectations a
             join missions m on m.id = a.mission_id
            where m.reference = 'RECETTE-EX-001'
              and (a.salle is null or btrim(a.salle) = ''))

  union all
  -- I-3 : une salle orpheline doit exister, sinon le contrôle « suppression
  -- autorisée » n'a rien à tester.
  select 'I-3  salle orpheline disponible',
         'au moins 1',
         (select count(*)::text from salles s
           where s.nom like 'RECETTE %'
             and not exists (select 1 from affectations a
                              where regexp_replace(lower(coalesce(a.salle, '')), '[^a-z0-9]', '', 'g')
                                  = regexp_replace(lower(s.nom), '[^a-z0-9]', '', 'g')))

  union all
  -- BUG-016 : l'écart entre la grille et les heures facturées, recalculé en SQL.
  select 'BUG-016 heures facturables de la grille (1 jour)',
         '23,33 h',
         (select round(sum(extract(epoch from (ds.fin::time - ds.debut::time)) / 3600 * ds.surveillants)::numeric, 2)::text
            from devis_salles ds join devis d on d.id = ds.devis_id
           where d.reference = 'RECETTE-DEVIS-001')

  union all
  select 'BUG-016 heures facturées (équipe chiffrée)',
         '262,30 h',
         (select round(sum(de.effectif * de.heures_pers)::numeric, 2)::text
            from devis_equipe de join devis d on d.id = de.devis_id
           where d.reference = 'RECETTE-DEVIS-001')

  union all
  select 'BUG-016 effectifs annoncé / équipe / simultané matin',
         '6 / 10 / 4 → incohérence signalée',
         (select d.nb_surveillants::text || ' / '
               || coalesce((select sum(effectif)::text from devis_equipe where devis_id = d.id), '0') || ' / '
               || coalesce((select sum(surveillants)::text from devis_salles
                             where devis_id = d.id and session = 'matin'), '0')
            from devis d where d.reference = 'RECETTE-DEVIS-001')
)
select controle,
       attendu,
       observe,
       case
         when observe in ('ABSENTE', 'ABSENT', 'AUCUNE CONTRAINTE') then '❌ ÉCHEC'
         -- Périmètre vide AVANT tout jugement sur les doublons : un « 0 doublon »
         -- calculé sur 0 fiche ne dit rien de la base, seulement du jeu d'essai.
         when observe like '%· 0 fiche(s) examinée(s)'               then '🔍 NON VÉRIFIÉ — 0 fiche examinée, ce zéro ne prouve rien'
         when controle like 'D-1b%' and observe like '0 salle(s)%'   then '🔍 NON VÉRIFIÉ — aucune organisation : index partiels non sollicités'
         when controle like 'M-1%'  and observe not like '0 doublon%' then '🔴 BLOQUANT — dédoublonner avant migration 31'
         when controle like 'M-3  %' and observe <> '0'              then '⚠️ à arbitrer'
         else '🔍 à confronter à l''attendu'
       end as verdict
  from controles
 order by controle;
