"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, Download, LayoutGrid, List,
  Map as MapIcon, Maximize2, Minus, Pencil, Plus, Search, Sparkles, Table2, Trash2, X,
} from "lucide-react";
import type { Creneau, Surveillant } from "@/lib/operations/types";
import type { LigneAffectation, VueSession, FiltreLigne } from "@/lib/operations/planification-vue";
import { FILTRES_LIGNES, dureeMinutes, filtrerLignes, heuresFR, lienSession } from "@/lib/operations/planification-vue";
import { dateFR } from "@/lib/operations/format";
import { toCSV } from "@/lib/operations/csv";
import { updateAffectation, deleteAffectation, type AffectationFields } from "@/app/actions/affectations";
import { showToast } from "@/components/Toast";
import { Button } from "@/components/ops/Button";
import { SessionEnTete } from "./SessionEnTete";
import { EtapesNav } from "./EtapesNav";

// PAGE 2 — PLANIFIER (prompt §6). Le tableau et la chronologie occupent
// l'essentiel de la surface ; les alertes sont portées par la ligne concernée
// (jamais un gros bloc d'alertes ici) et le copilote reste dans un rail replié.

const MATIN = "#0E9384";
const APM = "#155EEF";
const JOUR_DEBUT = 8 * 60;
const JOUR_FIN = 19 * 60;
const AMPLITUDE = JOUR_FIN - JOUR_DEBUT;

const VUES = [
  { cle: "liste", label: "Liste", icone: <List className="w-3.5 h-3.5" /> },
  { cle: "planning", label: "Planning", icone: <Table2 className="w-3.5 h-3.5" /> },
  { cle: "gantt", label: "Gantt", icone: <LayoutGrid className="w-3.5 h-3.5" /> },
  { cle: "carte", label: "Carte", icone: <MapIcon className="w-3.5 h-3.5" /> },
] as const;
type Vue = (typeof VUES)[number]["cle"];

const AVATARS = ["#7A5AF8", "#E31B54", "#155EEF", "#0E9384", "#F79009", "#6941C6", "#039855", "#D92D20"];

function initiales(nom: string): string {
  return nom.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function minutesDepuis(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function Barre({ creneau, couleur, periode }: { creneau: Creneau; couleur: string; periode: string }) {
  const debut = minutesDepuis(creneau.debut);
  const fin = minutesDepuis(creneau.fin);
  if (fin <= debut) return null;
  const gauche = ((debut - JOUR_DEBUT) / AMPLITUDE) * 100;
  const largeur = ((fin - debut) / AMPLITUDE) * 100;
  return (
    <span
      className="absolute top-1 bottom-1 rounded-md flex items-center px-1.5 overflow-hidden"
      style={{ left: `${Math.max(0, gauche)}%`, width: `${Math.min(100 - Math.max(0, gauche), largeur)}%`, background: couleur }}
      title={`${periode} ${creneau.debut} – ${creneau.fin}`}
    >
      <span className="text-[10px] font-semibold text-white whitespace-nowrap leading-none">
        {creneau.debut} – {creneau.fin}
      </span>
    </span>
  );
}

/** Éditeur de créneaux d'une demi-journée — plusieurs créneaux autorisés. */
function EditeurCreneaux({ creneaux, onChange, defaut, teinte, label }: {
  creneaux: Creneau[]; onChange: (c: Creneau[]) => void; defaut: Creneau; teinte: string; label: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-[.8px] mb-1.5" style={{ color: teinte }}>{label}</div>
      <div className="space-y-1.5">
        {creneaux.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="time" value={c.debut} aria-label={`${label} — début du créneau ${i + 1}`}
              onChange={(e) => onChange(creneaux.map((x, j) => (j === i ? { ...x, debut: e.target.value } : x)))}
              className="px-2 py-1.5 rounded-lg border border-[#E6EAF0] text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#155EEF]/25"
            />
            <span className="text-[#98A2B3]" aria-hidden>–</span>
            <input
              type="time" value={c.fin} aria-label={`${label} — fin du créneau ${i + 1}`}
              onChange={(e) => onChange(creneaux.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)))}
              className="px-2 py-1.5 rounded-lg border border-[#E6EAF0] text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-[#155EEF]/25"
            />
            <button
              type="button" onClick={() => onChange(creneaux.filter((_, j) => j !== i))}
              aria-label={`Retirer le créneau ${i + 1} du ${label.toLowerCase()}`}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#F04438] hover:bg-rose-50"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
            {dureeMinutes(c) === 0 && (
              <span className="text-[10.5px] font-semibold text-[#F04438]">fin ≤ début</span>
            )}
          </div>
        ))}
        <button
          type="button" onClick={() => onChange([...creneaux, defaut])}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold hover:underline" style={{ color: teinte }}
        >
          <Plus className="w-3 h-3" aria-hidden />Ajouter un créneau
        </button>
      </div>
    </div>
  );
}

