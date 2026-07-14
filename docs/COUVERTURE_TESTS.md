# Couverture des règles métier critiques — SPC

Traçabilité des **20 cas critiques** (Phase 5 du prompt d'industrialisation)
vers les tests qui les couvrent. Exécuter : `npm run test` (204 tests) ou
`npm run test:coverage` (couverture moteur `lib/operations` ≈ 94 %).

| # | Règle critique | Statut | Où c'est testé |
|---|----------------|--------|----------------|
| 1 | Calcul des heures d'une session | ✅ | `financial-engine.test.ts` (heures facturables) · `reference-metier.test.ts` |
| 2 | Calcul matin / après-midi indépendants | ✅ | `financial-engine.test.ts` (« matin et après-midi indépendants ») |
| 3 | Sessions traversant plusieurs jours | ✅ | `financial-engine.test.ts` (mission = somme) · `reference-metier.test.ts` |
| 4 | Week-ends exclus | ➖ | **Feature absente** : le devis se calcule en heures × taux, pas par comptage de jours. Sans objet. |
| 5 | Jours fériés exclus | ➖ | **Feature absente** (idem #4). |
| 6 | Correction manuelle des jours retenus | ➖ | Pas de comptage de jours ; la **correction manuelle des heures** est directe (édition planning) et recalcule le devis → `reference-metier.test.ts` (« modification d'un horaire recalcule ») |
| 7 | Taux horaire | ✅ | `financial-engine.test.ts` (cas de référence 100 h × 30 €) |
| 8 | Coefficient d'ajustement | ✅ | `financial-engine.test.ts` (coefficient appliqué une seule fois, avant frais) |
| 9 | Coefficient de présence | ➖ | **Non présent dans le modèle** (le devis prévisionnel n'applique pas de coefficient de présence). Sans objet. |
| 10 | HT / TVA / TTC | ✅ | `financial-engine.test.ts` (cas de référence → 4 380,00 € TTC) |
| 11 | Arrondis monétaires | ✅ | `financial-engine.test.ts` (calcul en centimes, `eurosToCents(0.1+0.2)=30`, ICP Reims 8 813,28 €) |
| 12 | Ajout / suppression de salles | ✅ | `financial-engine.test.ts` (somme des salles, salle invalide sans faux total). CRUD = Server Action (parcours e2e, Phase 6) |
| 13 | Affectation d'un surveillant | ✅ | `planning-validation.test.ts` (adaptateurs SPC) · `risk.test.ts` (couverture) |
| 14 | Double affectation interdite | ✅ | `planning-validation.test.ts` · `reference-metier.test.ts` (validation bloquée) |
| 15 | Conflit d'horaires | ✅ | `planning-validation.test.ts` (`detectSupervisorConflicts`) |
| 16 | PMR et tiers-temps | ✅ | `risk.test.ts` (`detectAccessibilityRisks` : PMR non couvert = critique, tiers-temps = avertissement) |
| 17 | Isolation entre deux organisations | ⚠️ | Logique de rôle : `authorize.test.ts`, `roles.test.ts`. **Isolation au niveau base = RLS SQL** (`spc_member_of`), non testable en unitaire → e2e Playwright + audit `AUDIT_SUPABASE_RLS.md` |
| 18 | Droits utilisateur | ✅ | `authorize.test.ts` (non authentifié refusé, mode transition, mode strict) · `roles.test.ts` |
| 19 | Données incomplètes | ✅ | `planning-validation.test.ts` (`validateRoom` : code absent, début/fin absents) |
| 20 | Valeurs invalides | ✅ | `financial-engine.test.ts` (fin ≤ début, coefficient nul, taux négatif, format horaire) |

## Synthèse

- **17 / 20 couverts** par des tests unitaires ou de scénario.
- **3 « sans objet »** (#4, #5, #9) : fonctionnalités **absentes du modèle métier
  actuel** (pas de comptage jours/fériés ni de coefficient de présence) — à ne
  pas confondre avec un défaut de test. Si le métier décide un jour de facturer
  au jour ouvré, il faudra ajouter la fonction **et** ses tests.
- **1 partiel** (#17) : la logique de rôle est testée ; l'isolation multi-tenant
  repose sur le RLS PostgreSQL, à valider en base et via e2e (Phases 3 et 6).

## Fichiers de test

```
lib/operations/engine/__tests__/financial-engine.test.ts   moteur financier
lib/operations/engine/__tests__/planning-validation.test.ts validation planning
lib/operations/engine/__tests__/risk.test.ts                risques (PMR, J-48, conflits)
lib/operations/engine/__tests__/reference-metier.test.ts    scénarios d'acceptation
lib/auth/__tests__/authorize.test.ts                        autorisation
lib/auth/__tests__/roles.test.ts                            rôles / capacités
lib/operations/__tests__/*.test.ts                          import, suggestions, rentabilité,
                                                            couverture, santé, alertes, statuts
```
