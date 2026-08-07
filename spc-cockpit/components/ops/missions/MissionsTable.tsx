"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Eye, FileSpreadsheet, Pencil, Plus } from "lucide-react";
import type { LigneMission } from "@/lib/operations/missions-dashboard";
import type { Mission, StatutMission } from "@/lib/operations/types";
import { createMission, deleteMission, updateMission } from "@/app/actions/missions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MissionBadge } from "@/components/ops/badges";
import { showToast } from "@/components/Toast";
import { dateFR, euro } from "@/lib/operations/format";
import { toCSV } from "@/lib/operations/csv";
import {
  FILTRES_VIDES, filtrerMissions, filtresActifs, trierMissions,
  type CleTri, type FiltresMissions,
} from "@/lib/operations/missions-filtres";
import { MissionsToolbar } from "./MissionsToolbar";
import { MissionForm, nextReference } from "./MissionForm";
import { MissionActionsMenu } from "./MissionActionsMenu";
import { MissionDetailsDialog } from "./MissionDetailsDialog";
import { useDemandeNouvelleMission } from "./NouvelleMissionBouton";
import { ProgressBar } from "./Charts";

// Tableau des missions (§14). Dense mais lisible : en-tête collant, tri,
// chargement progressif, ligne active identifiée, actions compactes et
// suppression reléguée au menu secondaire avec confirmation explicite.
// Le CRUD passe par les Server Actions existantes, inchangées.

const PAR_PAGE = 15;

type Dialogue =
  | { mode: "create" }
  | { mode: "edit"; mission: Mission }
  | { mode: "delete"; mission: Mission }
  | null;

function couleurAvancement(valeur: number, statut: StatutMission): string {
  if (statut === "Annulée") return "#B8C4D9";
  if (valeur >= 100) return "#13B979";
  if (valeur < 40) return "#FF842B";
  return "#4F46F5";
}

function EnteteTriable({
  libelle, cle, tri, onTri, className = "",
}: {
  libelle: string; cle: CleTri; tri: { cle: CleTri; sens: "asc" | "desc" }; onTri: (c: CleTri) => void; className?: string;
}) {
  const actif = tri.cle === cle;
  const Icone = !actif ? ChevronsUpDown : tri.sens === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={actif ? (tri.sens === "asc" ? "ascending" : "descending") : "none"}
      className={`text-left px-4 py-2.5 text-[10.5px] font-bold text-[#8D97AA] uppercase tracking-[0.8px] ${className}`}
    >
      <button
        type="button"
        onClick={() => onTri(cle)}
        className="inline-flex items-center gap-1 hover:text-[#11182D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
      >
        {libelle}
        <Icone className={`w-3 h-3 ${actif ? "text-[#4F46F5]" : "text-[#C3CBDA]"}`} aria-hidden />
      </button>
    </th>
  );
}

function effectif(ligne: LigneMission): string {
  // Sans affectation enregistrée, on affiche l'effectif requis : « 0/9 » ferait
  // croire à un sous-effectif alors que la donnée n'est simplement pas suivie.
  return ligne.affectationsSuivies > 0
    ? `${ligne.surveillantsAffectes}/${ligne.mission.nbSurveillants} surv.`
    : `${ligne.mission.nbSurveillants} surv.`;
}

function Volume({ ligne }: { ligne: LigneMission }) {
  const m = ligne.mission;
  return (
    <>
      <span className="block text-[12.5px] text-[#11182D]">
        {m.nbSalles} salle{m.nbSalles > 1 ? "s" : ""} · {effectif(ligne)}
      </span>
      {ligne.candidats != null && (
        <span className="block text-[11px] text-[#8D97AA]">{ligne.candidats} candidats</span>
      )}
    </>
  );
}

function Avancement({ ligne }: { ligne: LigneMission }) {
  return (
    <div className="flex items-center gap-2 min-w-[112px]">
      <ProgressBar valeur={ligne.avancement} couleur={couleurAvancement(ligne.avancement, ligne.mission.statut)} />
      <span className="text-[11.5px] font-bold text-[#64708A] w-12 text-right tabular-nums whitespace-nowrap">{ligne.avancement} %</span>
    </div>
  );
}

