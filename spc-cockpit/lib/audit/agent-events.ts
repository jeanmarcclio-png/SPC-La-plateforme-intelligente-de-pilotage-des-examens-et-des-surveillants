// Observabilité agentique (préparation — AUCUN LLM, AUCUNE route ici).
// Structure et builder d'un événement d'analyse IA, garanti sans PII brute.
// La table de persistance sera livrée séparément (migration v13) ; ce module
// fournit dès maintenant les types et la validation.

import { assertNoPII } from "@/lib/agents/redaction";

export type AgentEventStatus = "success" | "error" | "blocked" | "requires_human_validation";

export interface AgentEvent {
  tool: string; // outil appelé, ex. "planning-risk"
  userRef: string; // identifiant utilisateur pseudonymisé (jamais l'email)
  orgId: string | null; // organisation (null tant que multi-tenant non activé)
  missionRef: string | null; // référence mission (ex. EX-2026-041)
  analysisType: string; // ex. "risk-audit"
  argsSummary: Record<string, unknown>; // arguments MINIMISÉS (pas de PII)
  resultSummary: string; // résumé court, sans PII
  humanDecision: string | null; // décision humaine associée, si connue
  error: string | null;
  estimatedCost: number | null; // coût estimé (tokens/€), optionnel
  status: AgentEventStatus;
  createdAt: string; // ISO — fourni par l'appelant (pas de Date ici)
}

export interface AgentEventInput {
  tool: string;
  userRef: string;
  orgId?: string | null;
  missionRef?: string | null;
  analysisType: string;
  argsSummary?: Record<string, unknown>;
  resultSummary?: string;
  humanDecision?: string | null;
  error?: string | null;
  estimatedCost?: number | null;
  status: AgentEventStatus;
  createdAt: string;
}

/**
 * Construit un événement d'audit VALIDÉ sans PII. Lève si une donnée
 * personnelle subsiste (email/téléphone) dans les champs libres.
 */
export function buildAgentEvent(input: AgentEventInput): AgentEvent {
  const event: AgentEvent = {
    tool: input.tool,
    userRef: input.userRef,
    orgId: input.orgId ?? null,
    missionRef: input.missionRef ?? null,
    analysisType: input.analysisType,
    argsSummary: input.argsSummary ?? {},
    resultSummary: input.resultSummary ?? "",
    humanDecision: input.humanDecision ?? null,
    error: input.error ?? null,
    estimatedCost: input.estimatedCost ?? null,
    status: input.status,
    createdAt: input.createdAt,
  };
  const guard = assertNoPII(event);
  if (!guard.ok) throw new Error(guard.error);
  return event;
}

/** Filtre une liste d'événements par organisation (isolation applicative). */
export function filterEventsByOrg(events: AgentEvent[], orgId: string | null): AgentEvent[] {
  if (orgId === null) return events.filter((e) => e.orgId === null);
  return events.filter((e) => e.orgId === orgId);
}
