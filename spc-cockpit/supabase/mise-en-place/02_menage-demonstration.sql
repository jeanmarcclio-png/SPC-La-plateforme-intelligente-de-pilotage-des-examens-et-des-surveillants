-- SPC — Retrait du jeu de démonstration.
--
-- USAGE
--   psql "$URL" -f 02_menage-demonstration.sql            -- constat seul
--   psql "$URL" -v confirme=oui -f 02_menage-demonstration.sql   -- supprime
--
-- SANS `-v confirme=oui`, CE SCRIPT NE SUPPRIME RIEN : il montre ce qu'il
-- supprimerait. C'est le mode par défaut, à dessein — une suppression de
-- données ne doit jamais être le résultat d'une commande lancée de travers.
--
--
-- CE QU'IL RETIRE, ET POURQUOI IL FAUT LE FAIRE
-- --------------------------------------------
-- Une instance neuve n'est pas vide. Les migrations sèment un jeu de
-- démonstration complet — 5 salles, 5 missions, 8 surveillants, 3 devis,
-- 8 affectations — rattaché aux organisations de démonstration de la
-- migration 11.
--
-- Ces lignes sont INVISIBLES pour votre administrateur, qui n'est pas membre de
-- ces organisations : la RLS les masque. Elles ne peuvent donc pas être
-- supprimées depuis l'application. Elles restent en base, comptent dans les
-- volumétries, et sortiront dans tout export administrateur.
--
--
-- L'ORDRE DE SUPPRESSION N'EST PAS DÉCORATIF
-- ------------------------------------------
-- `affectations.salle_id` porte une contrainte `on delete restrict` (migration
-- 32, correctif BUG-004) : c'est elle qui garantit qu'une salle référencée au
-- planning ne peut pas disparaître. Un `delete from salles` direct échoue donc
-- avec `affectations_salle_id_fkey`. Les enfants partent d'abord.
--
-- Le refus de la base est ici une bonne nouvelle : il prouve que l'intégrité
-- référentielle tient. Ce script travaille avec elle, il ne la contourne pas —
-- ni `cascade`, ni désactivation de contrainte.

\set ON_ERROR_STOP on

-- psql n'interpole pas ses variables dans un bloc `$$ … $$` : le drapeau passe
-- par un réglage de session. `:confirme` peut être indéfini — d'où le
-- `\if :{?confirme}` qui teste son existence avant de la lire.
\if :{?confirme}
  select set_config('spc.confirme', :'confirme', false);
\else
  select set_config('spc.confirme', 'non', false);
\endif

-- ---------------------------------------------------------------------------
-- 1. Ce qui serait supprimé.
-- ---------------------------------------------------------------------------
select 'À SUPPRIMER' as bloc, libelle, nombre from (
  select 1 as o, 'organisations de démonstration' as libelle,
         (select count(*) from organizations where nom ilike '%demo%' or nom ilike '%démo%') as nombre
  union all select 2, 'salles',       (select count(*) from salles s join organizations o on o.id=s.org_id where o.nom ilike '%demo%' or o.nom ilike '%démo%')
  union all select 3, 'missions',     (select count(*) from missions m join organizations o on o.id=m.org_id where o.nom ilike '%demo%' or o.nom ilike '%démo%')
  union all select 4, 'surveillants', (select count(*) from surveillants v join organizations o on o.id=v.org_id where o.nom ilike '%demo%' or o.nom ilike '%démo%')
  union all select 5, 'devis',        (select count(*) from devis d join organizations o on o.id=d.org_id where o.nom ilike '%demo%' or o.nom ilike '%démo%')
) x order by o;

-- ---------------------------------------------------------------------------
-- 2. La suppression, sous confirmation explicite.
-- ---------------------------------------------------------------------------
do $$
declare
  v_demo uuid[];
  t text;
  -- Ordre des ENFANTS vers les PARENTS. `creneaux` et `affectations` d'abord :
  -- ce sont eux qui retiennent les salles et les missions.
  ordre text[] := array[
    'creneaux','affectations',
    'devis_lignes','devis_salles','devis_equipe','devis',
    'amenagements','factures','incidents','journal_sessions',
    'missions','salles','surveillants'
  ];
  n bigint; total bigint := 0;
