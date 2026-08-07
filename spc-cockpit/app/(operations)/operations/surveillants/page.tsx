export const dynamic = "force-dynamic";

import { getSurveillants, getAffectations, getMissions } from "@/lib/operations/queries";
import { getInvitationStatuses } from "@/lib/supabase/portail";
import { SurveillantsWorkspace, type MissionInfo } from "@/components/ops/surveillants/Workspace";
import { SurveillantsImportExport } from "@/components/ops/SurveillantsImportExport";
import { InvitationsPanel } from "@/components/ops/InvitationsPanel";
import { OPS_CONTENT_CLASS } from "@/components/ops/shell";
import { SEUIL_SURCHARGE_H } from "@/lib/operations/constants";
import { computeMissionKpis, heuresAffectation, aUnCreneau } from "@/lib/operations/disponibilites";
import { dateFR } from "@/lib/operations/format";
import type { Affectation } from "@/lib/operations/types";
import type { SurvRow, CreneauLigne, PortailStatut } from "@/components/ops/surveillants/types";

// Créneaux détaillés d'une affectation (onglet Planning du profil).
function creneauxDe(a: Affectation, missionRef?: string): CreneauLigne[] {
  const out: CreneauLigne[] = [];
  const matin = a.matinCreneaux?.length ? a.matinCreneaux : a.matin ? [{ debut: a.matinDebut, fin: a.matinFin }] : [];
  const apm = a.apmCreneaux?.length ? a.apmCreneaux : a.apm ? [{ debut: a.apmDebut, fin: a.apmFin }] : [];
  for (const c of matin) out.push({ periode: "matin", debut: c.debut, fin: c.fin, salle: a.salle, missionRef });
  for (const c of apm) out.push({ periode: "apm", debut: c.debut, fin: c.fin, salle: a.salle, missionRef });
  return out;
}

export default async function SurveillantsPage() {
  const [surveillants, affectations, missions, invitations] = await Promise.all([
    getSurveillants(),
    getAffectations(),
    getMissions(),
    getInvitationStatuses(),
  ]);

  // Mission active : même priorité que le shell (En cours → Validée → Planifiée).
  const active =
    missions.find((m) => m.statut === "En cours") ??
    missions.find((m) => m.statut === "Validée") ??
    missions.find((m) => m.statut === "Planifiée") ??
    missions[0] ?? null;

  const missionAffectations = active ? affectations.filter((a) => a.missionId === active.id) : [];

  // Index utiles.
  const portailById = new Map<number, PortailStatut>(invitations.map((i) => [i.id, i.statut]));
  const heuresById = new Map<number, number>();
  const creneauxById = new Map<number, CreneauLigne[]>();
  const affecteIds = new Set<number>();
  for (const a of missionAffectations) {
    heuresById.set(a.surveillantId, (heuresById.get(a.surveillantId) ?? 0) + heuresAffectation(a));
    const prev = creneauxById.get(a.surveillantId) ?? [];
    creneauxById.set(a.surveillantId, [...prev, ...creneauxDe(a, active?.reference)]);
    if (aUnCreneau(a)) affecteIds.add(a.surveillantId);
  }

  // Lignes enrichies.
  const rows: SurvRow[] = surveillants.map((s) => ({
    ...s,
    portail: portailById.get(s.id) ?? "non_invite",
    missionClient: affecteIds.has(s.id) && active ? active.client : null,
    heuresPlanifiees: Math.round(heuresById.get(s.id) ?? 0),
    creneaux: creneauxById.get(s.id) ?? [],
  }));

  // KPIs de la mission active.
  const kpis = computeMissionKpis({
    missionRequis: active?.nbSurveillants ?? 0,
    affectations: missionAffectations,
    surveillants,
    seuilSurcharge: SEUIL_SURCHARGE_H,
  });

  const mission: MissionInfo | null = active
    ? {
        client: active.client,
        dateLabel: dateFR(active.dateMission),
        session: active.session,
        reference: active.reference,
        nbSalles: active.nbSalles,
        jourISO: active.dateMission,
      }
    : null;

  // Mois par défaut du calendrier : celui de la mission active, sinon le mois courant.
  const ref = active?.dateMission ? new Date(active.dateMission + "T00:00:00") : new Date();
  const defaultAnnee = ref.getFullYear();
  const defaultMois = ref.getMonth();
  const aujourdhuiISO = new Date().toISOString().slice(0, 10);

  // Dates de toutes les missions → placement réel des affectations dans le calendrier.
  const missionDates: Record<number, string | undefined> = {};
  for (const m of missions) missionDates[m.id] = m.dateMission;

  // Salles déjà affectées (cross-check à l'import).
  const sallesBySurvId = new Map<number, Set<string>>();
  for (const a of affectations) {
    if (!a.salle) continue;
    const set = sallesBySurvId.get(a.surveillantId) ?? new Set<string>();
    set.add(a.salle);
    sallesBySurvId.set(a.surveillantId, set);
  }
  const assignments = surveillants
    .map((s) => ({ nom: s.nom, salles: [...(sallesBySurvId.get(s.id) ?? [])] }))
    .filter((a) => a.salles.length > 0);

  return (
    <div className={OPS_CONTENT_CLASS}>
      <SurveillantsWorkspace
        rows={rows}
        affectations={affectations}
        missionDates={missionDates}
        kpis={kpis}
        mission={mission}
        defaultAnnee={defaultAnnee}
        defaultMois={defaultMois}
        aujourdhuiISO={aujourdhuiISO}
      />

      {/* Import / Export Excel-CSV (après les alertes) */}
      <div id="import-export">
        <SurveillantsImportExport surveillants={surveillants} assignments={assignments} />
      </div>

      {/* Accès portail surveillant — invitations */}
      <div id="invitations-panel">
        <InvitationsPanel rows={invitations} />
      </div>
    </div>
  );
}
