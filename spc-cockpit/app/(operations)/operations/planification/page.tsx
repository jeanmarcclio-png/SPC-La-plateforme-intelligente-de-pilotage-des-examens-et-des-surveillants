export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations, getJournal } from "@/lib/operations/queries";
import { getRefusEnAttente } from "@/lib/supabase/portail";
import { getSallesACouvrirParMission } from "@/lib/operations/planning-salles";
import { PlanificationBoard } from "@/components/ops/PlanificationBoard";
import { AlertBanner, type AlertItem } from "@/components/ops/AlertBanner";
import { estPlanifiable } from "@/lib/operations/mission-status";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { PageHeader } from "@/components/ops/shell";

export default async function PlanificationPage() {
  const [missions, surveillants, affectations, journal, refus, sallesParMission] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(), getJournal(), getRefusEnAttente(), getSallesACouvrirParMission(),
  ]);

  // C1 — taxonomie d'alertes unifiée : BLOCANT (refus) · WARNING (sous-effectif) · INFO.
  const alertes: AlertItem[] = refus.map((r) => ({
    id: `refus-${r.affectationId}`,
    level: "BLOCANT" as const,
    title: `Refus surveillant — ${r.surveillantNom}`,
    description: [r.missionRef, r.salle && `Salle ${r.salle}`, r.motif ? `« ${r.motif} »` : "sans motif"].filter(Boolean).join(" · "),
    ctaLabel: "Remplacer",
    ctaHref: "#session-table",
  }));

  // WARNING — sous-effectif agrégé sur les sessions planifiables (requis vs affectés).
  const affParMission = new Map<number, number>();
  for (const a of affectations) affParMission.set(a.missionId, (affParMission.get(a.missionId) ?? 0) + 1);
  const manqueTotal = missions
    .filter((m) => estPlanifiable(m.statut))
    .reduce((n, m) => n + Math.max(0, m.nbSurveillants - (affParMission.get(m.id) ?? 0)), 0);
  if (manqueTotal > 0) {
    alertes.push({
      id: "sous-effectif",
      level: "WARNING",
      title: `Sous-effectif : ${manqueTotal} poste${manqueTotal > 1 ? "s" : ""} à pourvoir`,
      description: "Anticiper les renforts avant le jour J",
      ctaLabel: "Recruter",
      ctaHref: "/operations/surveillants",
    });
  }

  // INFO — affectations proposées en attente de confirmation (non bloquant).
  const proposes = affectations.filter((a) => a.statut === "Proposé").length;
  if (proposes > 0) {
    alertes.push({
      id: "proposes",
      level: "INFO",
      title: `${proposes} affectation${proposes > 1 ? "s" : ""} en attente de confirmation`,
      ctaLabel: "Voir tout",
      ctaHref: "#session-table",
    });
  }

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <RealtimeRefresh tables={["affectations", "disponibilites"]} />
      <PageHeader page="Planification" subtitle="Sessions d&apos;examens · affectation des salles et créneaux, suivi des heures" />
      <AlertBanner alerts={alertes} maxVisible={5} />
      <PlanificationBoard missions={missions} surveillants={surveillants} affectations={affectations} journal={journal} sallesParMission={sallesParMission} />
    </div>
  );
}
