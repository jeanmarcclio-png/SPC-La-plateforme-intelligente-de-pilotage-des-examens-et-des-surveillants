"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search, Plus, CalendarRange, SlidersHorizontal, ArrowUpDown, MoreHorizontal,
  AlertTriangle, Clock, Users, ChevronRight, ExternalLink, FileDown,
} from "lucide-react";
import type { Affectation } from "@/lib/operations/types";
import type { MissionKpis } from "@/lib/operations/disponibilites";
import { buildGrilleDispo, besoinsParJour, couvertureMoyenne } from "@/lib/operations/disponibilites";
import { PageHeader } from "@/components/ops/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/Toast";
import { deleteSurveillant } from "@/app/actions/surveillants";
import { EquipeTable } from "./EquipeTable";
import { ProfilePanel } from "./ProfilePanel";
import { DispoCalendar } from "./DispoCalendar";
import { BesoinsChart } from "./BesoinsChart";
import { SurveillantForm } from "./SurveillantForm";
import type { SurvRow } from "./types";

const ROLES = ["Coordinatrice", "Surveillant salle", "Surveillant volant", "Surveillant PMR"];
const STATUTS = ["Disponible", "Planifié", "Annulé", "Indisponible"];
type Tri = "note" | "heures" | "nom";

export interface MissionInfo {
  client: string;
  dateLabel: string;
  session?: string;
  reference?: string;
  nbSalles: number;
  jourISO?: string;
}

// ── Colonne KPI du bandeau ───────────────────────────────────────────────────
function KpiCol({
  tag, children, onClick, className = "",
}: {
  tag: string; children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  const inner = (
    <>
      <div className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400 mb-1.5">{tag}</div>
      {children}
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className={`text-left px-4 py-3.5 hover:bg-slate-50/70 transition-colors rounded-lg ${className}`}>
        {inner}
      </button>
    );
  }
  return <div className={`px-4 py-3.5 ${className}`}>{inner}</div>;
}

// ── Carte d'alerte métier ────────────────────────────────────────────────────
function AlertCard({
  tone, icon, titre, detail, onClick,
}: {
  tone: "critique" | "attention" | "invitation";
  icon: React.ReactNode; titre: string; detail: string; onClick: () => void;
}) {
  const TONE = {
    critique: { ring: "hover:border-rose-200", chip: "bg-rose-50 text-rose-600", t: "text-rose-700" },
    attention: { ring: "hover:border-amber-200", chip: "bg-amber-50 text-amber-600", t: "text-amber-700" },
    invitation: { ring: "hover:border-violet-200", chip: "bg-violet-50 text-violet-600", t: "text-violet-700" },
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 text-left bg-white rounded-2xl border border-slate-200/80 shadow-sm px-4 py-3.5 transition-colors ${TONE.ring} w-full`}
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TONE.chip}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-bold ${TONE.t} truncate`}>{titre}</div>
        <div className="text-[11.5px] text-slate-500 truncate">{detail}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" aria-hidden />
    </button>
  );
}

