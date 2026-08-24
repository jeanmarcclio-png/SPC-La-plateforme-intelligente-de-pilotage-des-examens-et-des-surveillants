-- SPC Opérations — Migration v31 : unicité métier des salles et surveillants
--
-- Audit QA forensic V2, BUG-012 / BUG-013.
--
-- Constat : `missions.reference` et `devis.reference` sont `unique`, ce qui
-- bloque en base les doublons créés par un double clic. `salles` et
-- `surveillants` ne portaient AUCUNE contrainte : trois clics rapides sur
-- « Ajouter la salle » (3 requêtes POST mesurées) y créaient trois lignes.
--
-- Ces index sont créés en `if not exists` et tolèrent les données existantes :
-- ils ne s'appliquent qu'aux lignes dont la clé est renseignée.

-- Une salle porte un nom unique DANS son organisation. Les lignes historiques
-- sans org_id restent hors index (mode mono-organisation avant migration 11).
create unique index if not exists salles_org_nom_uniq
  on salles (org_id, lower(btrim(nom)))
  where org_id is not null and btrim(nom) <> '';

-- Un surveillant a une adresse e-mail unique dans son organisation. Le nom
-- n'est volontairement PAS contraint : deux homonymes sont légitimes, la
-- déduplication par nom reste applicative (avec avertissement).
create unique index if not exists surveillants_org_email_uniq
  on surveillants (org_id, lower(btrim(email)))
  where org_id is not null and email is not null and btrim(email) <> '';

-- Le téléphone, quand il est renseigné, identifie aussi une personne unique.
create unique index if not exists surveillants_org_tel_uniq
  on surveillants (org_id, regexp_replace(telephone, '\D', '', 'g'))
  where org_id is not null and telephone is not null
    and regexp_replace(telephone, '\D', '', 'g') <> '';
