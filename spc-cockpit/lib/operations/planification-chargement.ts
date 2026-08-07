import { getAffectations, getJournal, getMissions, getSurveillants } from "./queries";
import { construireVueSession, sessionsSelectionnables, type VueSession } from "./planification-vue";
import type { JournalEntry, Mission, Surveillant } from "./types";

// Chargement commun aux trois pages du parcours Planification.
// La session courante transite par le paramètre d'URL `?session=<id>` : l'état
// survit à la navigation entre PILOTER, PLANIFIER et OPTIMISER, reste
// partageable par lien et ne dépend d'aucun état client (prompt §13).

export interface ContexteSession {
  vue: VueSession | null;
  sessions: Mission[];
  surveillants: Surveillant[];
  /** Surveillants non encore affectés à la session courante. */
  disponibles: Surveillant[];
  journal: JournalEntry[];
}

export async function chargerContexteSession(sessionParam?: string): Promise<ContexteSession> {
  const [missions, surveillants, affectations, journal] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(), getJournal(),
  ]);

  const sessions = sessionsSelectionnables(missions);
  const demandee = sessionParam ? sessions.find((m) => String(m.id) === sessionParam) : undefined;
  const mission = demandee ?? sessions[0] ?? null;

  if (!mission) {
    return { vue: null, sessions, surveillants, disponibles: surveillants, journal: [] };
  }

  const vue = construireVueSession({ mission, missions, affectations, surveillants });
  const affectes = new Set(vue.lignes.map((l) => l.surveillantId));

  return {
    vue,
    sessions,
    surveillants,
    disponibles: surveillants.filter((s) => !affectes.has(s.id)),
    journal: journal.filter((j) => j.missionId === mission.id),
  };
}