export function SurveillantsWorkspace({
  rows,
  affectations,
  missionDates,
  kpis,
  mission,
  defaultAnnee,
  defaultMois,
  aujourdhuiISO,
}: {
  rows: SurvRow[];
  affectations: Affectation[];
  missionDates: Record<number, string | undefined>;
  kpis: MissionKpis;
  mission: MissionInfo | null;
  defaultAnnee: number;
  defaultMois: number;
  aujourdhuiISO: string;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [statut, setStatut] = useState("");
  const [tri, setTri] = useState<Tri>("note");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; row: SurvRow } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annee, setAnnee] = useState(defaultAnnee);
  const [mois, setMois] = useState(defaultMois);
  const [pending, startTransition] = useTransition();

  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Filtrage + tri partagés (table, calendrier, graphe).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((s) => {
      if (q && !s.nom.toLowerCase().includes(q) && !(s.qualifications ?? "").toLowerCase().includes(q) && !(s.zone ?? "").toLowerCase().includes(q) && !(s.email ?? "").toLowerCase().includes(q)) return false;
      if (role && s.role !== role) return false;
      if (statut && s.statut !== statut) return false;
      return true;
    });
    const sorted = [...list];
    if (tri === "note") sorted.sort((a, b) => b.note - a.note);
    else if (tri === "heures") sorted.sort((a, b) => b.heures - a.heures);
    else sorted.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    return sorted;
  }, [rows, search, role, statut, tri]);

  const grille = useMemo(
    () => buildGrilleDispo({ surveillants: filtered, affectations, missionDates, annee, mois, aujourdhuiISO }),
    [filtered, affectations, missionDates, annee, mois, aujourdhuiISO],
  );
  const jours = useMemo(() => besoinsParJour(grille), [grille]);
  const covMoy = useMemo(() => couvertureMoyenne(jours), [jours]);

  const selectedRow = selectedId != null ? rows.find((r) => r.id === selectedId) ?? null : null;
  const invitationsEnAttente = rows.filter((r) => r.portail === "invite").length;
  const nbFiltres = (search ? 1 : 0) + (role ? 1 : 0) + (statut ? 1 : 0);

  function selectRow(id: number) {
    setSelectedId(id);
    setPanelOpen(true);
  }

  function handleDelete(row: SurvRow) {
    if (!confirm(`Supprimer définitivement « ${row.nom} » de l'équipe ?`)) return;
    startTransition(async () => {
      const res = await deleteSurveillant(row.id);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`« ${row.nom} » supprimé`);
        if (selectedId === row.id) { setPanelOpen(false); setSelectedId(null); }
      }
    });
  }

  function focusTableWith(next: { role?: string; statut?: string; tri?: Tri }) {
    if (next.role !== undefined) setRole(next.role);
    if (next.statut !== undefined) setStatut(next.statut);
    if (next.tri !== undefined) setTri(next.tri);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shiftMois(delta: number) {
    const total = annee * 12 + mois + delta;
    setAnnee(Math.floor(total / 12));
    setMois(((total % 12) + 12) % 12);
  }
  function today() {
    const d = new Date(aujourdhuiISO + "T00:00:00");
    if (!isNaN(d.getTime())) { setAnnee(d.getFullYear()); setMois(d.getMonth()); }
  }

  const inputBase = "text-[12.5px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300";

  return (
    <>
      <PageHeader
        page="Surveillants"
        subtitle={mission ? `Annuaire, rôles et disponibilité de l'équipe pour la mission ${mission.client}` : "Annuaire, rôles et disponibilité de l'équipe"}
        actions={
          <>
            <button
              onClick={() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CalendarRange className="w-4 h-4" aria-hidden />Vue calendrier
            </button>
            <button
              onClick={() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden />Filtres
              {nbFiltres > 0 && <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold">{nbFiltres}</span>}
            </button>
            <button
              onClick={() => setDialog({ mode: "create" })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-[12.5px] font-semibold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" aria-hidden />Ajouter un surveillant
            </button>
          </>
        }
      />

      {/* ── Bandeau compact filtrable + KPI mission active ─────────────────── */}
      <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm mb-5 overflow-hidden">
        {/* Ligne de filtres */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
          {mission && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <CalendarRange className="w-4 h-4 text-slate-400" aria-hidden />{mission.dateLabel}
            </span>
          )}
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputBase} aria-label="Filtrer par rôle">
            <option value="">Tous les rôles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={inputBase} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un surveillant…"
              aria-label="Rechercher un surveillant"
              className="w-full pl-8 pr-3 py-2 text-[12.5px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300"
            />
          </div>
          <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden />
            <select value={tri} onChange={(e) => setTri(e.target.value as Tri)} className={inputBase} aria-label="Trier par">
              <option value="note">Trier : note</option>
              <option value="heures">Trier : heures</option>
              <option value="nom">Trier : nom</option>
            </select>
          </label>
          {nbFiltres > 0 && (
            <button onClick={() => { setSearch(""); setRole(""); setStatut(""); }} className="text-[11.5px] text-slate-400 hover:text-rose-500 px-2 py-2">
              Réinitialiser ✕
            </button>
          )}
        </div>

        {/* Ligne KPI */}
        <div className="flex items-stretch divide-x divide-slate-100 overflow-x-auto">
          <KpiCol tag="Entre mission" className="min-w-[180px]">
            <div className="text-[13px] font-bold text-slate-900">{mission?.dateLabel ?? "—"}</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">{mission ? `${mission.client}${mission.session ? " · " + mission.session : ""}` : "Aucune mission active"}</div>
          </KpiCol>

          <KpiCol tag="Besoins" className="min-w-[130px]">
            <div className="text-[22px] font-extrabold leading-none text-slate-900">{kpis.requis}</div>
            <div className="text-[11.5px] text-slate-400 mt-1">postes à couvrir{mission ? ` · ${mission.nbSalles} salles` : ""}</div>
          </KpiCol>

          <KpiCol tag="Couverture" className="min-w-[150px]">
            <div className="text-[22px] font-extrabold leading-none text-slate-900">{kpis.affectes} / {kpis.requis}</div>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${kpis.couverturePct}%` }} />
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">{kpis.couverturePct}%</div>
          </KpiCol>

          <KpiCol tag="Heures planifiées" className="min-w-[140px]">
            <div className="text-[22px] font-extrabold leading-none text-slate-900">{kpis.heuresPlanifiees} h</div>
            <div className="text-[11.5px] text-slate-400 mt-1">sur {kpis.nbCreneaux} créneaux</div>
          </KpiCol>

          <KpiCol tag="Postes restants" onClick={() => focusTableWith({ statut: "Disponible" })} className="min-w-[130px]">
            <div className={`text-[22px] font-extrabold leading-none ${kpis.postesRestants > 0 ? "text-amber-600" : "text-emerald-600"}`}>{kpis.postesRestants}</div>
            <div className="text-[11.5px] text-slate-400 mt-1">à pourvoir</div>
          </KpiCol>

          <KpiCol tag="Alertes" className="min-w-[170px]">
            <div className="space-y-0.5">
              <button onClick={() => focusTableWith({ statut: "Disponible" })} className="flex items-center gap-1.5 text-[12px] text-rose-600 font-semibold hover:underline">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-[10px]">{kpis.postesCritiques}</span>
                postes critiques
              </button>
              <button onClick={() => focusTableWith({ tri: "heures", statut: "" })} className="flex items-center gap-1.5 text-[12px] text-amber-600 font-semibold hover:underline">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-[10px]">{kpis.risqueFatigue}</span>
                risque de fatigue
              </button>
            </div>
          </KpiCol>

          <div className="relative flex items-center px-2">
            <button onClick={() => setMenuOpen((v) => !v)} aria-label="Plus d'actions" className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <MoreHorizontal className="w-5 h-5" aria-hidden />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-2 top-12 z-30 w-52 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden py-1">
                  <Link href="/operations/planification" className="flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50"><ExternalLink className="w-4 h-4 text-slate-400" aria-hidden />Ouvrir la planification</Link>
                  <button onClick={() => { setMenuOpen(false); scrollToId("import-export"); }} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12.5px] text-slate-700 hover:bg-slate-50"><FileDown className="w-4 h-4 text-slate-400" aria-hidden />Importer / Exporter</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Table équipe mobilisable ──────────────────────────────────────── */}
      <div className="mb-5">
        <EquipeTable
          rows={filtered}
          totalCount={rows.length}
          selectedId={selectedId}
          onSelect={selectRow}
          onEdit={(row) => setDialog({ mode: "edit", row })}
          onDelete={handleDelete}
        />
      </div>

      {/* ── Calendrier + graphe ───────────────────────────────────────────── */}
      <div ref={calendarRef} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 mb-5">
        <DispoCalendar grille={grille} onPrev={() => shiftMois(-1)} onNext={() => shiftMois(1)} onToday={today} onSelect={selectRow} />
        <BesoinsChart jours={jours} couvertureMoyenne={covMoy} />
      </div>

      {/* ── Alertes métier (avant l'import/export) ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        <AlertCard
          tone="critique"
          icon={<AlertTriangle className="w-5 h-5" aria-hidden />}
          titre={`${kpis.postesCritiques} poste${kpis.postesCritiques > 1 ? "s" : ""} à couvrir`}
          detail={mission ? `Mission ${mission.client} — besoin de renforts` : "Aucune mission active"}
          onClick={() => focusTableWith({ statut: "Disponible" })}
        />
        <AlertCard
          tone="attention"
          icon={<Clock className="w-5 h-5" aria-hidden />}
          titre={`${kpis.risqueFatigue} surveillant${kpis.risqueFatigue > 1 ? "s" : ""} en risque de fatigue`}
          detail={kpis.fatigueNoms.length ? kpis.fatigueNoms.slice(0, 2).join(", ") + (kpis.fatigueNoms.length > 2 ? "…" : "") : "Charge équilibrée"}
          onClick={() => focusTableWith({ tri: "heures", statut: "" })}
        />
        <AlertCard
          tone="invitation"
          icon={<Users className="w-5 h-5" aria-hidden />}
          titre={`${invitationsEnAttente} invitation${invitationsEnAttente > 1 ? "s" : ""} en attente`}
          detail="Accès portail surveillant"
          onClick={() => scrollToId("invitations-panel")}
        />
      </div>

      {/* Panneau de profil latéral repliable */}
      <ProfilePanel
        row={selectedRow}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onReopen={() => setPanelOpen(true)}
        onEditComplete={(row) => setDialog({ mode: "edit", row })}
      />

      {/* Dialog création / édition */}
      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? `Modifier — ${dialog.row.nom}` : "Nouveau surveillant"}</DialogTitle>
          </DialogHeader>
          {dialog && (
            <SurveillantForm
              mode={dialog.mode}
              initial={dialog.mode === "edit" ? dialog.row : undefined}
              onDone={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <span className="sr-only" aria-live="polite">{pending ? "Traitement en cours" : ""}</span>
    </>
  );
}
