// Moteur de risques planning SPC — fonctions pures, déterministes, testables.
// Fondation de l'agent lecture seule "spc-planning-risk-auditor" : chaque
// risque provient d'ici (jamais du LLM). L'agent ne fait qu'expliquer et
// hiérarchiser des RiskItem produits par ces fonctions.

import { detectSupervisorConflicts } from "./planning-validation";
import type { RoomPlanningInput, SupervisorAssignmentInput } from "./types";

export type RiskSeverity = "critique" | "avertissement" | "information";

export type RiskType =
  | "salle_sous_dotee"
  | "salle_sur_dotee"
  | "conflit_surveillant"
  | "conflit_inter_missions"
  | "pmr_non_couvert"
  | "tiers_temps_incoherent"
  | "delai_j48"
  | "incoherence_devis_planning"
  | "incoherence_nb_salles";

export interface RiskItem {
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  detail: string;
  /** Identifiants concernés (salle, surveillant…) — jamais de données personnelles. */
  entities: string[];
  /** Preuve déterministe issue du moteur (compté / calculé), pas une opinion. */
  evidence: Record<string, number | string | boolean>;
  recommendation: string;
  /** Un agent ne peut jamais agir seul : toute correction passe par un humain. */
  requiresHumanAction: true;
}

// ---------------------------------------------------------------------------
// Couverture des salles : sous-dotation ET sur-dotation
// ---------------------------------------------------------------------------

/**
 * Compare, par salle, le nombre de surveillants réellement affectés (créneaux
 * valides, hors absents/remplacés) au besoin `requiredSupervisors`.
 */
export function detectRoomCoverageRisks(
  rooms: RoomPlanningInput[],
  assignments: SupervisorAssignmentInput[]
): RiskItem[] {
  const risks: RiskItem[] = [];
  const actifs = assignments.filter((a) => a.status !== "absent" && a.status !== "replaced");

  for (const room of rooms) {
    const affectes = actifs.filter((a) => a.roomId === room.roomCode).length;
    const requis = room.requiredSupervisors;

    if (requis > 0 && affectes < requis) {
      risks.push({
        type: "salle_sous_dotee",
        severity: affectes === 0 ? "critique" : "avertissement",
        title: `Salle ${room.roomCode} sous-dotée`,
        detail: `${affectes}/${requis} surveillant(s) affecté(s)`,
        entities: [room.roomCode],
        evidence: { requis, affectes, manquants: requis - affectes },
        recommendation: `Affecter ${requis - affectes} surveillant(s) supplémentaire(s) à la salle ${room.roomCode}.`,
        requiresHumanAction: true,
      });
    } else if (requis >= 0 && affectes > requis) {
      risks.push({
        type: "salle_sur_dotee",
        severity: "information",
        title: `Salle ${room.roomCode} sur-dotée`,
        detail: `${affectes} surveillant(s) pour ${requis} requis`,
        entities: [room.roomCode],
        evidence: { requis, affectes, surplus: affectes - requis },
        recommendation: `Réaffecter ${affectes - requis} surveillant(s) de la salle ${room.roomCode} vers une salle sous-dotée.`,
        requiresHumanAction: true,
      });
    }
  }
  return risks;
}

// ---------------------------------------------------------------------------
// Conflits de surveillants → RiskItem
// ---------------------------------------------------------------------------

export function detectConflictRisks(assignments: SupervisorAssignmentInput[]): RiskItem[] {
  return detectSupervisorConflicts(assignments).map((c) => ({
    type: "conflit_surveillant" as const,
    severity: "critique" as const,
    title: `Double affectation — surveillant ${c.supervisorId}`,
    detail: c.message,
    entities: [c.supervisorId],
    evidence: { debut: c.startTime, fin: c.endTime },
    recommendation: "Retirer l'une des deux affectations chevauchantes.",
    requiresHumanAction: true,
  }));
}

// ---------------------------------------------------------------------------
// Couverture PMR / tiers-temps
// ---------------------------------------------------------------------------