export function MissionsTable({ lignes, missionActiveId }: { lignes: LigneMission[]; missionActiveId?: number | null }) {
  const [filtres, setFiltres] = useState<FiltresMissions>(FILTRES_VIDES);
  const [tri, setTri] = useState<{ cle: CleTri; sens: "asc" | "desc" }>({ cle: "date", sens: "desc" });
  const [visibles, setVisibles] = useState(PAR_PAGE);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [fiche, setFiche] = useState<LigneMission | null>(null);
  const [pending, startTransition] = useTransition();

  useDemandeNouvelleMission(useCallback(() => setDialogue({ mode: "create" }), []));

  const missions = useMemo(() => lignes.map((l) => l.mission), [lignes]);
  const clients = useMemo(() => [...new Set(missions.map((m) => m.client))].sort((a, b) => a.localeCompare(b, "fr")), [missions]);

  const filtrees = useMemo(() => trierMissions(filtrerMissions(lignes, filtres), tri.cle, tri.sens), [lignes, filtres, tri]);
  const affichees = filtrees.slice(0, visibles);

  function changerTri(cle: CleTri) {
    setTri((t) => (t.cle === cle ? { cle, sens: t.sens === "asc" ? "desc" : "asc" } : { cle, sens: cle === "date" ? "desc" : "asc" }));
  }

  function formData(m: Mission, patch: Partial<Record<string, string | number>> = {}): FormData {
    const fd = new FormData();
    const base: Record<string, string> = {
      reference: m.reference,
      client: m.client,
      session: m.session ?? "",
      date_mission: m.dateMission ?? "",
      type: m.type,
      nb_salles: String(m.nbSalles),
      nb_surveillants: String(m.nbSurveillants),
      montant_ht: String(m.montantHT),
      statut: m.statut,
    };
    for (const [k, v] of Object.entries({ ...base, ...patch })) fd.set(k, String(v));
    return fd;
  }

  function soumettre(fd: FormData) {
    if (!dialogue || dialogue.mode === "delete") return;
    startTransition(async () => {
      const result = dialogue.mode === "edit" ? await updateMission(dialogue.mission.id, fd) : await createMission(fd);
      if (result.error) return showToast(result.error, "error");
      showToast(dialogue.mode === "edit" ? `${fd.get("reference")} mise à jour` : `Mission ${fd.get("reference")} créée`);
      setDialogue(null);
    });
  }

  function dupliquer(m: Mission) {
    const reference = nextReference(missions);
    startTransition(async () => {
      const result = await createMission(formData(m, { reference, statut: "Brouillon" }));
      if (result.error) return showToast(result.error, "error");
      showToast(`Mission dupliquée sous la référence ${reference}`);
    });
  }

  function changerStatut(m: Mission, statut: StatutMission) {
    startTransition(async () => {
      const result = await updateMission(m.id, formData(m, { statut }));
      if (result.error) return showToast(result.error, "error");
      showToast(`${m.reference} — statut « ${statut} »`);
    });
  }

  function supprimer(m: Mission) {
    startTransition(async () => {
      const result = await deleteMission(m.id);
      if (result.error) return showToast(result.error, "error");
      showToast(`${m.reference} supprimée`);
      setDialogue(null);
    });
  }

  /** Exporte exactement ce qui est visible à l'écran (filtres et tri compris). */
  function exporter(selection: LigneMission[], nom: string) {
    const entetes = ["Référence", "Client", "Session", "Date", "Type", "Salles", "Surveillants affectés", "Surveillants requis", "Candidats", "Montant HT", "Statut", "Avancement %"];
    const corps = selection.map((l) => [
      l.mission.reference, l.mission.client, l.mission.session ?? "", l.mission.dateMission ?? "", l.mission.type,
      l.mission.nbSalles, l.surveillantsAffectes, l.mission.nbSurveillants, l.candidats ?? "",
      l.mission.montantHT, l.mission.statut, l.avancement,
    ]);
    const blob = new Blob(["﻿" + toCSV([entetes, ...corps])], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nom}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${selection.length} mission(s) exportée(s)`);
  }

  const vide = filtrees.length === 0;

  return (
    <>
      <MissionsToolbar
        filtres={filtres}
        onChange={(f) => { setFiltres(f); setVisibles(PAR_PAGE); }}
        clients={clients}
        onNouvelle={() => setDialogue({ mode: "create" })}
        nbResultats={filtrees.length}
        nbTotal={lignes.length}
      />

      <div className="bg-white rounded-2xl border border-[#E3E8F1] shadow-[0_4px_14px_rgba(15,34,68,0.06)] overflow-hidden">
        {/* Desktop / tablette : tableau */}
        <div className="hidden md:block overflow-x-auto max-h-[720px]">
          <table className="w-full border-collapse min-w-[1040px]">
            <caption className="sr-only">
              Liste des missions — {filtrees.length} résultat(s) sur {lignes.length}.
            </caption>
            <thead className="sticky top-0 z-10 bg-[#F9FAFD] shadow-[0_1px_0_#E3E8F1]">
              <tr>
                <EnteteTriable libelle="Référence" cle="reference" tri={tri} onTri={changerTri} />
                <EnteteTriable libelle="Client" cle="client" tri={tri} onTri={changerTri} />
                <EnteteTriable libelle="Date" cle="date" tri={tri} onTri={changerTri} />
                <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#8D97AA] uppercase tracking-[0.8px]">Type</th>
                <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#8D97AA] uppercase tracking-[0.8px]">Volume</th>
                <EnteteTriable libelle="Montant HT" cle="montant" tri={tri} onTri={changerTri} />
                <EnteteTriable libelle="Statut" cle="statut" tri={tri} onTri={changerTri} />
                <EnteteTriable libelle="Avancement" cle="avancement" tri={tri} onTri={changerTri} />
                <th scope="col" className="text-right px-4 py-2.5 text-[10.5px] font-bold text-[#8D97AA] uppercase tracking-[0.8px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vide && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <p className="text-[13px] font-semibold text-[#11182D]">
                      {filtresActifs(filtres) ? "Aucune mission ne correspond aux filtres." : "Aucune mission enregistrée."}
                    </p>
                    <p className="text-[12px] text-[#8D97AA] mt-1">
                      {filtresActifs(filtres) ? "Ajustez la recherche, le statut ou la période." : "Créez votre première mission pour démarrer le pilotage."}
                    </p>
                    {!filtresActifs(filtres) && (
                      <button
                        type="button"
                        onClick={() => setDialogue({ mode: "create" })}
                        className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 px-4 rounded-xl text-white text-[12.5px] font-semibold bg-gradient-to-r from-[#3156F5] to-[#6548F6] hover:opacity-95 transition-opacity"
                      >
                        <Plus className="w-4 h-4" aria-hidden />
                        Créer une mission
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {affichees.map((l) => {
                const m = l.mission;
                const active = m.id === missionActiveId;
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-[#EDF0F5] last:border-0 transition-colors hover:bg-[#F6F8FC] ${active ? "bg-[#F7F6FF]" : ""}`}
                  >
                    <td className={`px-4 py-3 text-[12px] font-mono text-[#64708A] whitespace-nowrap ${active ? "border-l-[3px] border-l-[#4F46F5] pl-[13px]" : ""}`}>
                      {m.reference}
                      {active && <span className="sr-only"> — mission active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-[13px] font-bold text-[#11182D]">{m.client}</span>
                      {m.session && <span className="block text-[11.5px] text-[#8D97AA]">{m.session}</span>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[#64708A] whitespace-nowrap">{dateFR(m.dateMission)}</td>
                    <td className="px-4 py-3 text-[12.5px] text-[#64708A] whitespace-nowrap">{m.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><Volume ligne={l} /></td>
                    <td className="px-4 py-3 text-[13px] font-extrabold text-[#11182D] whitespace-nowrap">{euro(m.montantHT)}</td>
                    <td className="px-4 py-3"><MissionBadge statut={m.statut} /></td>
                    <td className="px-4 py-3"><Avancement ligne={l} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setFiche(l)}
                          aria-label={`Voir le détail de la mission ${m.reference}`}
                          className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8D97AA] hover:text-[#4F46F5] hover:bg-[#ECEBFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <Eye className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDialogue({ mode: "edit", mission: m })}
                          aria-label={`Modifier la mission ${m.reference}`}
                          className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8D97AA] hover:text-[#4F46F5] hover:bg-[#ECEBFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </button>
                        <MissionActionsMenu
                          mission={m}
                          onDupliquer={() => dupliquer(m)}
                          onStatut={(s) => changerStatut(m, s)}
                          onExporter={() => exporter([l], `mission-${m.reference}`)}
                          onSupprimer={() => setDialogue({ mode: "delete", mission: m })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile : cartes lisibles, aucun débordement horizontal */}
        <ul className="md:hidden divide-y divide-[#EDF0F5]">
          {vide && (
            <li className="px-4 py-10 text-center text-[12.5px] text-[#8D97AA]">
              {filtresActifs(filtres) ? "Aucune mission ne correspond aux filtres." : "Aucune mission enregistrée."}
            </li>
          )}
          {affichees.map((l) => {
            const m = l.mission;
            const active = m.id === missionActiveId;
            return (
              <li key={m.id} className={`px-4 py-3.5 ${active ? "bg-[#F7F6FF] border-l-[3px] border-l-[#4F46F5]" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-[#8D97AA]">{m.reference}</p>
                    <p className="text-[14px] font-bold text-[#11182D] truncate">{m.client}</p>
                    {m.session && <p className="text-[11.5px] text-[#8D97AA] truncate">{m.session}</p>}
                  </div>
                  <MissionBadge statut={m.statut} />
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5 text-[12px]">
                  <div className="flex gap-1.5"><dt className="text-[#8D97AA]">Date</dt><dd className="text-[#11182D]">{dateFR(m.dateMission)}</dd></div>
                  <div className="flex gap-1.5"><dt className="text-[#8D97AA]">Montant</dt><dd className="font-bold text-[#11182D]">{euro(m.montantHT)}</dd></div>
                  <div className="col-span-2 flex gap-1.5"><dt className="text-[#8D97AA]">Volume</dt><dd className="text-[#11182D]">{m.nbSalles} salles · {effectif(l)}</dd></div>
                </dl>
                <div className="mt-2.5"><Avancement ligne={l} /></div>
                <div className="flex items-center justify-end gap-0.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setFiche(l)}
                    aria-label={`Voir le détail de la mission ${m.reference}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8D97AA] hover:text-[#4F46F5] hover:bg-[#ECEBFF] transition-colors"
                  >
                    <Eye className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialogue({ mode: "edit", mission: m })}
                    aria-label={`Modifier la mission ${m.reference}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8D97AA] hover:text-[#4F46F5] hover:bg-[#ECEBFF] transition-colors"
                  >
                    <Pencil className="w-4 h-4" aria-hidden />
                  </button>
                  <MissionActionsMenu
                    mission={m}
                    onDupliquer={() => dupliquer(m)}
                    onStatut={(s) => changerStatut(m, s)}
                    onExporter={() => exporter([l], `mission-${m.reference}`)}
                    onSupprimer={() => setDialogue({ mode: "delete", mission: m })}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pied : chargement progressif + export de la sélection courante */}
        {!vide && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-[#EDF0F5] bg-[#F9FAFD]">
            <p className="text-[11.5px] text-[#64708A]">
              {Math.min(visibles, filtrees.length)} mission(s) affichée(s) sur {filtrees.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exporter(filtrees, "missions")}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-xl border border-[#E3E8F1] bg-white text-[12px] font-semibold text-[#64708A] hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden />
                Exporter la sélection
              </button>
              {visibles < filtrees.length && (
                <button
                  type="button"
                  onClick={() => setVisibles((v) => v + PAR_PAGE)}
                  className="min-h-[40px] px-3.5 rounded-xl border border-[#E3E8F1] bg-white text-[12px] font-semibold text-[#4F46F5] hover:bg-[#ECEBFF] transition-colors"
                >
                  Afficher {Math.min(PAR_PAGE, filtrees.length - visibles)} de plus
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Création / édition */}
      <Dialog open={dialogue?.mode === "create" || dialogue?.mode === "edit"} onOpenChange={(v) => !v && setDialogue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogue?.mode === "edit" ? `Modifier — ${dialogue.mission.reference}` : "Nouvelle mission"}
            </DialogTitle>
          </DialogHeader>
          {(dialogue?.mode === "create" || dialogue?.mode === "edit") && (
            <MissionForm
              initial={dialogue.mode === "edit" ? dialogue.mission : undefined}
              suggestedRef={nextReference(missions)}
              pending={pending}
              onSubmit={soumettre}
              onCancel={() => setDialogue(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <Dialog open={dialogue?.mode === "delete"} onOpenChange={(v) => !v && setDialogue(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la mission ?</DialogTitle>
          </DialogHeader>
          {dialogue?.mode === "delete" && (
            <>
              <p className="text-[13px] text-[#64708A]">
                La mission <strong className="text-[#11182D]">{dialogue.mission.reference}</strong> ({dialogue.mission.client})
                sera définitivement supprimée. Cette action est irréversible.
              </p>
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setDialogue(null)}
                  className="flex-1 min-h-[40px] rounded-xl border border-[#E3E8F1] text-[12.5px] font-semibold text-[#64708A] hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => supprimer(dialogue.mission)}
                  className="flex-1 min-h-[40px] rounded-xl bg-[#FF3E4D] text-white text-[12.5px] font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity"
                >
                  {pending ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Fiche détaillée */}
      <MissionDetailsDialog
        mission={fiche?.mission ?? null}
        details={fiche ? { avancement: fiche.avancement, surveillantsAffectes: fiche.surveillantsAffectes, affectationsSuivies: fiche.affectationsSuivies, candidats: fiche.candidats } : undefined}
        onClose={() => setFiche(null)}
      />
    </>
  );
}
