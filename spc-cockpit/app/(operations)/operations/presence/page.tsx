export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getAffectations } from "@/lib/operations/queries";
import { PresenceBoard } from "@/components/ops/PresenceBoard";
import { Kpi } from "@/components/ops/Kpi";
import { dateFR } from "@/lib/operations/format";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";
import { BandeauSource, EtatVide } from "@/components/ops/EtatSource";
import { origineGlobale, premiereErreur } from "@/lib/operations/source";

export default async function PresencePage() {
  const [jeuMissions, jeuSurveillants, jeuAffectations] = await Promise.all([
    getMissions(), getSurveillants(), getAffectations(),
  ]);
  const missions = jeuMissions.lignes;
  const surveillants = jeuSurveillants.lignes;
  const affectations = jeuAffectations.lignes;
  const origine = origineGlobale(jeuMissions, jeuSurveillants, jeuAffectations);

  const active = missions.find((m) => m.statut === "En cours") ?? missions.find((m) => m.statut === "Validée") ?? missions.find((m) => m.statut === "Planifiée");
  const rows = active ? affectations.filter((a) => a.missionId === active.id) : [];

  const presents = rows.filter((a) => a.presence === "Présent").length;
  const absents = rows.filter((a) => a.presence === "Absent").length;
  const attente = rows.filter((a) => a.presence === "En attente").length;

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader
        page="Présence"
        title="Suivi des présences"
        subtitle={`Émargement numérique des surveillants${active ? ` — ${active.client}, ${dateFR(active.dateMission)}` : ""}`}
      />

      <BandeauSource origine={origine} detail={premiereErreur(jeuMissions, jeuSurveillants, jeuAffectations)} />

      {rows.length === 0 && origine !== "erreur" ? (
        <EtatVide
          titre={active ? "Aucun surveillant affecté à cette session" : "Aucune session en cours"}
          message={
            active
              ? "L'émargement devient disponible une fois l'équipe affectée à la session. Commencez par constituer l'équipe depuis la planification."
              : "L'émargement porte sur la session active. Aucune session n'est actuellement en cours, validée ou planifiée."
          }
          action={{ label: "Ouvrir la planification", href: "/operations/planification" }}
        />
      ) : (
      <>
      <div className="grid grid-cols-3 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="emerald" label="Présents" value={String(presents)} sub="émargés" icon={<CheckCircle2 className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="red" label="Absents" value={String(absents)} sub="signalés" icon={<XCircle className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="amber" label="En attente" value={String(attente)} sub="pas encore émargés" icon={<Clock className="w-4 h-4" />} />
      </div>

      <PresenceBoard affectations={rows} surveillants={surveillants} />
      </>
      )}
    </div>
  );
}
