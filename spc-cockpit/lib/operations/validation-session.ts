// BRANCHEMENT DU MOTEUR CENTRAL DE VALIDATION — corrige BUG-015.
//
// L'audit a établi que `validateSessionForApproval` (engine/planning-validation)
// n'avait AUCUN appelant applicatif : ses seules occurrences du dépôt étaient sa
// définition et deux fichiers de tests. Le commentaire de `app/actions/missions.ts`
// — « les contrôles bloquants sont exécutés côté client via le moteur central » —
// était inexact : le garde réel (`SessionEnTete.tsx`) est parallèle et PLUS
// FAIBLE, la sous-couverture n'y figurant pas. Une session à 10/14 (71 %) pouvait
// donc être validée.
//
// Ce module est l'ADAPTATEUR manquant : il traduit les entités du produit
// (Mission, Salle, Affectation) vers les entrées du moteur, afin que le Server
// Action `validerSession` appelle la même fonction que les tests.
//
// Fonctions PURES et testables.

import { validateSessionForApproval } from "./engine/planning-validation";
import type {
  RoomPlanningInput,
  SupervisorAssignmentInput,
  ValidationResult,
} from "./engine/types";
import { normaliserNomSalle, salleDeAffectation } from "./referentiel-salles";
import type { Affectation, Mission, Salle } from "./types";

/** Créneau retenu pour une demi-journée : première ouverture → dernière fermeture. */
function creneau(a: Affectation, periode: "matin" | "apm"): { debut: string; fin: string } | null {
  const liste = periode === "matin" ? a.matinCreneaux : a.apmCreneaux;
  if (liste?.length) {
    const debut = liste[0]?.debut;
    const fin = liste[liste.length - 1]?.fin;
    if (debut && fin) return { debut, fin };
  }
  if (periode === "matin" && a.matin && a.matinDebut && a.matinFin) {
    return { debut: a.matinDebut, fin: a.matinFin };
  }
  if (periode === "apm" && a.apm && a.apmDebut && a.apmFin) {
    return { debut: a.apmDebut, fin: a.apmFin };
  }
  return null;
}

export interface EntreeValidationSession {
  mission: Mission;
  affectations: Affectation[]; // toutes affectations, filtrées ici sur la mission
  salles: Salle[]; // référentiel, pour le nombre de surveillants requis par salle
}

export interface EntreesMoteur {
  rooms: RoomPlanningInput[];
  assignments: SupervisorAssignmentInput[];
}

/**
 * Construit les entrées du moteur à partir du planning réel.
 *
 * Les salles sont dérivées du PLANNING, pas du référentiel : tant que
 * `affectations.salle_id` (migration 32) n'est pas renseigné partout, aucune
 * clé ne relie une salle à une session (BUG-004). Le nombre de surveillants
 * requis vient du référentiel quand le nom s'y rapproche ; à défaut, il retombe
 * sur `1` — un plancher, jamais l'effectif observé, qui rendrait la
 * sous-couverture indétectable par construction.
 */
export function entreesMoteur(input: EntreeValidationSession): EntreesMoteur {
  const { mission, salles } = input;
  const rows = input.affectations.filter((a) => a.missionId === mission.id);

  const requisParCle = new Map<string, number>();
  for (const s of salles) {
    const cle = normaliserNomSalle(s.nom);
    if (cle) requisParCle.set(cle, Math.max(0, s.nbSurveillants || 0));
  }

  const rooms: RoomPlanningInput[] = [];
  const assignments: SupervisorAssignmentInput[] = [];
  const vues = new Set<string>();

  for (const periode of ["matin", "apm"] as const) {
    const period = periode === "matin" ? "morning" : "afternoon";
    for (const a of rows) {
      const c = creneau(a, periode);
      if (!c) continue;
      const nomSalle = salleDeAffectation(a);
      // Une affectation sans salle ne peut pas être rattachée à une salle du
      // moteur. Elle est signalée à part (voir `anomaliesHorsMoteur`), jamais
      // rangée sous une salle fictive.
      if (!nomSalle) continue;

      const roomKey = `${period}::${normaliserNomSalle(nomSalle)}`;
      if (!vues.has(roomKey)) {
        vues.add(roomKey);
        rooms.push({
          id: roomKey,
          period,
          roomCode: nomSalle,
          startTime: c.debut,
          endTime: c.fin,
          requiredSupervisors: requisParCle.get(normaliserNomSalle(nomSalle)) ?? 1,
        });
      } else {
        // Amplitude de la salle = enveloppe de tous ses créneaux.
        const room = rooms.find((r) => r.id === roomKey)!;
        if (room.startTime && c.debut < room.startTime) room.startTime = c.debut;
        if (room.endTime && c.fin > room.endTime) room.endTime = c.fin;
      }

      assignments.push({
        id: `${a.id}::${period}`,
        sessionId: String(mission.id),
        roomId: nomSalle,
        supervisorId: String(a.surveillantId),
        startTime: c.debut,
        endTime: c.fin,
        status: a.presence === "Absent" ? "absent" : a.presence === "Présent" ? "confirmed" : "pending",
      });
    }
  }

  return { rooms, assignments };
}

