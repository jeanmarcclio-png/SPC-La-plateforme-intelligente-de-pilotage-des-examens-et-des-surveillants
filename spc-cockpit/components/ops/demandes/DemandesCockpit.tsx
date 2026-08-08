"use client";

// Cockpit des demandes clients — thème Dark Graphite Premium.
// Centre de commandement : voir → comprendre → prioriser → agir.
// Toutes les valeurs affichées proviennent de lib/operations/demandes/cockpit
// (fonctions pures testées) : aucune donnée décorative en dur.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArrowRight,
  ArrowRightCircle,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Euro,
  Eye,
  FileClock,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { DemandeClient, LigneSalleDemande } from "@/lib/operations/demandes/types";
import { STATUTS_ACTIFS, genererReference, validerDemande } from "@/lib/operations/demandes/logic";
import {
  ligneCockpit,
  synthesePortefeuille,
  type LigneCockpit,
} from "@/lib/operations/demandes/cockpit";
import { chargerDemandes, enregistrerDemande, nouvelId } from "@/lib/operations/demandes/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/Toast";
import { DemandeForm } from "./DemandeForm";
import { DemandeApercu } from "./DemandeApercu";
import { imprimerFiche, telechargerExcel, telechargerModele } from "./exports";
import {
  ACCENTS,
  ACCENT_STATUT,
  DG,
  FOCUS_RING,
  accentCompletude,
  type Accent,
} from "./cockpit-theme";
import {
  ActionIcone,
  Anneau,
  BadgeDG,
  BoutonDG,
  Carte,
  Donut,
  LabelCarte,
  Pastille,
  PointEtat,
  Tendance,
} from "./CockpitUI";

// ---------------------------------------------------------------------------
// Helpers de présentation
// ---------------------------------------------------------------------------

const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const NOMBRE = new Intl.NumberFormat("fr-FR");

