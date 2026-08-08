// Outils métier de l'agent "spc-planning-risk-auditor" — LECTURE SEULE.
// Aucune écriture, aucune action métier. Chaque risque est DÉTERMINISTE
// (issu du moteur / des données), jamais du modèle. Le payload destiné au
// LLM est minimisé (aucune donnée personnelle).

import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { SEUIL_SURCHARGE_H } from "@/lib/operations/constants";
import { affectationToAssignments } from "@/lib/operations/engine/adapters";
import { detectConflictRisks, type RiskItem, type RiskSeverity } from "@/lib/operations/engine/risk";
import { redactSupervisors } from "@/lib/agents/redaction";
import { dateFR } from "@/lib/operations/format";
import type { Mission, Surveillant, Affectation } from "@/lib/operations/types";

const SEV_ORDER: Record<RiskSeverity, number> = { critique: 0, avertissement: 1, information: 2 };

function slotInvalid(debut?: string, fin?: string): boolean {
  if (!debut || !fin) return true;
  const [dh, dm] = debut.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  return fh * 60 + fm - (dh * 60 + dm) <= 0;
}

function daysUntil(dateISO: string | undefined, todayISO: string): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO + "T00:00:00").getTime();
  const t = new Date(todayISO + "T00:00:00").getTime();
  if (isNaN(d) || isNaN(t)) return null;
  return Math.round((d - t) / 86400000);
}

/**
 * Risques d'affectation d'une mission, à partir des données réelles.
 * `refOnly` = true remplace les noms par des identifiants (payload modèle).
 */