export interface AnomalieHorsMoteur {
  code: string;
  message: string;
}

/**
 * Anomalies que le moteur ne peut PAS voir, parce qu'elles portent sur des
 * lignes qu'il n'accepte pas en entrée. Les taire reviendrait à valider une
 * session dont une partie du planning n'a jamais été examinée.
 */
export function anomaliesHorsMoteur(input: EntreeValidationSession): AnomalieHorsMoteur[] {
  const rows = input.affectations.filter((a) => a.missionId === input.mission.id);
  const anomalies: AnomalieHorsMoteur[] = [];

  const planifiees = rows.filter(
    (a) => a.matin || a.apm || a.matinCreneaux?.length || a.apmCreneaux?.length,
  );
  if (planifiees.length === 0) {
    anomalies.push({
      code: "SESSION_EMPTY",
      message: "Aucun créneau de surveillance n'est planifié sur cette session.",
    });
  }

  const sansSalle = planifiees.filter((a) => !salleDeAffectation(a));
  if (sansSalle.length > 0) {
    anomalies.push({
      code: "ASSIGNMENT_NO_ROOM",
      message: `${sansSalle.length} créneau(x) planifié(s) sans salle affectée : ils ne sont couverts par aucun contrôle de salle.`,
    });
  }

  // Couverture globale de la session : le moteur contrôle salle par salle, mais
  // une session peut être sous-dotée sans qu'aucune salle le soit — c'est
  // exactement le cas 10/14 relevé par l'audit.
  const requis = Math.max(0, input.mission.nbSurveillants || 0);
  const pourvus = new Set(planifiees.map((a) => a.surveillantId)).size;
  if (requis > 0 && pourvus < requis) {
    anomalies.push({
      code: "SESSION_UNDERSTAFFED",
      message: `Session sous-dotée : ${pourvus}/${requis} surveillant(s) planifié(s).`,
    });
  }

  return anomalies;
}

export interface VerdictSession {
  valide: boolean;
  /** Messages bloquants, prêts à être affichés. */
  bloquants: string[];
  /** Messages non bloquants, à signaler sans empêcher la validation. */
  avertissements: string[];
}

/**
 * Verdict complet d'une session avant validation. C'est CETTE fonction que le
 * Server Action `validerSession` appelle : le contrôle est donc exécuté côté
 * serveur, point d'entrée réseau, et non plus seulement dans le navigateur.
 */
export function verdictSession(input: EntreeValidationSession): VerdictSession {
  const { rooms, assignments } = entreesMoteur(input);
  const moteur: ValidationResult = validateSessionForApproval({ rooms, assignments });

  const bloquants = moteur.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const avertissements = moteur.issues.filter((i) => i.severity === "warning").map((i) => i.message);

  for (const a of anomaliesHorsMoteur(input)) bloquants.push(a.message);

  return { valide: bloquants.length === 0, bloquants, avertissements };
}

/** Message de refus consolidé, ou `null` si la session peut être validée. */
export function refusValidation(v: VerdictSession, limite = 4): string | null {
  if (v.valide) return null;
  const listes = v.bloquants.slice(0, limite).join(" · ");
  const reste = v.bloquants.length > limite ? ` (+${v.bloquants.length - limite} autre(s))` : "";
  return `Validation refusée — ${v.bloquants.length} contrôle(s) bloquant(s) : ${listes}${reste}. Corrigez le planning puis relancez la validation.`;
}