function dateCourte(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

function dateLongue(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** « Échéance : 2j (16 juin) » — ou le retard s'il est déjà pris. */
function libelleEcheance(l: LigneCockpit): string {
  if (!l.echeance) return "Période non définie";
  const { jours, dateISO } = l.echeance;
  if (jours < 0) return `En retard de ${Math.abs(jours)}j (${dateCourte(dateISO)})`;
  if (jours === 0) return `Aujourd'hui (${dateCourte(dateISO)})`;
  return `Échéance : ${jours}j (${dateCourte(dateISO)})`;
}

/** Variante courte pour la carte mobile, où le libellé est déjà porté par le <dt>. */
function libelleEcheanceCourt(l: LigneCockpit): string {
  if (!l.echeance) return "Non définie";
  const { jours, dateISO } = l.echeance;
  if (jours < 0) return `En retard de ${Math.abs(jours)}j`;
  if (jours === 0) return `Aujourd'hui (${dateCourte(dateISO)})`;
  return `${jours}j (${dateCourte(dateISO)})`;
}

const ACCENT_FRAICHEUR: Record<string, Accent> = { frais: "success", attention: "warning", obsolete: "danger" };

function blankDemande(refs: string[]): DemandeClient {
  const now = new Date().toISOString();
  return {
    id: nouvelId(),
    reference: genererReference(now, refs),
    etablissement: "",
    demandeur: { prenom: "", nom: "", email: "" },
    responsableClient: { prenom: "", nom: "", email: "" },
    responsableSpc: "",
    lignes: [{ id: Math.random().toString(36).slice(2), creneau: "Matin" }],
    statut: "Brouillon",
    createdAt: now,
    updatedAt: now,
    historique: [{ action: "Création demande", date: now, detail: "Saisie interne SPC" }],
  };
}

// Parse best-effort d'un fichier Excel/CSV en lignes salles/horaires.
async function parseFichierLignes(file: File): Promise<LigneSalleDemande[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase().includes("demande")) ?? wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" }) as unknown[][];
  if (rows.length < 2) return [];
  const head = rows[0].map((c) => String(c).toLowerCase());
  const col = (k: string) => head.findIndex((h) => h.includes(k));
  const iDate = col("date"), iCren = col("créneau") >= 0 ? col("créneau") : col("creneau"), iSalle = col("salle"), iBat = col("bât") >= 0 ? col("bât") : col("bat");
  const iEtu = col("étud") >= 0 ? col("étud") : col("etud"), iSurv = col("surv"), iPmr = col("pmr"), iTt = col("tiers"), iDe = col("début ex") >= 0 ? col("début ex") : col("debut ex"), iFe = col("fin ex");
  const cell = (r: unknown[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  const oui = (v: string) => /oui|x|1|true/i.test(v);
  return rows.slice(1).filter((r) => r.some((c) => String(c).trim())).map((r) => ({
    id: Math.random().toString(36).slice(2),
    date: cell(r, iDate), creneau: cell(r, iCren) || "Matin", salle: cell(r, iSalle), batiment: cell(r, iBat),
    etudiants: Number(cell(r, iEtu)) || undefined, surveillants: Number(cell(r, iSurv)) || undefined,
    pmr: oui(cell(r, iPmr)), tiersTemps: oui(cell(r, iTt)), debutExamen: cell(r, iDe), finExamen: cell(r, iFe),
  }));
}

type FiltrePeriode = "" | "7j" | "30j" | "sans";
type FiltreUrgence = "" | "urgentes" | "incompletes";

/** Gabarit du menu d'actions (portail) : largeur fixe et hauteur maximale
 *  estimée pour décider de l'ouverture vers le haut ou vers le bas. */
const MENU_LARGEUR = 212;
const MENU_HAUTEUR_MAX = 240;

/** Instant neutre utilisé tant que l'horloge client n'est pas disponible
 *  (premier rendu : le squelette est affiché, aucune valeur n'est lue). */
const EPOQUE = new Date(0);

/** Dialogues de la page : même thème Dark Graphite que le cockpit. */
const DIALOGUE_SOMBRE =
  "max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0B1926] border border-[rgba(148,163,184,0.18)] text-[#F6F8FC]";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DemandesCockpit() {
  const [demandes, setDemandes] = useState<DemandeClient[] | null>(null);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [periode, setPeriode] = useState<FiltrePeriode>("");
  const [campus, setCampus] = useState("");
  const [urgence, setUrgence] = useState<FiltreUrgence>("");
  const [avances, setAvances] = useState(false);
  const [editing, setEditing] = useState<DemandeClient | null>(null);
  const [apercu, setApercu] = useState<DemandeClient | null>(null);
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chargement client-only (localStorage) après montage : indisponible au
  // rendu serveur, donc impossible à dériver pendant le render. L'instant de
  // référence est figé au même moment : échéances, fraîcheurs et tendances
  // restent cohérentes entre elles sur tout le rendu (il est rafraîchi à
  // chaque écriture).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDemandes(chargerDemandes()); setMaintenant(new Date()); }, []);

  const refs = useMemo(() => (demandes ?? []).map((d) => d.reference), [demandes]);

  const lignes = useMemo(
    () => (maintenant ? (demandes ?? []).map((d) => ligneCockpit(d, maintenant)) : []),
    [demandes, maintenant],
  );

  const synthese = useMemo(
    () => synthesePortefeuille(demandes ?? [], maintenant ?? EPOQUE),
    [demandes, maintenant],
  );

  const campusOptions = useMemo(
    () => [...new Set((demandes ?? []).map((d) => d.campus || d.ville).filter((c): c is string => Boolean(c)))].sort(),
    [demandes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = (maintenant ?? EPOQUE).getTime();
    return lignes.filter((l) => {
      const d = l.demande;
      if (statut && d.statut !== statut) return false;
      if (campus && (d.campus || d.ville) !== campus) return false;
      if (urgence === "urgentes" && !l.urgente) return false;
      if (urgence === "incompletes" && l.completude.pct >= 100) return false;
      if (periode === "sans" && l.echeance) return false;
      if (periode === "7j" || periode === "30j") {
        if (!l.echeance) return false;
        const max = periode === "7j" ? 7 : 30;
        const jours = (Date.parse(`${l.echeance.dateISO}T00:00:00Z`) - now) / 86_400_000;
        if (jours > max) return false;
      }
      if (q) {
        const foin = [d.reference, d.etablissement, d.campus, d.ville, d.demandeur.nom, d.responsableClient.nom, d.responsableSpc]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!foin.includes(q)) return false;
      }
      return true;
    });
  }, [lignes, search, statut, campus, urgence, periode, maintenant]);

  const filtresActifs = Boolean(statut || campus || urgence || periode || search.trim());

  // ── Mutations ────────────────────────────────────────────────────────────

  function persist(d: DemandeClient, msg: string) {
    setDemandes(enregistrerDemande(d));
    setMaintenant(new Date());
    showToast(msg);
  }

  function onSave(d: DemandeClient) {
    persist(d, `Demande ${d.reference} enregistrée`);
    setEditing(null);
  }

  function valider(d: DemandeClient) {
    const errs = validerDemande(d);
    if (errs.length) {
      showToast(`La demande ne peut pas être validée : ${errs.length} élément(s) à corriger.`, "error");
      setEditing(d);
      return;
    }
    const date = new Date().toISOString();
    persist(
      { ...d, statut: "Validée SPC", updatedAt: date, historique: [...d.historique, { action: "Validation SPC", date }] },
      `Demande ${d.reference} validée SPC`,
    );
  }

  function convertir(d: DemandeClient) {
    if (d.statut !== "Validée SPC") {
      showToast("La demande doit être « Validée SPC » avant conversion.", "error");
      return;
    }
    const missionRef = `EX-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const date = new Date().toISOString();
    persist(
      { ...d, statut: "Convertie en mission", missionRef, updatedAt: date, historique: [...d.historique, { action: "Conversion mission", date, detail: missionRef }] },
      `Mission ${missionRef} créée depuis ${d.reference}`,
    );
  }

  function changerStatut(d: DemandeClient, s: DemandeClient["statut"], label: string) {
    const date = new Date().toISOString();
    persist(
      { ...d, statut: s, updatedAt: date, historique: [...d.historique, { action: label, date }] },
      `Demande ${d.reference} — ${label.toLowerCase()}`,
    );
  }

  async function onImport(file: File) {
    try {
      const importees = await parseFichierLignes(file);
      if (!importees.length) {
        showToast("Aucune ligne exploitable dans le fichier.", "error");
        return;
      }
      const d = blankDemande(refs);
      const date = new Date().toISOString();
      setEditing({ ...d, lignes: importees, historique: [...d.historique, { action: "Import Excel", date, detail: `${importees.length} ligne(s)` }] });
      showToast(`${importees.length} ligne(s) importée(s) — complétez puis enregistrez.`);
    } catch {
      showToast("Impossible de lire ce fichier.", "error");
    }
  }

  function reinitialiser() {
    setSearch("");
    setStatut("");
    setPeriode("");
    setCampus("");
    setUrgence("");
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full" style={{ background: DG.page, color: DG.textPrimary }}>
      <div className="w-full max-w-[1560px] mx-auto p-5 md:p-7 pb-14">
        <EnTete
          onModele={() => telechargerModele()}
          onImport={() => fileRef.current?.click()}
          onNouvelle={() => setEditing(blankDemande(refs))}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
        />

        {demandes === null ? (
          <Squelette />
        ) : (
          <>
            <RangeeKpi synthese={synthese} />
            <BandeauDecisionnel
              synthese={synthese}
              onOuvrir={(l) => setApercu(l.demande)}
              onConvertir={(l) => convertir(l.demande)}
            />

            <BarreFiltres
              search={search}
              onSearch={setSearch}
              statut={statut}
              onStatut={setStatut}
              periode={periode}
              onPeriode={setPeriode}
              campus={campus}
              onCampus={setCampus}
              campusOptions={campusOptions}
              avances={avances}
              onAvances={() => setAvances((v) => !v)}
              urgence={urgence}
              onUrgence={setUrgence}
              filtresActifs={filtresActifs}
              onReset={reinitialiser}
              nbResultats={filtered.length}
              nbTotal={lignes.length}
            />

            <Portefeuille
              lignes={filtered}
              vide={lignes.length === 0}
              onApercu={(d) => setApercu(d)}
              onEditer={(d) => setEditing(d)}
              onValider={valider}
              onConvertir={convertir}
              onExcel={(d) => telechargerExcel(d)}
              onPdf={(d) => imprimerFiche(d)}
              onAnnuler={(d) => changerStatut(d, "Annulée", "Annulation")}
              onArchiver={(d) => changerStatut(d, "Archivée", "Archivage")}
              onNouvelle={() => setEditing(blankDemande(refs))}
              onReset={reinitialiser}
            />

            <BandeauBusiness synthese={synthese} />
          </>
        )}

        <p className="mt-4 text-[11px] leading-relaxed" style={{ color: DG.textMuted }}>
          Le devis n&apos;est jamais calculé ici : Demande → validation SPC → conversion en mission → devis.
          Données enregistrées localement (MVP interne).
        </p>
      </div>

      {/* Formulaire de saisie */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className={DIALOGUE_SOMBRE}>
          <DialogHeader>
            <DialogTitle className="text-[#F6F8FC]">{editing ? `Demande ${editing.reference} — ${editing.etablissement || "nouvelle"}` : ""}</DialogTitle>
          </DialogHeader>
          {editing && <DemandeForm sombre demande={editing} onSave={onSave} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      {/* Aperçu décisionnel (lecture seule) */}
      <Dialog open={!!apercu} onOpenChange={(v) => !v && setApercu(null)}>
        <DialogContent className={`${DIALOGUE_SOMBRE} !max-w-3xl`}>
          <DialogHeader>
            <DialogTitle className="text-[#F6F8FC]">{apercu ? `${apercu.etablissement || "Demande"} — ${apercu.reference}` : ""}</DialogTitle>
          </DialogHeader>
          {apercu && (
            <DemandeApercu
              demande={apercu}
              onEditer={() => { setEditing(apercu); setApercu(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// En-tête de page
// ---------------------------------------------------------------------------

function EnTete({ onModele, onImport, onNouvelle }: { onModele: () => void; onImport: () => void; onNouvelle: () => void }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <nav aria-label="Fil d'Ariane" className="text-[12px] mb-1.5" style={{ color: DG.textMuted }}>
          <Link href="/operations" className={`rounded hover:text-[#B4BECC] transition-colors ${FOCUS_RING}`}>Dashboard</Link>
          <span className="mx-1.5" aria-hidden>/</span>
          <span style={{ color: DG.textSecondary }}>Demandes clients</span>
        </nav>
        <h1 className="text-[26px] md:text-[29px] font-bold tracking-[-0.02em] flex items-center gap-2.5" style={{ color: DG.textPrimary }}>
          Cockpit des demandes clients
          <Sparkles aria-hidden className="w-[18px] h-[18px]" style={{ color: DG.violetLight }} strokeWidth={1.8} />
        </h1>
        <p className="text-[13px] mt-1" style={{ color: DG.textTertiary }}>
          Pilotage intelligent de vos demandes de surveillance et conversions
        </p>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <BoutonDG onClick={onModele}>
          <Download className="w-4 h-4" strokeWidth={1.8} aria-hidden />
          Modèle
        </BoutonDG>
        <BoutonDG onClick={onImport}>
          <Upload className="w-4 h-4" strokeWidth={1.8} aria-hidden />
          Importer Excel/CSV
        </BoutonDG>
        <BoutonDG variante="principal" onClick={onNouvelle}>
          <Plus className="w-4 h-4" strokeWidth={2} aria-hidden />
          Nouvelle demande client
        </BoutonDG>
      </div>
    </div>
  );
}

function Squelette() {
  return (
    <div className="py-24 text-center text-[13px]" style={{ color: DG.textTertiary }}>
      Chargement du portefeuille…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rangée KPI
// ---------------------------------------------------------------------------

type Synthese = ReturnType<typeof synthesePortefeuille>;

function RangeeKpi({ synthese: s }: { synthese: Synthese }) {
  return (
    <div className="grid gap-3.5 grid-cols-2 xl:grid-cols-12 mb-3.5">
      {/* Carte 1 — vue d'ensemble */}
      <Carte className="p-4 col-span-2 xl:col-span-4" fond={DG.surface2}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <LabelCarte>Vue d&apos;ensemble</LabelCarte>
            <div className="text-[28px] font-bold leading-none mt-2.5" style={{ color: DG.textPrimary }}>
              {s.total} <span className="text-[16px] font-semibold" style={{ color: DG.textSecondary }}>demande{s.total > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <BadgeDG accent="danger" point compact>{s.urgentes} urgente{s.urgentes > 1 ? "s" : ""}</BadgeDG>
              <BadgeDG accent="warning" point compact>{s.aVerifier} à contrôler</BadgeDG>
            </div>
            <div className="text-[12px] mt-3 flex items-center gap-1.5" style={{ color: DG.textSecondary }}>
              <Users className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden style={{ color: DG.textTertiary }} />
              {NOMBRE.format(s.nbEtudiants)} étudiants concernés
            </div>
          </div>
          <div className="flex flex-col items-center flex-shrink-0">
            <Donut pct={s.tauxConversion} libelle="Taux de conversion" sousLibelle="Taux de conversion" />
            <span className="text-[10.5px] mt-1.5" style={{ color: DG.textMuted }}>
              Objectif : {s.objectifConversion}%
            </span>
          </div>
        </div>
      </Carte>

      <CarteStatut label="Brouillons" valeur={s.brouillons} sub="en cours de saisie" evolution={s.evolution.brouillons} accent="blue" icone={<FileClock className="w-[17px] h-[17px]" strokeWidth={1.8} />} />
      <CarteStatut label="À vérifier" valeur={s.aVerifier} sub="à contrôler" evolution={s.evolution.aVerifier} accent="warning" icone={<ClipboardCheck className="w-[17px] h-[17px]" strokeWidth={1.8} />} />
      <CarteStatut label="Validées SPC" valeur={s.valides} sub="prêtes à convertir" evolution={s.evolution.valides} accent="success" icone={<ShieldCheck className="w-[17px] h-[17px]" strokeWidth={1.8} />} />
      <CarteStatut label="Converties" valeur={s.converties} sub="en mission" evolution={s.evolution.converties} accent="violet" icone={<Briefcase className="w-[17px] h-[17px]" strokeWidth={1.8} />} />
    </div>
  );
}

function CarteStatut({
  label, valeur, sub, evolution, accent, icone,
}: {
  label: string; valeur: number; sub: string; evolution: number; accent: Accent; icone: React.ReactNode;
}) {
  return (
    <Carte className="p-4 xl:col-span-2">
      <div className="flex items-start justify-between gap-2">
        <LabelCarte>{label}</LabelCarte>
        <Pastille accent={accent} taille={30} rond={false}>{icone}</Pastille>
      </div>
      <div className="text-[28px] font-bold leading-none mt-3" style={{ color: DG.textPrimary }}>{valeur}</div>
      <div className="text-[12px] mt-1.5" style={{ color: DG.textTertiary }}>{sub}</div>
      <div className="mt-3">
        <Tendance valeur={evolution} accent={accent} />
      </div>
    </Carte>
  );
}

// ---------------------------------------------------------------------------
// Bandeau décisionnel
// ---------------------------------------------------------------------------

function BandeauDecisionnel({
  synthese: s, onOuvrir, onConvertir,
}: {
  synthese: Synthese;
  onOuvrir: (l: LigneCockpit) => void;
  onConvertir: (l: LigneCockpit) => void;
}) {
  return (
    <Carte className="mb-3.5 overflow-hidden" fond={DG.surface2}>
      <div className="grid md:grid-cols-3">
        <SegmentDecision
          accent="danger"
          halo
          icone={<CalendarClock className="w-[18px] h-[18px]" strokeWidth={1.8} />}
          label="Demande urgente"
          contenu={s.urgente ? `${s.urgente.demande.etablissement}${s.urgente.demande.campus ? ` – ${s.urgente.demande.campus}` : ""}` : "Aucune demande urgente"}
          detail={s.urgente ? libelleEcheance(s.urgente) : "Toutes les échéances sont sous contrôle"}
          detailAccent={s.urgente ? "danger" : undefined}
          onClick={s.urgente ? () => onOuvrir(s.urgente!) : undefined}
        />
        <SegmentDecision
          accent="warning"
          bordure
          icone={<ClipboardCheck className="w-[18px] h-[18px]" strokeWidth={1.8} />}
          label="Prochaine action"
          contenu={s.prochaine ? s.prochaine.action.label : "Aucune action en attente"}
          detail={s.prochaine ? `${s.prochaine.demande.etablissement} · ${s.prochaine.action.detail}` : "Le portefeuille est à jour"}
          onClick={s.prochaine ? () => onOuvrir(s.prochaine!) : undefined}
        />
        <SegmentDecision
          accent="success"
          bordure
          icone={<TrendingUp className="w-[18px] h-[18px]" strokeWidth={1.8} />}
          label="Opportunité"
          contenu={s.opportuniteCount ? `${s.opportuniteCount} demande${s.opportuniteCount > 1 ? "s" : ""} prête${s.opportuniteCount > 1 ? "s" : ""} à convertir` : "Aucune demande prête"}
          detail={s.opportuniteCount ? `${NOMBRE.format(s.opportuniteEtudiants)} étudiants • ${EUROS.format(s.opportunitePotentielHT)} HT potentiel` : "Validez une demande pour ouvrir le pipeline"}
          onClick={s.opportunite ? () => onConvertir(s.opportunite!) : undefined}
        />
      </div>
    </Carte>
  );
}

function SegmentDecision({
  accent, icone, label, contenu, detail, detailAccent, onClick, halo = false, bordure = false,
}: {
  accent: Accent;
  icone: React.ReactNode;
  label: string;
  contenu: string;
  detail: string;
  detailAccent?: Accent;
  onClick?: () => void;
  halo?: boolean;
  bordure?: boolean;
}) {
  const interactif = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactif}
      className={`group flex items-center gap-3.5 text-left px-4 py-3.5 min-h-[86px] transition-colors duration-150 ${interactif ? "hover:bg-[rgba(255,255,255,.025)] cursor-pointer" : "cursor-default"} ${FOCUS_RING}`}
      style={{
        borderLeft: bordure ? `1px solid ${DG.borderSoft}` : undefined,
        background: halo ? `linear-gradient(90deg, ${ACCENTS[accent].glow} -40%, transparent 42%)` : undefined,
      }}
    >
      <Pastille accent={accent} taille={38}>{icone}</Pastille>
      <span className="min-w-0 flex-1">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[.09em]" style={{ color: DG.textTertiary }}>{label}</span>
        <span className="block text-[14px] font-semibold truncate mt-1" style={{ color: DG.textPrimary }}>{contenu}</span>
        <span className="block text-[11.5px] truncate mt-0.5" style={{ color: detailAccent ? ACCENTS[detailAccent].color : DG.textTertiary }}>{detail}</span>
      </span>
      {interactif && (
        <ChevronRight
          aria-hidden
          className="w-4 h-4 flex-shrink-0 transition-colors duration-150"
          style={{ color: DG.textMuted }}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Recherche et filtres
// ---------------------------------------------------------------------------

const CHAMP_STYLE: React.CSSProperties = {
  background: DG.surface1,
  border: `1px solid ${DG.borderSoft}`,
  color: DG.textPrimary,
};

function BarreFiltres(props: {
  search: string; onSearch: (v: string) => void;
  statut: string; onStatut: (v: string) => void;
  periode: FiltrePeriode; onPeriode: (v: FiltrePeriode) => void;
  campus: string; onCampus: (v: string) => void;
  campusOptions: string[];
  avances: boolean; onAvances: () => void;
  urgence: FiltreUrgence; onUrgence: (v: FiltreUrgence) => void;
  filtresActifs: boolean; onReset: () => void;
  nbResultats: number; nbTotal: number;
}) {
  const selectCls = `h-10 rounded-[9px] px-2.5 text-[12.5px] appearance-none ${FOCUS_RING}`;
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search aria-hidden className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: DG.textMuted }} strokeWidth={1.8} />
          <input
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Rechercher une demande (client, référence, demandeur…)"
            aria-label="Rechercher une demande"
            className={`w-full h-10 pl-10 pr-3 rounded-[9px] text-[12.5px] placeholder:text-[#647386] ${FOCUS_RING}`}
            style={CHAMP_STYLE}
          />
        </div>

        <select value={props.statut} onChange={(e) => props.onStatut(e.target.value)} aria-label="Filtrer par statut" className={selectCls} style={CHAMP_STYLE}>
          <option value="">Tous les statuts</option>
          {[...STATUTS_ACTIFS, "Convertie en mission", "Archivée", "Annulée"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={props.periode} onChange={(e) => props.onPeriode(e.target.value as FiltrePeriode)} aria-label="Filtrer par période" className={selectCls} style={CHAMP_STYLE}>
          <option value="">Période</option>
          <option value="7j">Sous 7 jours</option>
          <option value="30j">Sous 30 jours</option>
          <option value="sans">Non définie</option>
        </select>

        <select value={props.campus} onChange={(e) => props.onCampus(e.target.value)} aria-label="Filtrer par campus" className={selectCls} style={CHAMP_STYLE}>
          <option value="">Tous les campus</option>
          {props.campusOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          type="button"
          onClick={props.onAvances}
          aria-expanded={props.avances}
          className={`h-10 px-3 rounded-[9px] text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors duration-150 ${FOCUS_RING}`}
          style={{
            background: props.avances ? ACCENTS.violet.soft : DG.surface1,
            border: `1px solid ${props.avances ? ACCENTS.violet.ring : DG.borderSoft}`,
            color: props.avances ? DG.violetLight : DG.textSecondary,
          }}
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden />
          Filtres avancés
        </button>
      </div>

      {props.avances && (
        <div className="flex items-center gap-2 flex-wrap mt-2.5 px-0.5">
          <span className="text-[11px]" style={{ color: DG.textMuted }}>Priorité :</span>
          {([["", "Toutes"], ["urgentes", "Urgentes"], ["incompletes", "Dossier incomplet"]] as const).map(([v, l]) => (
            <button
              key={v || "toutes"}
              type="button"
              onClick={() => props.onUrgence(v)}
              aria-pressed={props.urgence === v}
              className={`h-8 px-3 rounded-full text-[11.5px] font-medium transition-colors duration-150 ${FOCUS_RING}`}
              style={{
                background: props.urgence === v ? ACCENTS.violet.soft : DG.surface1,
                border: `1px solid ${props.urgence === v ? ACCENTS.violet.ring : DG.borderSoft}`,
                color: props.urgence === v ? DG.violetLight : DG.textSecondary,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {props.filtresActifs && (
        <div className="flex items-center gap-2 mt-2.5 px-0.5 text-[11.5px]" style={{ color: DG.textTertiary }}>
          <span>{props.nbResultats} demande{props.nbResultats > 1 ? "s" : ""} sur {props.nbTotal}</span>
          <button type="button" onClick={props.onReset} className={`inline-flex items-center gap-1 rounded px-1 hover:text-[#B4BECC] transition-colors ${FOCUS_RING}`}>
            <X className="w-3 h-3" aria-hidden />
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portefeuille décisionnel
// ---------------------------------------------------------------------------

const COLONNES = [
  "Référence", "Client", "Période", "Étudiants", "Statut",
  "Complétude", "Prochaine action", "Responsable", "Dernière maj.", "Actions",
];

function Portefeuille({
  lignes, vide, onApercu, onEditer, onValider, onConvertir, onExcel, onPdf, onAnnuler, onArchiver, onNouvelle, onReset,
}: {
  lignes: LigneCockpit[];
  vide: boolean;
  onApercu: (d: DemandeClient) => void;
  onEditer: (d: DemandeClient) => void;
  onValider: (d: DemandeClient) => void;
  onConvertir: (d: DemandeClient) => void;
  onExcel: (d: DemandeClient) => void;
  onPdf: (d: DemandeClient) => void;
  onAnnuler: (d: DemandeClient) => void;
  onArchiver: (d: DemandeClient) => void;
  onNouvelle: () => void;
  onReset: () => void;
}) {
  const vueVide = (
    <div className="py-14 text-center">
      <p className="text-[13px]" style={{ color: DG.textSecondary }}>
        {vide ? "Aucune demande dans le portefeuille." : "Aucune demande ne correspond à ces filtres."}
      </p>
      <div className="mt-3">
        {vide ? (
          <BoutonDG variante="contour-violet" onClick={onNouvelle}>
            <Plus className="w-4 h-4" strokeWidth={2} aria-hidden />
            Nouvelle demande client
          </BoutonDG>
        ) : (
          <BoutonDG onClick={onReset}>Réinitialiser les filtres</BoutonDG>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile : une carte par demande — les 10 colonnes ne sont jamais
          compressées sur petit écran (§28). */}
      <div className="md:hidden space-y-2.5">
        {lignes.length === 0 ? (
          <Carte fond={DG.surface1}>{vueVide}</Carte>
        ) : (
          lignes.map((l) => (
            <CarteDemande key={l.demande.id} ligne={l} onApercu={onApercu} onEditer={onEditer} />
          ))
        )}
      </div>

      <Carte className="overflow-hidden hidden md:block" fond={DG.surface1}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1320px]">
          <caption className="sr-only">Portefeuille des demandes clients</caption>
          <thead>
            <tr style={{ background: DG.pageAlt, borderBottom: `1px solid ${DG.borderSoft}` }}>
              {COLONNES.map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.08em] whitespace-nowrap ${i === 3 ? "text-center" : i === 9 ? "text-right" : "text-left"}`}
                  style={{ color: DG.textMuted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={COLONNES.length}>{vueVide}</td>
              </tr>
            ) : (
              lignes.map((l) => (
                <LignePortefeuille
                  key={l.demande.id}
                  ligne={l}
                  onApercu={onApercu}
                  onEditer={onEditer}
                  onValider={onValider}
                  onConvertir={onConvertir}
                  onExcel={onExcel}
                  onPdf={onPdf}
                  onAnnuler={onAnnuler}
                  onArchiver={onArchiver}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      </Carte>
    </>
  );
}

/** Vue mobile d'une demande : les 7 informations décisionnelles utiles (§28). */
function CarteDemande({
  ligne: l, onApercu, onEditer,
}: {
  ligne: LigneCockpit;
  onApercu: (d: DemandeClient) => void;
  onEditer: (d: DemandeClient) => void;
}) {
  const d = l.demande;
  const accentPct = accentCompletude(l.completude.pct);
  return (
    <Carte className="p-3.5" fond={DG.surface1} accent={l.urgente ? "danger" : undefined} halo={l.urgente}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {l.urgente && <BadgeDG accent="danger" compact>URGENTE</BadgeDG>}
            <button
              type="button"
              onClick={() => onApercu(d)}
              className={`text-[12px] font-semibold rounded hover:underline ${FOCUS_RING}`}
              style={{ color: DG.violetLight }}
            >
              {d.reference}
            </button>
          </div>
          <div className="text-[14px] font-semibold mt-1 truncate" style={{ color: DG.textPrimary }}>{d.etablissement || "—"}</div>
          <div className="text-[11.5px]" style={{ color: DG.textMuted }}>{d.campus || d.ville || "Campus non renseigné"}</div>
        </div>
        <ActionIcone label={`Modifier ${d.reference}`} onClick={() => onEditer(d)}>
          <Pencil className="w-4 h-4" strokeWidth={1.8} />
        </ActionIcone>
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <BadgeDG accent={ACCENT_STATUT[d.statut] ?? "neutral"} point>{d.statut}</BadgeDG>
        <span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: ACCENTS[accentPct].color }}>
          <Anneau pct={l.completude.pct} accent={accentPct} taille={20} />
          {l.completude.pct}%
        </span>
        <span className="inline-flex items-center gap-1 text-[11.5px]" style={{ color: DG.textTertiary }}>
          <Users className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden />
          {l.nbEtudiants}
        </span>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
        <div>
          <dt style={{ color: DG.textMuted }}>Échéance</dt>
          <dd style={{ color: l.urgente ? ACCENTS.danger.color : DG.textSecondary }}>{libelleEcheanceCourt(l)}</dd>
        </div>
        <div>
          <dt style={{ color: DG.textMuted }}>Responsable</dt>
          <dd style={{ color: DG.textSecondary }}>{d.responsableSpc || "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt style={{ color: DG.textMuted }}>Prochaine action</dt>
          <dd style={{ color: DG.textPrimary }}>{l.action.label} <span style={{ color: DG.textMuted }}>— {l.action.detail}</span></dd>
        </div>
      </dl>
    </Carte>
  );
}

function LignePortefeuille({
  ligne: l, onApercu, onEditer, onValider, onConvertir, onExcel, onPdf, onAnnuler, onArchiver,
}: {
  ligne: LigneCockpit;
  onApercu: (d: DemandeClient) => void;
  onEditer: (d: DemandeClient) => void;
  onValider: (d: DemandeClient) => void;
  onConvertir: (d: DemandeClient) => void;
  onExcel: (d: DemandeClient) => void;
  onPdf: (d: DemandeClient) => void;
  onAnnuler: (d: DemandeClient) => void;
  onArchiver: (d: DemandeClient) => void;
}) {
  const d = l.demande;
  const accentStatut = ACCENT_STATUT[d.statut] ?? "neutral";
  const accentPct = accentCompletude(l.completude.pct);
  const initiales = d.etablissement.slice(0, 2).toUpperCase() || "—";

  return (
    <tr
      className="group transition-colors duration-150 hover:bg-[rgba(255,255,255,.018)]"
      style={{ borderBottom: `1px solid ${DG.borderSoft}`, boxShadow: l.urgente ? `inset 2px 0 0 ${ACCENTS.danger.color}` : undefined }}
    >
      {/* Référence */}
      <td className="px-4 py-2.5 align-middle whitespace-nowrap">
        {l.urgente && <div className="mb-1"><BadgeDG accent="danger" compact>URGENTE</BadgeDG></div>}
        <button
          type="button"
          onClick={() => onApercu(d)}
          className={`text-[12.5px] font-semibold rounded hover:underline ${FOCUS_RING}`}
          style={{ color: DG.violetLight }}
        >
          {d.reference}
        </button>
        {d.missionRef && <div className="text-[10.5px] mt-0.5" style={{ color: DG.textMuted }}>→ {d.missionRef}</div>}
      </td>

      {/* Client */}
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: ACCENTS.violet.soft, color: DG.violetLight, boxShadow: `inset 0 0 0 1px ${ACCENTS.violet.ring}` }}
          >
            {initiales}
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold truncate" style={{ color: DG.textPrimary }}>{d.etablissement || "—"}</span>
            {(d.campus || d.ville) && <span className="block text-[11px] truncate" style={{ color: DG.textMuted }}>{d.campus || d.ville}</span>}
          </span>
        </div>
      </td>

      {/* Période */}
      <td className="px-4 py-2.5 align-middle whitespace-nowrap">
        <div className="text-[12.5px]" style={{ color: DG.textSecondary }}>{l.periodeLabel}</div>
        <div className="text-[11px]" style={{ color: DG.textMuted }}>
          {l.nbJours > 0 ? `${l.nbJours} jour${l.nbJours > 1 ? "s" : ""}` : "Non définie"}
        </div>
      </td>

      {/* Étudiants */}
      <td className="px-4 py-2.5 align-middle text-center">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: DG.textPrimary }}>
          <Users className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden style={{ color: DG.textMuted }} />
          {l.nbEtudiants}
        </span>
      </td>

      {/* Statut */}
      <td className="px-4 py-2.5 align-middle">
        <BadgeDG accent={accentStatut} point>{d.statut}</BadgeDG>
      </td>

      {/* Complétude */}
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <Anneau pct={l.completude.pct} accent={accentPct} />
          <span className="text-[12.5px] font-semibold" style={{ color: ACCENTS[accentPct].color }}>{l.completude.pct}%</span>
        </div>
      </td>

      {/* Prochaine action */}
      <td className="px-4 py-2.5 align-middle whitespace-nowrap">
        <div className="text-[12.5px] font-medium" style={{ color: DG.textPrimary }}>{l.action.label}</div>
        <div className="text-[11px]" style={{ color: DG.textMuted }}>{l.action.detail}</div>
      </td>

      {/* Responsable */}
      <td className="px-4 py-2.5 align-middle">
        <div className="text-[12.5px]" style={{ color: DG.textSecondary }}>{d.responsableSpc || "—"}</div>
        <div className="text-[11px]" style={{ color: DG.textMuted }}>SPC</div>
      </td>

      {/* Dernière mise à jour */}
      <td className="px-4 py-2.5 align-middle whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: DG.textSecondary }}>
          <PointEtat accent={ACCENT_FRAICHEUR[l.fraicheur.ton]} />
          {l.fraicheur.label}
        </div>
        <div className="text-[11px] pl-3" style={{ color: DG.textMuted }}>{dateLongue(d.updatedAt)}</div>
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          <ActionIcone label={`Aperçu de ${d.reference}`} onClick={() => onApercu(d)}>
            <Eye className="w-4 h-4" strokeWidth={1.8} />
          </ActionIcone>
          <ActionIcone label={`Modifier ${d.reference}`} onClick={() => onEditer(d)}>
            <Pencil className="w-4 h-4" strokeWidth={1.8} />
          </ActionIcone>
          <MenuLigne
            demande={d}
            onValider={onValider}
            onConvertir={onConvertir}
            onExcel={onExcel}
            onPdf={onPdf}
            onAnnuler={onAnnuler}
            onArchiver={onArchiver}
          />
        </div>
      </td>
    </tr>
  );
}

function MenuLigne({
  demande: d, onValider, onConvertir, onExcel, onPdf, onAnnuler, onArchiver,
}: {
  demande: DemandeClient;
  onValider: (d: DemandeClient) => void;
  onConvertir: (d: DemandeClient) => void;
  onExcel: (d: DemandeClient) => void;
  onPdf: (d: DemandeClient) => void;
  onAnnuler: (d: DemandeClient) => void;
  onArchiver: (d: DemandeClient) => void;
}) {
  // Le menu est rendu dans un portail : la carte du portefeuille défile
  // horizontalement (overflow), elle rognerait sinon les dernières entrées.
  const [ancre, setAncre] = useState<{ top: number; left: number; versLeHaut: boolean } | null>(null);
  const open = ancre !== null;
  const boite = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  function basculer() {
    if (open) { setAncre(null); return; }
    const r = boite.current?.getBoundingClientRect();
    if (!r) return;
    const versLeHaut = r.bottom + MENU_HAUTEUR_MAX > window.innerHeight;
    setAncre({
      top: versLeHaut ? r.top - 4 : r.bottom + 4,
      left: Math.max(8, r.right - MENU_LARGEUR),
      versLeHaut,
    });
  }

  useEffect(() => {
    if (!open) return;
    function surClic(e: MouseEvent) {
      const cible = e.target as Node;
      if (boite.current?.contains(cible) || menu.current?.contains(cible)) return;
      setAncre(null);
    }
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setAncre(null);
    }
    const fermer = () => setAncre(null);
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    window.addEventListener("resize", fermer);
    window.addEventListener("scroll", fermer, true);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
      window.removeEventListener("resize", fermer);
      window.removeEventListener("scroll", fermer, true);
    };
  }, [open]);

  // « Convertir en mission » n'apparaît que sur une demande validée SPC (§23).
  const items: Array<{ label: string; icone: React.ReactNode; accent?: Accent; action: () => void }> = [];
  if (d.statut === "Complète" || d.statut === "À vérifier" || d.statut === "À corriger") {
    items.push({ label: "Valider SPC", icone: <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />, accent: "success", action: () => onValider(d) });
  }
  if (d.statut === "Validée SPC") {
    items.push({ label: "Convertir en mission", icone: <ArrowRightCircle className="w-4 h-4" strokeWidth={1.8} />, accent: "violet", action: () => onConvertir(d) });
  }
  items.push({ label: "Exporter en Excel", icone: <FileSpreadsheet className="w-4 h-4" strokeWidth={1.8} />, action: () => onExcel(d) });
  items.push({ label: "Imprimer la fiche", icone: <FileText className="w-4 h-4" strokeWidth={1.8} />, action: () => onPdf(d) });
  if (d.statut !== "Archivée" && d.statut !== "Convertie en mission" && d.statut !== "Annulée") {
    items.push({ label: "Annuler la demande", icone: <XCircle className="w-4 h-4" strokeWidth={1.8} />, accent: "danger", action: () => onAnnuler(d) });
  }
  if (d.statut !== "Archivée") {
    items.push({ label: "Archiver", icone: <Archive className="w-4 h-4" strokeWidth={1.8} />, action: () => onArchiver(d) });
  }

  return (
    <div className="relative" ref={boite}>
      <ActionIcone
        label={`Autres actions sur ${d.reference}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={basculer}
      >
        <MoreHorizontal className="w-4 h-4" strokeWidth={1.8} />
      </ActionIcone>
      {ancre && createPortal(
        <div
          ref={menu}
          role="menu"
          className="fixed z-50 rounded-xl overflow-hidden py-1"
          style={{
            top: ancre.top,
            left: ancre.left,
            width: MENU_LARGEUR,
            transform: ancre.versLeHaut ? "translateY(-100%)" : undefined,
            background: DG.surface3,
            border: `1px solid ${DG.borderMedium}`,
            boxShadow: "0 16px 40px rgba(0,0,0,.45)",
          }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => { setAncre(null); it.action(); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] text-left transition-colors duration-150 hover:bg-[rgba(255,255,255,.05)] ${FOCUS_RING}`}
              style={{ color: it.accent ? ACCENTS[it.accent].color : DG.textSecondary }}
            >
              {it.icone}
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bandeau KPI business
// ---------------------------------------------------------------------------

function BandeauBusiness({ synthese: s }: { synthese: Synthese }) {
  return (
    <Carte className="mt-3.5 px-4 py-3.5" fond={DG.surface2}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 flex-1 min-w-[280px]">
          <KpiBusiness
            accent="blue"
            icone={<Users className="w-[15px] h-[15px]" strokeWidth={1.8} />}
            label="Volume total"
            valeur={NOMBRE.format(s.nbEtudiants)}
            sub="étudiants concernés"
          />
          <KpiBusiness
            accent="success"
            icone={<Euro className="w-[15px] h-[15px]" strokeWidth={1.8} />}
            label="Potentiel HT"
            valeur={EUROS.format(s.potentielHT)}
            sub="indicatif, sur demandes validées"
          />
          <KpiBusiness
            accent="violet"
            icone={<BarChart3 className="w-[15px] h-[15px]" strokeWidth={1.8} />}
            label="Taux de conversion"
            valeur={`${s.tauxConversion}%`}
            sub={`objectif ${s.objectifConversion}%`}
          />
          <KpiBusiness
            accent="warning"
            icone={<Clock className="w-[15px] h-[15px]" strokeWidth={1.8} />}
            label="Délai moyen de traitement"
            valeur={s.delaiMoyenJours === null ? "—" : `${s.delaiMoyenJours.toLocaleString("fr-FR")} jours`}
            sub="sur les demandes traitées"
          />
        </div>
        <Link
          href="/operations/missions"
          className={`inline-flex items-center gap-2 h-[42px] px-4 rounded-[9px] text-[13px] font-semibold transition-colors duration-150 ${FOCUS_RING}`}
          style={{ background: "rgba(115, 93, 255, 0.08)", color: DG.violetLight, border: `1px solid ${ACCENTS.violet.ring}` }}
        >
          Voir le pipeline complet
          <ArrowRight className="w-4 h-4" strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    </Carte>
  );
}

function KpiBusiness({
  accent, icone, label, valeur, sub,
}: {
  accent: Accent; icone: React.ReactNode; label: string; valeur: string; sub: string;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Pastille accent={accent} taille={32} rond={false}>{icone}</Pastille>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[.08em] leading-tight" style={{ color: DG.textTertiary }}>{label}</div>
        <div className="text-[18px] font-bold leading-tight mt-0.5" style={{ color: DG.textPrimary }}>{valeur}</div>
        <div className="text-[10.5px] leading-tight" style={{ color: DG.textMuted }}>{sub}</div>
      </div>
    </div>
  );
}
