export const dynamic = "force-dynamic";

import Link from "next/link";
import { Bell, ChevronDown, Calendar, FileText } from "lucide-react";
import { requireActiveOrgId } from "@/lib/auth/org";
import { getCurrentUser, getCurrentRole } from "@/lib/auth/session";
import { getSalles, getIncidents, getMissions, getAffectations } from "@/lib/operations/queries";
import { construireVueSalles } from "@/lib/operations/salles-view";
import { dateFR } from "@/lib/operations/format";
import {
  COMMAND_CSS, CommandSidebar, initialesNom, nomDepuisEmail, libelleRole,
} from "@/components/ops/command/shell";
import { SallesCommandCenter } from "@/components/ops/salles/SallesCommandCenter";
import { BandeauDemo, BandeauSource } from "@/components/ops/EtatSource";
import { origineGlobale, premiereErreur } from "@/lib/operations/source";
import { couvertureSession } from "@/lib/operations/couverture";
import { SALLES_CSS } from "@/components/ops/salles/styles";
import { Toaster } from "@/components/Toast";

export default async function SallesPage() {
  await requireActiveOrgId();

  // Les lectures portent désormais leur ORIGINE (base / demo / vide / erreur) :
  // elles n'échouent plus silencieusement vers un jeu de démonstration, et les
  // exceptions sont déjà capturées dans queries.ts.
  const [jSalles, jIncidents, jMissions, jAffectations] = await Promise.all([
    getSalles(), getIncidents(), getMissions(), getAffectations(),
  ]);
  const incidentsOuverts = jIncidents.lignes.filter((i) => i.statut !== "Résolu").length;

  const active =
    jMissions.lignes.find((m) => m.statut === "En cours") ??
    jMissions.lignes.find((m) => m.statut === "Validée") ??
    jMissions.lignes.find((m) => m.statut === "Planifiée");

  // La couverture affichée ici est celle de la SESSION, pas un ratio local :
  // la page Salles répondait « manque 3 » quand les quatre autres écrans
  // répondaient « manque 4 » (audit QA forensic V2, BUG-005).
  // Les affectations sont transmises pour que la page puisse rapprocher le
  // référentiel du planning : sans elles, une salle citée au planning et absente
  // du référentiel resterait invisible (audit QA forensic V2, BUG-004).
  const view = construireVueSalles(
    jSalles.lignes,
    active
      ? {
          couverture: couvertureSession(active, jAffectations.lignes),
          affectations: jAffectations.lignes.filter((a) => a.missionId === active.id),
        }
      : undefined,
  );
  const missionLabel = active
    ? `${active.client} — ${dateFR(active.dateMission)}`
    : "Aucune mission active";

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

        <div style={{ padding: "0 26px" }}>
          {/* Bandeau de démonstration rendu ici : cet écran vit dans le groupe
              (ops-cockpit), qui n'a pas de layout propre pour le porter. */}
          {origineGlobale(jSalles, jIncidents, jMissions) === "demo" && <BandeauDemo />}
          <BandeauSource
            origine={origineGlobale(jSalles, jIncidents, jMissions)}
            detail={premiereErreur(jSalles, jIncidents, jMissions)}
          />
        </div>

        <SallesCommandCenter view={view} />
      </div>

      <Toaster />
    </div>
  );
}
