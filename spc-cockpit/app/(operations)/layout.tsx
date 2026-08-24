import { OpsSidebar, OpsMobileHeader } from "@/components/ops/OpsSidebar";
import { OpsTopbar, type MissionOption } from "@/components/ops/OpsTopbar";
import { Toaster } from "@/components/Toast";
import { BandeauDemo } from "@/components/ops/EtatSource";
import { getMissions, getIncidents } from "@/lib/operations/queries";
import { dateFR, dateCourteFR } from "@/lib/operations/format";
import { selectionnerMissionActive } from "@/lib/operations/missions-dashboard";
import { getMyOrganizations, getActiveOrgId, requireActiveOrgId } from "@/lib/auth/org";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/session";

function nomDepuisEmail(email?: string | null): string {
  if (!email) return "Utilisateur SPC";
  const local = email.split("@")[0] ?? "";
  const mots = local.split(/[._-]+/).filter(Boolean).map((m) => m.charAt(0).toUpperCase() + m.slice(1));
  return mots.join(" ") || "Utilisateur SPC";
}

function libelleRole(role: string | null): string {
  if (!role) return "Administrateur";
  const r = role.toLowerCase();
  if (r.includes("admin")) return "Administrateur";
  if (r.includes("edit") || r.includes("édit")) return "Éditeur";
  if (r.includes("lect") || r.includes("read")) return "Lecture seule";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  // Exige une organisation active (→ /onboarding au premier login).
  await requireActiveOrgId();

  const [jeuMissions, jeuIncidents, orgs, activeOrgId, user, role] = await Promise.all([
    getMissions(),
    getIncidents(),
    getMyOrganizations(),
    getActiveOrgId(),
    getCurrentUser(),
    getCurrentRole(),
  ]);
  const missions = jeuMissions.lignes;
  const incidents = jeuIncidents.lignes;
  // Le jeu de démonstration est global (SPC_DEMO=1) : on le signale UNE fois
  // dans le cadre applicatif plutôt que sur chacun des 14 écrans.
  const demo = jeuMissions.origine === "demo";

  // Même sélection que la page Missions (source unique, cf. missions-dashboard).
  const active = selectionnerMissionActive(missions);
  const activeMissionLabel = active ? `${active.client} — ${dateFR(active.dateMission)}` : null;

  // Missions du sélecteur : les plus récentes (mission active en tête).
  const missionOptions: MissionOption[] = [...missions]
    .sort((a, b) => (a.dateMission ?? "") < (b.dateMission ?? "") ? 1 : -1)
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      label: m.client,
      sub: `${m.session ?? m.reference} · ${dateCourteFR(m.dateMission)}`,
      href: "/operations/missions",
      active: m.id === active?.id,
    }));

  const openIncidents = incidents.filter((i) => i.statut !== "Résolu").length;
  const orgOptions = orgs.map((o) => ({ orgId: o.orgId, nom: o.nom, role: o.role }));

  return (
    <div className="flex h-dvh overflow-hidden flex-col md:flex-row" style={{ background: "#F6F8FC" }}>
      <OpsMobileHeader />
      <OpsSidebar openIncidents={openIncidents} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <OpsTopbar
          orgs={orgOptions}
          activeOrgId={activeOrgId}
          missions={missionOptions}
          activeMissionLabel={activeMissionLabel}
          userName={nomDepuisEmail(user?.email)}
          roleLabel={libelleRole(role)}
          notifCount={openIncidents}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {demo && (
            <div className="px-5 md:px-7 pt-5 w-full max-w-[1560px] mx-auto">
              <BandeauDemo />
            </div>
          )}
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