/**
 * Une salle marquée PMR ou tiers-temps doit avoir au moins un surveillant
 * affecté. Faute d'un référentiel de compétences daté, on contrôle ici la
 * présence d'affectation (les compétences fines relèvent d'une phase ultérieure).
 */
export function detectAccessibilityRisks(
  rooms: RoomPlanningInput[],
  assignments: SupervisorAssignmentInput[]
): RiskItem[] {
  const risks: RiskItem[] = [];
  const actifs = assignments.filter((a) => a.status !== "absent" && a.status !== "replaced");
  for (const room of rooms) {
    const affectes = actifs.filter((a) => a.roomId === room.roomCode).length;
    if (room.isPMR && affectes === 0) {
      risks.push({
        type: "pmr_non_couvert",
        severity: "critique",
        title: `Salle PMR ${room.roomCode} non couverte`,
        detail: "Salle avec contrainte PMR sans surveillant affecté",
        entities: [room.roomCode],
        evidence: { isPMR: true, affectes: 0 },
        recommendation: `Affecter un surveillant à la salle PMR ${room.roomCode}.`,
        requiresHumanAction: true,
      });
    }
    if (room.hasExtraTime && affectes === 0) {
      risks.push({
        type: "tiers_temps_incoherent",
        severity: "avertissement",
        title: `Salle tiers-temps ${room.roomCode} non couverte`,
        detail: "Salle avec tiers-temps sans surveillant affecté",
        entities: [room.roomCode],
        evidence: { hasExtraTime: true, affectes: 0 },
        recommendation: `Affecter un surveillant à la salle tiers-temps ${room.roomCode}.`,
        requiresHumanAction: true,
      });
    }
  }
  return risks;
}

// ---------------------------------------------------------------------------
// Conflits inter-missions le même jour
// ---------------------------------------------------------------------------

/**
 * Même surveillant, MÊME JOUR, sur deux missions différentes, avec créneaux
 * qui se chevauchent. L'appelant encode `sessionId` = `{date}-{période}` et
 * fournit `missionId` distinct via roomId préfixé. On réutilise le détecteur
 * central puis on ne garde que les paires de missions différentes.
 */
export function detectCrossMissionConflicts(
  assignments: SupervisorAssignmentInput[]
): RiskItem[] {
  const missionOf = new Map(assignments.map((a) => [a.id, a.roomId.split(":")[0]]));
  return detectSupervisorConflicts(assignments)
    .filter((c) => missionOf.get(c.assignmentIdA) !== missionOf.get(c.assignmentIdB))
    .map((c) => ({
      type: "conflit_inter_missions" as const,
      severity: "critique" as const,
      title: `Surveillant ${c.supervisorId} sur deux missions le même jour`,
      detail: `${c.message} — missions ${missionOf.get(c.assignmentIdA)} et ${missionOf.get(c.assignmentIdB)}`,
      entities: [c.supervisorId],
      evidence: { debut: c.startTime, fin: c.endTime },
      recommendation: "Retirer le surveillant de l'une des deux missions.",
      requiresHumanAction: true,
    }));
}

// ---------------------------------------------------------------------------
// Cohérence devis ↔ planning et nb_salles ↔ affectations
// ---------------------------------------------------------------------------

/** Compare le périmètre annoncé au devis à celui réellement planifié. */
export function auditQuotePlanningConsistency(input: {
  devisNbSalles: number;
  planningNbSalles: number;
  devisNbSurveillants: number;
  planningNbSurveillants: number;
}): RiskItem[] {
  const risks: RiskItem[] = [];
  if (input.devisNbSalles !== input.planningNbSalles) {
    risks.push({
      type: "incoherence_devis_planning",
      severity: "avertissement",
      title: "Écart devis ↔ planning : nombre de salles",
      detail: `Devis : ${input.devisNbSalles} salle(s) · Planning : ${input.planningNbSalles}`,
      entities: ["devis", "planning"],
      evidence: { devisNbSalles: input.devisNbSalles, planningNbSalles: input.planningNbSalles },
      recommendation: "Aligner la répartition des salles du planning sur le devis (ou mettre à jour le devis).",
      requiresHumanAction: true,
    });
  }
  if (input.devisNbSurveillants !== input.planningNbSurveillants) {
    risks.push({
      type: "incoherence_devis_planning",
      severity: "avertissement",
      title: "Écart devis ↔ planning : nombre de surveillants",
      detail: `Devis : ${input.devisNbSurveillants} · Planning : ${input.planningNbSurveillants}`,
      entities: ["devis", "planning"],
      evidence: { devisNbSurveillants: input.devisNbSurveillants, planningNbSurveillants: input.planningNbSurveillants },
      recommendation: "Aligner le nombre de surveillants planifiés sur le devis.",
      requiresHumanAction: true,
    });
  }
  return risks;
}