type Edition = { salle: string; matin: Creneau[]; apm: Creneau[] };

export function PlanningWorkspace({
  vue, disponibles,
}: {
  vue: VueSession; disponibles: Surveillant[];
}) {
  const { mission } = vue;
  const [filtre, setFiltre] = useState<FiltreLigne>("tous");
  const [recherche, setRecherche] = useState("");
  const [vueActive, setVueActive] = useState<Vue>("liste");
  const [editions, setEditions] = useState<Record<number, Edition>>({});
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [railOuvert, setRailOuvert] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pending, startTransition] = useTransition();

  const lignes = useMemo(() => filtrerLignes(vue.lignes, filtre, recherche), [vue.lignes, filtre, recherche]);
  const modifiees = Object.keys(editions).length;

  function etatDe(l: LigneAffectation): Edition {
    return editions[l.id] ?? { salle: l.salle, matin: l.matin, apm: l.apm };
  }

  function modifier(l: LigneAffectation, patch: Partial<Edition>) {
    setEditions((prev) => ({ ...prev, [l.id]: { ...etatDe(l), ...patch } }));
  }

  function annuler(l: LigneAffectation) {
    setEditions((prev) => { const n = { ...prev }; delete n[l.id]; return n; });
    setOuverte(null);
  }

  function enregistrer(l: LigneAffectation) {
    const e = etatDe(l);
    const champs: AffectationFields = {
      salle: e.salle.trim() || null,
      matin: e.matin.length > 0, matinDebut: e.matin[0]?.debut ?? null, matinFin: e.matin[0]?.fin ?? null,
      apm: e.apm.length > 0, apmDebut: e.apm[0]?.debut ?? null, apmFin: e.apm[0]?.fin ?? null,
      matinCreneaux: e.matin, apmCreneaux: e.apm,
    };
    startTransition(async () => {
      const r = await updateAffectation(l.id, champs);
      if (r.error) return showToast(r.error, "error");
      showToast(`Affectation de ${l.nom} enregistrée`);
      annuler(l);
    });
  }

  function retirer(l: LigneAffectation) {
    if (!confirm(`Retirer ${l.nom} de cette session ?`)) return;
    startTransition(async () => {
      const r = await deleteAffectation(l.id);
      if (r.error) showToast(r.error, "error");
      else showToast(`${l.nom} retiré de la session`);
    });
  }

  function exporter() {
    const entetes = ["Surveillant", "Rôle", "Salle", "Matin", "Après-midi", "Heures"];
    const corps = vue.lignes.map((l) => [
      l.nom, l.role, l.salle,
      l.matin.map((c) => `${c.debut}-${c.fin}`).join(" | "),
      l.apm.map((c) => `${c.debut}-${c.fin}`).join(" | "),
      heuresFR(l.heures, 2),
    ]);
    const blob = new Blob(["﻿" + toCSV([entetes, ...corps])], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPC_planning_${mission.client}_${mission.dateMission ?? ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Planning exporté (${vue.lignes.length} surveillant(s)).`);
  }

  const largeurTimeline = `${Math.max(320, 5.2 * zoom)}px`;
  const afficheTimeline = vueActive === "liste" || vueActive === "gantt";
  const afficheEdition = vueActive === "liste" || vueActive === "planning";

  return (
    <>
      <EtapesNav missionId={mission.id} alertes={vue.alertes.length} />

      <SessionEnTete
        mission={mission}
        etat={{ nbSalles: vue.nbSalles, nbCreneaux: vue.nbCreneaux, nbAlertes: vue.alertes.length, nbLignes: vue.lignes.length, nbModifiees: modifiees, manqueSurveillants: vue.couverture.manque }}
        disponibles={disponibles}
        variante="compact"
        titre="Affectations & planning"
        actionsSupplementaires={
          <Button variant="secondary" onClick={exporter}>
            <Download className="w-4 h-4" aria-hidden />Exporter
          </Button>
        }
      />

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {/* ── Filtres à compteurs (§6.2) ── */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTRES_LIGNES.map((f) => {
                const actif = filtre === f.cle;
                const n = vue.compteurs[f.cle];
                const alerte = f.cle === "alertes" && n > 0;
                return (
                  <button
                    key={f.cle}
                    type="button"
                    onClick={() => setFiltre(f.cle)}
                    aria-pressed={actif}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                      actif ? "bg-[#155EEF] border-[#155EEF] text-white"
                      : alerte ? "bg-white border-[#FDA29B] text-[#D92D20] hover:border-[#F04438]"
                      : "bg-white border-[#E6EAF0] text-[#667085] hover:border-[#D0D5DD]"
                    }`}
                  >
                    {f.label}
                    <span className={`min-w-[18px] px-1 rounded-md text-[10.5px] font-bold ${actif ? "bg-white/20" : "bg-[#F2F4F7] text-[#667085]"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative ml-auto min-w-[220px] flex-1 max-w-[320px]">
              <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un surveillant, une salle…"
                aria-label="Rechercher un surveillant ou une salle"
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-[#E6EAF0] bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#155EEF]/25"
              />
            </div>
          </div>

          {/* ── Sélecteur de vue (§6.3) ── */}
          <div className="inline-flex items-center rounded-xl border border-[#E6EAF0] bg-white p-0.5 mb-3">
            {VUES.map((v) => (
              <button
                key={v.cle}
                type="button"
                onClick={() => setVueActive(v.cle)}
                aria-pressed={vueActive === v.cle}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                  vueActive === v.cle ? "bg-[#155EEF] text-white" : "text-[#667085] hover:bg-[#F7F9FC]"
                }`}
              >
                {v.icone}{v.label}
              </button>
            ))}
          </div>

          {/* ── Tableau + chronologie (§6.4) ── */}
          <div className="bg-white rounded-2xl border border-[#E6EAF0] shadow-sm overflow-hidden">
            {vueActive === "carte" ? (
              <div className="p-12 text-center text-[13px] text-[#98A2B3] flex flex-col items-center gap-2">
                <MapIcon className="w-8 h-8 text-[#D0D5DD]" aria-hidden />
                Vue carte des salles — bientôt disponible.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: afficheTimeline ? "1100px" : "780px" }}>
                  <caption className="sr-only">
                    Affectations de la session {mission.client} du {dateFR(mission.dateMission)} — {lignes.length} ligne(s) affichée(s).
                  </caption>
                  <thead>
                    <tr className="bg-[#F7F9FC] border-b border-[#E6EAF0]">
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px] w-10">#</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Surveillant</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Rôle</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Salle</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Heures</th>
                      <th scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Statut</th>
                      {afficheTimeline && (
                        <th scope="col" className="text-left px-4 py-2.5" style={{ minWidth: largeurTimeline }}>
                          <span className="sr-only">Chronologie de 08:00 à 19:00</span>
                          <span aria-hidden className="relative block h-4 text-[10px] text-[#98A2B3] font-mono">
                            {[8, 10, 12, 14, 16, 18].map((h) => (
                              <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h * 60 - JOUR_DEBUT) / AMPLITUDE) * 100}%` }}>
                                {String(h).padStart(2, "0")}:00
                              </span>
                            ))}
                          </span>
                        </th>
                      )}
                      <th scope="col" className="px-4 py-2.5 text-right text-[10.5px] font-bold text-[#667085] uppercase tracking-[.8px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.length === 0 && (
                      <tr>
                        <td colSpan={afficheTimeline ? 8 : 7} className="text-center py-12 text-[13px] text-[#98A2B3]">
                          {vue.lignes.length === 0 ? "Aucun surveillant affecté à cette session." : "Aucun surveillant ne correspond au filtre."}
                        </td>
                      </tr>
                    )}
                    {lignes.map((l, i) => {
                      const e = etatDe(l);
                      const dirty = !!editions[l.id];
                      const enEdition = ouverte === l.id;
                      const critique = l.alertes.some((a) => a.niveau === "critique");
                      return (
                        <Fragment key={l.id}>
                          <tr
                            id={`aff-${l.id}`}
                            className={`border-b border-[#F1F3F7] last:border-0 transition-colors ${dirty ? "bg-[#155EEF]/[0.04]" : "hover:bg-[#F7F9FC]"}`}
                          >
                            <td className="px-4 py-3 text-[12px] text-[#98A2B3] tabular-nums">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span aria-hidden className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: AVATARS[i % AVATARS.length] }}>
                                  {initiales(l.nom)}
                                </span>
                                <span className="text-[13px] font-semibold text-[#0F1F3D]">{l.nom}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-md bg-[#F2F4F7] text-[#667085] whitespace-nowrap">{l.role}</span>
                            </td>
                            <td className="px-4 py-3">
                              {l.salle
                                ? <span className="text-[12.5px] font-mono font-semibold text-[#0F1F3D]">{l.salle}</span>
                                : <span className="text-[12px] text-[#F79009] font-semibold">à définir</span>}
                            </td>
                            <td className="px-4 py-3 text-[13px] font-extrabold text-[#0F1F3D] whitespace-nowrap">
                              {l.minutes > 0 ? heuresFR(l.heures, 1) : <span className="text-[#D0D5DD] font-normal">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {critique ? (
                                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#D92D20]">
                                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden />À corriger
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#039855]">
                                  <Check className="w-3.5 h-3.5" aria-hidden />Planifiée
                                </span>
                              )}
                            </td>
                            {afficheTimeline && (
                              <td className="px-4 py-3">
                                <div className="relative h-8 rounded-lg bg-[#F2F4F7] overflow-hidden" style={{ minWidth: largeurTimeline }}>
                                  {l.matin.map((c, j) => <Barre key={`m${j}`} creneau={c} couleur={MATIN} periode="Matin" />)}
                                  {l.apm.map((c, j) => <Barre key={`a${j}`} creneau={c} couleur={APM} periode="Après-midi" />)}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-0.5">
                                {l.alertes.length > 0 && (
                                  <span
                                    title={l.alertes.map((a) => a.texte).join(" · ")}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#D92D20]"
                                  >
                                    <AlertTriangle className="w-4 h-4" aria-hidden />
                                    <span className="sr-only">{l.alertes.length} alerte(s) : {l.alertes.map((a) => a.texte).join(" ; ")}</span>
                                  </span>
                                )}
                                {afficheEdition && (
                                  <button
                                    type="button"
                                    onClick={() => setOuverte(enEdition ? null : l.id)}
                                    aria-expanded={enEdition}
                                    aria-label={`Modifier l'affectation de ${l.nom}`}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#155EEF] hover:bg-[#155EEF]/[0.06] transition-colors"
                                  >
                                    <Pencil className="w-4 h-4" aria-hidden />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => retirer(l)}
                                  disabled={pending}
                                  aria-label={`Retirer ${l.nom} de la session`}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#F04438] hover:bg-rose-50 transition-colors disabled:opacity-40"
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {enEdition && (
                            <tr className="bg-[#F7F9FC] border-b border-[#E6EAF0]">
                              <td colSpan={afficheTimeline ? 8 : 7} className="px-4 py-4">
                                <div className="flex items-start gap-6 flex-wrap">
                                  <div>
                                    <label htmlFor={`salle-${l.id}`} className="block text-[10.5px] font-bold uppercase tracking-[.8px] text-[#667085] mb-1.5">Salle</label>
                                    <input
                                      id={`salle-${l.id}`}
                                      value={e.salle}
                                      onChange={(ev) => modifier(l, { salle: ev.target.value })}
                                      placeholder="ex : A21"
                                      className={`w-[110px] px-2.5 py-2 rounded-lg border text-[12.5px] font-mono focus:outline-none focus:ring-2 focus:ring-[#155EEF]/25 ${e.salle.trim() ? "border-[#E6EAF0]" : "border-[#FEC84B] bg-[#FFFAEB]"}`}
                                    />
                                  </div>
                                  <EditeurCreneaux creneaux={e.matin} onChange={(c) => modifier(l, { matin: c })} defaut={{ debut: "08:00", fin: "12:00" }} teinte={MATIN} label="Matin" />
                                  <EditeurCreneaux creneaux={e.apm} onChange={(c) => modifier(l, { apm: c })} defaut={{ debut: "13:30", fin: "17:30" }} teinte={APM} label="Après-midi" />
                                  <div className="flex items-center gap-2 ml-auto self-end">
                                    <Button variant="secondary" size="sm" onClick={() => annuler(l)}>Annuler</Button>
                                    <Button variant="accent" size="sm" onClick={() => enregistrer(l)} disabled={pending || !dirty}>
                                      <Check className="w-3.5 h-3.5" aria-hidden />Enregistrer
                                    </Button>
                                  </div>
                                </div>
                                {l.alertes.length > 0 && (
                                  <ul className="mt-3 space-y-1">
                                    {l.alertes.map((a, j) => (
                                      <li key={j} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: a.niveau === "critique" ? "#D92D20" : "#B54708" }}>
                                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />{a.texte}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Total collant (§6.6) ── */}
            {vueActive !== "carte" && vue.lignes.length > 0 && (
              <div className="sticky bottom-0 flex items-center justify-between gap-4 px-5 py-3 bg-white border-t border-[#E6EAF0] flex-wrap">
                <span className="text-[12.5px] font-semibold text-[#667085]">
                  {vue.lignes.length} surveillant{vue.lignes.length > 1 ? "s" : ""}
                  {lignes.length !== vue.lignes.length && <span className="text-[#98A2B3]"> · {lignes.length} affiché(s)</span>}
                </span>
                <span className="flex items-baseline gap-2.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[.8px] text-[#98A2B3]">Total heures planifiées</span>
                  <span className="text-[17px] font-extrabold text-[#0F1F3D]">{heuresFR(vue.heuresTotal, 2)}</span>
                </span>
              </div>
            )}
          </div>

          {/* ── Outils de pied de page (§6.9) ── */}
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6EAF0] bg-white px-3 min-h-[40px] text-[12.5px] font-semibold text-[#0F1F3D]">
                <ChevronLeft className="w-4 h-4 text-[#98A2B3]" aria-hidden />
                {dateFR(mission.dateMission)}
                <ChevronRight className="w-4 h-4 text-[#98A2B3]" aria-hidden />
              </span>
              <Link
                href={lienSession("/operations/planification", mission.id)}
                className="inline-flex items-center min-h-[40px] px-3.5 rounded-xl border border-[#E6EAF0] bg-white text-[12.5px] font-semibold text-[#667085] hover:bg-[#F7F9FC] transition-colors"
              >
                Revenir à la synthèse
              </Link>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <div className="inline-flex items-center rounded-xl border border-[#E6EAF0] bg-white">
                <button type="button" onClick={() => setZoom((z) => Math.max(60, z - 20))} aria-label="Réduire la chronologie" className="w-10 h-10 flex items-center justify-center text-[#667085] hover:bg-[#F7F9FC] rounded-l-xl">
                  <Minus className="w-4 h-4" aria-hidden />
                </button>
                <span className="px-2 text-[12px] font-semibold text-[#0F1F3D] tabular-nums">{zoom} %</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(200, z + 20))} aria-label="Agrandir la chronologie" className="w-10 h-10 flex items-center justify-center text-[#667085] hover:bg-[#F7F9FC] rounded-r-xl">
                  <Plus className="w-4 h-4" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById("zone-planning")?.requestFullscreen?.()}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-[#E6EAF0] bg-white text-[12.5px] font-semibold text-[#667085] hover:bg-[#F7F9FC] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden />Plein écran
              </button>
            </div>
          </div>
        </div>

        {/* ── Rail IA — replié par défaut, n'ampute jamais le planning (§6.8) ── */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => setRailOuvert((v) => !v)}
            aria-expanded={railOuvert}
            aria-controls="rail-ia"
            aria-label={`${railOuvert ? "Fermer" : "Ouvrir"} le copilote IA`}
            className="sticky top-4 flex flex-col items-center gap-2 rounded-2xl px-2.5 py-4 text-white shadow-sm transition-opacity hover:opacity-95"
            style={{ background: "linear-gradient(180deg, #6941C6, #7A5AF8)" }}
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            {vue.alertes.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#F04438] text-white text-[10px] font-bold flex items-center justify-center">
                {vue.alertes.length > 9 ? "9+" : vue.alertes.length}
              </span>
            )}
            <ChevronLeft className={`w-4 h-4 transition-transform ${railOuvert ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* Tiroir copilote */}
      {railOuvert && (
        <div role="dialog" aria-modal="true" aria-label="Copilote IA" className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/30" onClick={() => setRailOuvert(false)} />
          <aside id="rail-ia" className="relative w-full max-w-[380px] h-full bg-white shadow-xl p-5 overflow-y-auto animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[15px] font-extrabold text-[#0F1F3D]">Copilote IA</h2>
                <p className="text-[12px] text-[#667085]">Aperçu — le détail complet est sur la page Optimiser.</p>
              </div>
              <button type="button" onClick={() => setRailOuvert(false)} aria-label="Fermer le copilote" className="w-10 h-10 flex items-center justify-center rounded-xl text-[#98A2B3] hover:bg-[#F7F9FC]">
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <ul className="space-y-2.5">
              {vue.suggestions.slice(0, 4).map((s) => (
                <li key={s.id} className="rounded-xl border border-[#E6EAF0] p-3">
                  <p className="text-[13px] font-bold text-[#0F1F3D]">{s.titre}</p>
                  <p className="text-[11.5px] text-[#667085] mt-0.5">{s.detail}</p>
                </li>
              ))}
              {vue.suggestions.length === 0 && (
                <li className="text-[12.5px] text-[#039855] font-semibold">Aucune optimisation détectée — session saine.</li>
              )}
            </ul>
            <Link
              href={lienSession("/operations/planification/copilote", mission.id)}
              className="mt-4 inline-flex items-center justify-center w-full min-h-[40px] rounded-xl text-white text-[12.5px] font-semibold"
              style={{ background: "linear-gradient(90deg, #6941C6, #7A5AF8)" }}
            >
              Ouvrir le copilote complet
            </Link>
          </aside>
        </div>
      )}
    </>
  );
}
