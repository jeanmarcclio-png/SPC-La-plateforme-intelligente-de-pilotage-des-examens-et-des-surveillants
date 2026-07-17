# Portail surveillant — tests manuels (phase 2)

Parcours de recette de bout en bout. Prérequis : phase 1 en place +
`supabase/bootstrap/phase2-portail.sql` appliqué. Le seed
`supabase/seed/demo-portail-surveillant.sql` fournit un jeu de test complet.

Variable d'env requise (Vercel, **serveur uniquement**) : `SUPABASE_SERVICE_ROLE_KEY`
(sinon le bouton « Inviter » renvoie une erreur explicite, sans crash).

---

## 1. Invitation (coordinateur)
1. Se connecter en **coordinateur/admin** → `/operations/surveillants`.
2. Panneau **« Accès portail surveillant »** : chaque surveillant a un statut
   **Non invité / Invité / Compte actif**.
3. Cliquer **« Inviter »** sur un surveillant ayant un email.
   - ✅ Statut passe à **Invité** (ou **Compte actif** si le compte existait) ;
   - ✅ un email magic link part (ou, en démo, le compte est déjà actif) ;
   - ✅ en base : `organization_members.role='surveillant'`, `surveillants.user_id` renseigné, `invited_at` posé.
4. Sans email → bouton désactivé (message au survol).

## 2. Connexion surveillant
1. Ouvrir le lien magic link (ou `/login` → onglet **Lien magique**) avec l'email du surveillant.
2. Aller sur **`/moi`**.
   - ✅ Le surveillant voit **son planning** (ses affectations à venir) ;
   - ✅ un rôle non-surveillant sur `/moi` voit un **« Aperçu · vue surveillant »** (pas de données d'autrui).

## 3. Confirmation
1. Sur `/moi`, une affectation « À confirmer » → **Confirmer**.
   - ✅ Le badge passe à **Confirmée** ;
   - ✅ en base `affectations.statut='confirmee'`, `decided_at` renseigné.

## 4. Refus
1. Sur une autre affectation → **Décliner** → saisir un motif → **Envoyer le refus**.
   - ✅ Badge **Refus signalé** ; le **planning n'est PAS modifié** (statut inchangé) ;
   - ✅ en base `affectations.decline=true`, `motif` renseigné, statut conservé.

## 5. Traitement coordinateur
1. Coordinateur → `/operations/planification`.
   - ✅ Bandeau **« À traiter — N refus surveillants »** avec nom + motif ;
   - ✅ mise à jour **temps réel** (badge/refus apparaît sans recharger — Supabase Realtime) ;
   - ✅ résoudre en suggérant un remplaçant via le copilote d'affectation (tableau ci-dessous).

## 6. Disponibilités → contrainte dure
1. Sur `/moi` → section **Mes disponibilités** : décocher matin/après-midi d'un jour → **OK**.
   - ✅ `disponibilites` upsert (unique par surveillant+date).
2. Côté copilote : un surveillant **indisponible** pour la date/créneau **n'est jamais suggéré**
   (`suggererSurveillants(..., { indisponibleIds })`, couvert par test unitaire).

---

## Contrôles RLS (sécurité, spec §5)
Connecté **en tant que surveillant**, vérifier via l'app ou SQL (`role authenticated`) :
- [ ] `select * from surveillants` → **une seule ligne** (la sienne) : aucun téléphone/heures d'autrui.
- [ ] `select * from affectations` → **uniquement** ses affectations.
- [ ] `select * from disponibilites` → **uniquement** les siennes.
- [ ] `update affectations set statut='confirmee' where id=<autre>` → **refusé** (RLS).
- [ ] Confirmer/décliner passe **uniquement** par les RPC `spc_confirmer_affectation` / `spc_decliner_affectation` (contrôle de propriété).
- [ ] Coordinateur/admin : accès complet inchangé (aucune régression).

## Non-régression
- [ ] Import Excel surveillants (coordinateur) OK.
- [ ] Convocations, alertes, suggestions d'affectation OK.
- [ ] `npm test` (205), `npm run build`, `eslint` verts.