/** Compare le nb_salles déclaré de la mission au nombre de salles distinctes affectées. */
export function auditRoomCountConsistency(input: {
  declaredRooms: number;
  distinctAssignedRooms: number;
}): RiskItem[] {
  if (input.declaredRooms === input.distinctAssignedRooms) return [];
  return [
    {
      type: "incoherence_nb_salles",
      severity: "avertissement",
      title: "Écart nombre de salles déclaré ↔ affecté",
      detail: `Mission : ${input.declaredRooms} salle(s) déclarée(s) · Affectées : ${input.distinctAssignedRooms}`,
      entities: ["mission"],
      evidence: { declaredRooms: input.declaredRooms, distinctAssignedRooms: input.distinctAssignedRooms },
      recommendation: "Vérifier la répartition des salles ou le nombre de salles de la mission.",
      requiresHumanAction: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Risque de délai J-48
// ---------------------------------------------------------------------------

/**
 * Élève la gravité d'un défaut de couverture à l'approche de la session.
 * `daysUntilSession` est passé par l'appelant (pas de Date ici → testable).
 *  J-7 → attention · J-2 → haute (avertissement) · J-0 → critique.
 */
export function getJ48Risks(input: {
  daysUntilSession: number;
  uncoveredRooms: number;
  missionLabel: string;
}): RiskItem[] {
  const { daysUntilSession, uncoveredRooms, missionLabel } = input;
  if (uncoveredRooms <= 0 || daysUntilSession < 0 || daysUntilSession > 7) return [];
  const severity: RiskSeverity = daysUntilSession <= 0 ? "critique" : daysUntilSession <= 2 ? "avertissement" : "information";
  return [
    {
      type: "delai_j48",
      severity,
      title: `J−${daysUntilSession} : ${uncoveredRooms} salle(s) non couverte(s)`,
      detail: `Session « ${missionLabel} » à J−${daysUntilSession} avec ${uncoveredRooms} salle(s) sans couverture complète`,
      entities: [missionLabel],
      evidence: { daysUntilSession, uncoveredRooms },
      recommendation: "Sécuriser la couverture avant la confirmation J-48.",
      requiresHumanAction: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Agrégat : rapport de risque d'une session (tri par gravité)
// ---------------------------------------------------------------------------

const SEV_ORDER: Record<RiskSeverity, number> = { critique: 0, avertissement: 1, information: 2 };

export function buildSessionRiskReport(input: {
  rooms: RoomPlanningInput[];
  assignments: SupervisorAssignmentInput[];
  daysUntilSession?: number;
  missionLabel?: string;
}): { risks: RiskItem[]; counts: Record<RiskSeverity, number> } {
  const coverage = detectRoomCoverageRisks(input.rooms, input.assignments);
  const risks: RiskItem[] = [
    ...coverage,
    ...detectConflictRisks(input.assignments),
    ...detectAccessibilityRisks(input.rooms, input.assignments),
  ];
  if (input.daysUntilSession !== undefined) {
    const uncovered = coverage.filter((r) => r.type === "salle_sous_dotee").length;
    risks.push(...getJ48Risks({ daysUntilSession: input.daysUntilSession, uncoveredRooms: uncovered, missionLabel: input.missionLabel ?? "session" }));
  }
  risks.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const counts: Record<RiskSeverity, number> = { critique: 0, avertissement: 0, information: 0 };
  for (const r of risks) counts[r.severity]++;
  return { risks, counts };
}