begin
  if lower(coalesce(current_setting('spc.confirme', true), 'non')) <> 'oui' then
    raise notice E'\n>>> CONSTAT SEUL — rien n''a été supprimé.\n'
                  '>>> Pour supprimer réellement :\n'
                  '>>>   psql "$URL" -v confirme=oui -f 02_menage-demonstration.sql';
    return;
  end if;

  select array_agg(id) into v_demo from organizations
   where nom ilike '%demo%' or nom ilike '%démo%';

  if v_demo is null then
    raise notice '>>> Aucune organisation de démonstration : rien à faire.';
    return;
  end if;

  -- GARDE : refuser si une organisation de démonstration porte un MEMBRE.
  -- Un membre signifie que quelqu'un s'en sert vraiment — le nom « démo » ne
  -- suffit alors plus à décider que les données sont jetables.
  if exists (select 1 from organization_members where org_id = any(v_demo)) then
    raise exception E'Une organisation de démonstration a des membres.\n'
      '  Ce script refuse de supprimer des données dont quelqu''un est membre.\n'
      '  Retirer d''abord les membres, ou renommer l''organisation si elle sert.';
  end if;

  -- PLUSIEURS PASSES, plutôt qu'un ordre écrit à la main.
  --
  -- L'ordre codé en dur est fragile : il a déjà été faux deux fois. D'abord
  -- `salles` avant `affectations` (retenu par `affectations_salle_id_fkey`),
  -- puis `devis` avant `factures` (retenu par `factures_devis_id_fkey`). Chaque
  -- table ajoutée au schéma peut réintroduire le problème, et il ne se voit
  -- qu'en production.
  --
  -- On tente donc chaque table ; celles qu'une clé étrangère retient sont
  -- reportées à la passe suivante, une fois leurs enfants partis. Le tableau
  -- `ordre` ci-dessus reste utile — il donne un bon ordre de départ et limite le
  -- nombre de passes — mais il n'a plus à être exact.
  --
  -- Chaque tentative est isolée dans un sous-bloc : c'est ce qui pose un point
  -- de reprise et permet de rattraper l'échec sans perdre la transaction.
  declare
    restantes text[] := ordre;
    echouees  text[];
    passe     int := 0;
  begin
    while array_length(restantes, 1) > 0 and passe < 10 loop
      passe := passe + 1;
      echouees := array[]::text[];

      foreach t in array restantes loop
        if to_regclass('public.' || t) is null
           or not exists (select 1 from information_schema.columns
                           where table_schema = 'public' and table_name = t and column_name = 'org_id') then
          continue;
        end if;
        begin
          execute format('delete from %I where org_id = any($1)', t) using v_demo;
          get diagnostics n = row_count;
          total := total + n;
          if n > 0 then raise notice '  % : % ligne(s)', t, n; end if;
        exception when foreign_key_violation then
          echouees := echouees || t;
        end;
      end loop;

      -- Aucune table débloquée pendant toute une passe : insister ne servirait
      -- à rien, la dépendance vient d'ailleurs que du jeu de démonstration.
      if array_length(echouees, 1) = array_length(restantes, 1) then
        raise exception E'Blocage sur : %.\n'
          '  Ces tables sont retenues par une clé étrangère depuis des lignes qui\n'
          '  ne sont PAS dans une organisation de démonstration. Autrement dit, de\n'
          '  vraies données pointent vers ce jeu de démonstration : ce script ne\n'
          '  supprime rien dans ce cas.', array_to_string(echouees, ', ');
      end if;

      restantes := echouees;
    end loop;
  end;

  delete from organizations where id = any(v_demo);
  get diagnostics n = row_count;
  raise notice E'\n>>> % ligne(s) métier et % organisation(s) supprimées.', total, n;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Constat final.
-- ---------------------------------------------------------------------------
select 'APRÈS' as bloc, libelle, observe from (
  select 1 as o, 'organisations de démonstration restantes' as libelle,
         coalesce((select string_agg(nom, ' · ') from organizations
                    where nom ilike '%demo%' or nom ilike '%démo%'), '(aucune)') as observe
  union all
  select 2, 'organisations en service',
         coalesce((select string_agg(o.nom || ' — ' ||
                    (select count(*) from organization_members m where m.org_id = o.id)::text || ' membre(s)',
                    ' · ' order by o.nom) from organizations o), '(aucune)')
  union all
  select 3, 'lignes métier restantes',
         (select count(*) from salles)::text || ' salle(s) · '
      || (select count(*) from missions)::text || ' mission(s) · '
      || (select count(*) from surveillants)::text || ' surveillant(s)'
) x order by o;
