export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bell, ChevronDown, Calendar, FileText } from "lucide-react";
import { requireActiveOrgId } from "@/lib/auth/org";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/session";
import { getSalles, getIncidents, getMissions } from "@/lib/operations/queries";
import { construireVueSalles } from "@/lib/operations/salles-view";
import { dateFR } from "@/lib/operations/format";
import {
  COMMAND_CSS, CommandSidebar, initialesNom, nomDepuisEmail, libelleRole,
} from "@/components/ops/command/shell";
import { SallesCommandCenter } from "@/components/ops/salles/SallesCommandCenter";
import { SALLES_CSS } from "@/components/ops/salles/styles";
import { Toaster } from "@/components/Toast";

export default async function SallesPage() {
  await requireActiveOrgId();

  // Récupération résiliente : sans Supabase configuré (démo / preview), les
  // requêtes retombent sur le jeu de référence plutôt que de renvoyer une 500.
  let view = construireVueSalles([]);
  try {
    view = construireVueSalles(await getSalles());
  } catch {
    /* jeu de démonstration */
  }

  let incidentsOuverts = 0;
  try {
    const incidents = await getIncidents();
    incidentsOuverts = incidents.filter((i) => i.statut !== "Résolu").length;
  } catch {
    /* pas d'incidents en démo */
  }

  let missionLabel = "Aucune mission active";
  try {
    const missions = await getMissions();
    const active =
      missions.find((m) => m.statut === "En cours") ??
      missions.find((m) => m.statut === "Validée") ??
      missions.find((m) => m.statut === "Planifiée");
    if (active) missionLabel = `${active.client} — ${dateFR(active.dateMission)}`;
  } catch {
    /* libellé par défaut */
  }

  let userName = "Coordinateur SPC";
  let roleLabel = "Coordinateur";
  try {
    const [user, role] = await Promise.all([getCurrentUser(), getCurrentRole()]);
    userName = nomDepuisEmail(user?.email);
    roleLabel = libelleRole(role);
  } catch {
    /* identité par défaut */
  }

  return (
    <div className="ckp">
      <style dangerouslySetInnerHTML={{ __html: COMMAND_CSS + SALLES_CSS }} />

      <CommandSidebar actif="/operations/salles" missionLabel={missionLabel} incidentsOuverts={incidentsOuverts} />

      <div className="main">
        <header className="hdr">
          <div>
            <h1 className="ttl">Salles</h1>
            <div className="subttl">Centre de commandement des capacités et affectations</div>
          </div>
          <div className="right">
            <div className="toprow">
              <div className="bell">
                <Bell className="w-[18px] h-[18px]" aria-hidden />
                {incidentsOuverts > 0 ? <span className="b">{incidentsOuverts}</span> : null}
              </div>
              <div className="usr">
                <span className="av">{initialesNom(userName)}</span>
                <div>
                  <div className="nm">{userName}</div>
                  <div className="rl">{roleLabel}</div>
                </div>
                <ChevronDown className="w-4 h-4" aria-hidden />
              </div>
            </div>
            <div className="btns">
              <Link href="/operations/planification" className="btn btn-sec">
                <Calendar className="w-[15px] h-[15px]" aria-hidden />Planification
              </Link>
              <Link href="/operations/devis" className="btn btn-pri">
                <FileText className="w-[15px] h-[15px]" aria-hidden />Nouveau devis
              </Link>
            </div>
          </div>
        </header>

        <SallesCommandCenter view={view} />
      </div>

      <Toaster />
    </div>
  );
}