function missionRisks(
  mission: Mission,
  affectations: Affectation[],
  surveillants: Surveillant[],
  todayISO: string,
  refOnly: boolean
): RiskItem[] {
  const survById = new Map(surveillants.map((s) => [s.id, s]));
  const rows = affectations.filter((a) => a.missionId === mission.id);
  const label = (id: number) => (refOnly ? `S-${id}` : survById.get(id)?.nom ?? `S-${id}`);
  const risks: RiskItem[] = [];

  // Conflits de créneaux (moteur central)
  const assignments = rows.flatMap((a) => affectationToAssignments(a));
  risks.push(...detectConflictRisks(assignments));

  for (const a of rows) {
    const who = label(a.surveillantId);
    const sansCreneau = !a.matin && !a.apm;
    const sansSalle = !a.salle;
    if (sansCreneau && sansSalle) {
      risks.push({ type: "salle_sous_dotee", severity: "avertissement", title: `Affectation incomplète — ${who}`, detail: "salle et créneau à compléter", entities: [who], evidence: { salle: false, creneau: false }, recommendation: "Compléter la salle et le créneau de cette affectation.", requiresHumanAction: true });
    } else if (sansCreneau) {
      risks.push({ type: "salle_sous_dotee", severity: "avertissement", title: `Créneau manquant — ${who}`, detail: "ni matin ni après-midi", entities: [who], evidence: { creneau: false }, recommendation: "Attribuer un créneau (matin et/ou après-midi).", requiresHumanAction: true });
    } else if (sansSalle) {
      risks.push({ type: "salle_sous_dotee", severity: "avertissement", title: `Salle manquante — ${who}`, detail: "aucune salle affectée", entities: [who], evidence: { salle: false }, recommendation: "Affecter une salle à ce surveillant.", requiresHumanAction: true });
    }
    // Validation sur CHAQUE créneau (§30) — repli sur le créneau unique.
    const matinCr = a.matinCreneaux?.length ? a.matinCreneaux : a.matin ? [{ debut: a.matinDebut ?? "", fin: a.matinFin ?? "" }] : [];
    const apmCr = a.apmCreneaux?.length ? a.apmCreneaux : a.apm ? [{ debut: a.apmDebut ?? "", fin: a.apmFin ?? "" }] : [];
    if (matinCr.some((c) => slotInvalid(c.debut, c.fin))) {
      const bad = matinCr.find((c) => slotInvalid(c.debut, c.fin))!;
      risks.push({ type: "tiers_temps_incoherent", severity: "avertissement", title: `Horaire matin invalide — ${who}`, detail: `${bad.debut || "?"}–${bad.fin || "?"} (fin ≤ début)`, entities: [who], evidence: { debut: bad.debut, fin: bad.fin }, recommendation: "Corriger l'horaire du matin.", requiresHumanAction: true });
    }
    if (apmCr.some((c) => slotInvalid(c.debut, c.fin))) {
      const bad = apmCr.find((c) => slotInvalid(c.debut, c.fin))!;
      risks.push({ type: "tiers_temps_incoherent", severity: "avertissement", title: `Horaire après-midi invalide — ${who}`, detail: `${bad.debut || "?"}–${bad.fin || "?"} (fin ≤ début)`, entities: [who], evidence: { debut: bad.debut, fin: bad.fin }, recommendation: "Corriger l'horaire de l'après-midi.", requiresHumanAction: true });
    }
  }

  // Surcharge des surveillants affectés
  const idsMission = new Set(rows.map((r) => r.surveillantId));
  for (const s of surveillants.filter((x) => idsMission.has(x.id) && x.heures >= SEUIL_SURCHARGE_H)) {
    risks.push({ type: "conflit_surveillant", severity: "avertissement", title: `Charge critique — ${refOnly ? `S-${s.id}` : s.nom}`, detail: `${s.heures}h planifiées — seuil de ${SEUIL_SURCHARGE_H}h dépassé`, entities: [refOnly ? `S-${s.id}` : s.nom], evidence: { heures: s.heures, seuil: SEUIL_SURCHARGE_H }, recommendation: "Rééquilibrer la charge vers un surveillant moins sollicité.", requiresHumanAction: true });
  }

  // Délai J-48
  const dj = daysUntil(mission.dateMission, todayISO);
  const incomplets = rows.filter((a) => (!a.matin && !a.apm) || !a.salle).length;
  if (dj !== null && dj >= 0 && dj <= 7 && incomplets > 0) {
    const severity: RiskSeverity = dj <= 0 ? "critique" : dj <= 2 ? "avertissement" : "information";
    risks.push({ type: "delai_j48", severity, title: `J−${dj} : ${incomplets} affectation(s) incomplète(s)`, detail: `Session du ${dateFR(mission.dateMission)} à J−${dj}`, entities: [mission.reference], evidence: { joursRestants: dj, incomplets }, recommendation: "Sécuriser les affectations avant la confirmation J-48.", requiresHumanAction: true });
  }

  return risks.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

export interface PlanningRiskReport {
  generatedAt: string;
  mission: { reference: string; client: string; date: string; statut: string } | null;
  risks: RiskItem[];
  counts: Record<RiskSeverity, number>;
}

/** Rapport pour affichage interne (noms visibles). Lecture seule. */
export async function getPlanningRiskReport(missionId: number | null, todayISO: string): Promise<PlanningRiskReport> {
  const [jm, js, ja] = await Promise.all([getMissions(), getSurveillants(), getAffectations()]);
  const missions = jm.lignes, surveillants = js.lignes, affectations = ja.lignes;
  const mission =
    (missionId ? missions.find((m) => m.id === missionId) : null) ??
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée") ??
    null;

  if (!mission) return { generatedAt: todayISO, mission: null, risks: [], counts: { critique: 0, avertissement: 0, information: 0 } };

  const risks = missionRisks(mission, affectations, surveillants, todayISO, false);
  const counts: Record<RiskSeverity, number> = { critique: 0, avertissement: 0, information: 0 };
  for (const r of risks) counts[r.severity]++;
  return {
    generatedAt: todayISO,
    mission: { reference: mission.reference, client: mission.client, date: dateFR(mission.dateMission), statut: mission.statut },
    risks,
    counts,
  };
}

/**
 * Payload MINIMISÉ destiné au modèle : identifiants au lieu de noms, plus la
 * liste anonymisée des surveillants de la mission. Aucune donnée personnelle.
 */
export async function getModelPayload(missionId: number | null, todayISO: string) {
  const [jm, js, ja] = await Promise.all([getMissions(), getSurveillants(), getAffectations()]);
  const missions = jm.lignes, surveillants = js.lignes, affectations = ja.lignes;
  const mission =
    (missionId ? missions.find((m) => m.id === missionId) : null) ??
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée") ??
    null;
  if (!mission) return null;

  const risks = missionRisks(mission, affectations, surveillants, todayISO, true);
  const idsMission = new Set(affectations.filter((a) => a.missionId === mission.id).map((a) => a.surveillantId));
  return {
    mission: { reference: mission.reference, date: mission.dateMission ?? null, statut: mission.statut, nbSalles: mission.nbSalles, nbSurveillants: mission.nbSurveillants },
    equipe: redactSupervisors(surveillants.filter((s) => idsMission.has(s.id))),
    risks,
  };
}
