-- Sprint 4 : CRM léger — notes sur les prospects + seed données

-- Ajouter colonne notes sur prospects
alter table prospects add column if not exists notes text;

-- Ajouter RLS pour écriture (update) sur prospects
create policy "Auth users can update prospects" on prospects for update to authenticated using (true);

-- Seed prospects (Top 10 Vague 1)
insert into prospects (id, nom, segment, cluster, score_bant, niveau, priorite, vague, interlocuteur, canal, statut, action, campagne_id) values
  ('1', 'EM Lyon',         'Commerce', 'Lyon/RA',      10,   'Très chaud', 'A', 1, 'Resp. examens / Dir. opér. acad.',    'Appel + Email',   'Non contacté', 'Appel sortant →',  'idf-2026'),
  ('2', 'IFSI CHU Lyon',   'Santé',    'Lyon/RA',      10,   'Très chaud', 'A', 1, 'Dir. institut / Coord. examens',      'Email + Appel',   'Non contacté', 'Email J+1 →',      'idf-2026'),
  ('3', 'IFSI CHU Lille',  'Santé',    'Lille/HdF',    10,   'Très chaud', 'A', 1, 'Dir. institut / Coord. examens',      'Email + Appel',   'En cours',     'Relance J+3 →',    'national-2026'),
  ('4', 'Kedge Bordeaux',  'Commerce', 'Bordeaux/NA',  10,   'Très chaud', 'A', 1, 'Dir. campus / Resp. examens',         'Email réseau',    'Non contacté', 'Email réseau →',   'national-2026'),
  ('5', 'Skema Lille',     'Commerce', 'Lille/HdF',    10,   'Très chaud', 'A', 1, 'Resp. examens / Dir. opér.',          'Appel + Email',   'Non contacté', 'Appel sortant →',  'national-2026'),
  ('6', 'IFSI CHU Bordeaux','Santé',   'Bordeaux/NA',  10,   'Très chaud', 'A', 1, 'Dir. institut / Resp. péda.',         'Email + Appel',   'Non contacté', 'Email J+1 →',      'national-2026'),
  ('7', 'ICN Nancy',       'Commerce', 'Nancy/GE',     10,   'Très chaud', 'A', 1, 'Resp. examens / Resp. concours',      'Appel + Email',   'Non contacté', 'Appel sortant →',  'national-2026'),
  ('8', 'Grenoble EM',     'Commerce', 'Lyon/RA',      10,   'Très chaud', 'A', 1, 'Coord. examens / Resp. concours',     'Appel + Email',   'RDV fixé',     'Confirmer →',      'idf-2026'),
  ('9', 'CPGE Lyon',       'CPGE',     'Lyon/RA',      9.5,  'Très chaud', 'A', 1, 'Dir. études prépa / Chef travaux',    'Email dir. études','Non contacté','Email J+2 →',      'idf-2026'),
  ('10','CPGE Lille',      'CPGE',     'Lille/HdF',    9.5,  'Très chaud', 'A', 1, 'Dir. études prépa / Chef travaux',    'Email dir. études','Non contacté','Email J+2 →',      'national-2026')
on conflict (id) do nothing;

-- Seed livrables IDF
insert into livrables (nom, description, statut, fichier, campagne_id) values
  ('Ciblage commercial',      'Identification et priorisation des cibles A/B/C',          'Validé',    'prospects/2026-06-17_idf-complete-2026_ciblage.md',         'idf-2026'),
  ('Qualification BANT',      'Scoring Budget · Autorité · Besoin · Timing',              'Validé',    'prospects/2026-06-17_idf-complete-2026_qualification.md',     'idf-2026'),
  ('Emails de prospection',   '8 emails · Vague 1 (juin) + Vague 2 (sept.)',              'Validé',    'prospects/2026-06-17_idf-complete-2026_emails.md',            'idf-2026'),
  ('Séquences LinkedIn',      '8 séquences J+0 / J+3 / J+10',                            'Validé',    'prospects/2026-06-17_idf-complete-2026_linkedin.md',          'idf-2026'),
  ('Scripts d''appel',        '3 scripts + tableau 6 objections',                         'Validé',    'prospects/2026-06-17_idf-complete-2026_script-appel.md',      'idf-2026'),
  ('Relances J+3 / J+7 / J+15','14 prospects Très chaud · séquences par établissement',  'Validé',    'prospects/2026-06-17_idf-complete-2026_relances.md',          'idf-2026'),
  ('Deck commercial',         '15 slides · SCQA · Audit gratuit CTA',                     'Validé',    'decks/2026-06-17_idf-complete-2026_deck.md',                  'idf-2026'),
  ('Analytics J+30',          'Rapport de performance · mi-juillet 2026',                 'À rédiger', null,                                                          'idf-2026')
on conflict do nothing;
