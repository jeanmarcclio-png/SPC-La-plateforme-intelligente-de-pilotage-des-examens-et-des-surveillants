"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search, SlidersHorizontal, RotateCcw, Building2, LayoutGrid, List,
  Plus, Pencil, Trash2, Copy, UserPlus, Scale, Download, X, AlertTriangle,
  TriangleAlert, Accessibility, Users, Sparkles, GraduationCap, DoorOpen,
  ShieldAlert, Layers,
} from "lucide-react";
import type { AlerteSalle, NiveauSalle, SalleVue, SallesView } from "@/lib/operations/salles-view";
import { toCSV } from "@/lib/operations/csv";
import { createSalle, updateSalle, deleteSalle } from "@/app/actions/salles";
import { showToast } from "@/components/Toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


// --- Couleurs par niveau (miroir CSS, pour les barres inline) ---------------
const COULEUR_NIVEAU: Record<NiveauSalle, string> = {
  critique: "#F0444B",
  vigilance: "#F59E0B",
  normale: "#2E7BFF",
  faible: "#36D477",
  inutilisee: "#6E7799",
};

const ORDRE_LEGENDE: { niveau: NiveauSalle; libelle: string; regle: string }[] = [
  { niveau: "critique", libelle: "Critique", regle: "dépassement ou anomalie" },
  { niveau: "vigilance", libelle: "Vigilance", regle: "≥ 80 %" },
  { niveau: "normale", libelle: "Normale", regle: "60 – 79 %" },
  { niveau: "faible", libelle: "Faible", regle: "< 60 %" },
  { niveau: "inutilisee", libelle: "Non utilisée", regle: "0 étudiant" },
];

type Tri = "criticite" | "occupation" | "nom" | "capacite";
type ModeVue = "grille" | "liste";
type FiltreAmenagement = "tous" | "pmr" | "tt" | "aucun";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-[rgba(119,151,211,.28)] bg-[#0B1E3A] text-[13px] text-[#F4F7FF] placeholder:text-[#6E7799] focus:outline-none focus:ring-2 focus:ring-[#2E7BFF]/40 focus:border-[#2E7BFF]";

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-[#A4ADC8] mb-1">{label}</label>
      {children}
    </div>
  );
}

function FormulaireSalle({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: SalleVue;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-3.5 mt-1"
    >
      <Champ label="Nom de la salle *">
        <input name="nom" required defaultValue={initial?.nom} placeholder="ex : Salle A21" className={inputCls} />
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Bâtiment">
          <input name="batiment" defaultValue={initial?.batiment ?? ""} placeholder="ex : Bâtiment A" className={inputCls} />
        </Champ>
        <Champ label="Étage">
          <input name="etage" defaultValue={initial?.etage ?? ""} placeholder="ex : 2e étage" className={inputCls} />
        </Champ>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Champ label="Capacité">
          <input name="capacite" type="number" min="0" defaultValue={initial?.capacite ?? 0} className={inputCls} />
        </Champ>
        <Champ label="Étudiants">
          <input name="etudiants" type="number" min="0" defaultValue={initial?.etudiants ?? 0} className={inputCls} />
        </Champ>
        <Champ label="Surveillants">
          <input name="nb_surveillants" type="number" min="0" defaultValue={initial?.nbSurveillants ?? 0} className={inputCls} />
        </Champ>
      </div>
      <div className="flex items-center gap-5 pt-1">
        <label className="flex items-center gap-2 text-[13px] text-[#A4ADC8] cursor-pointer">
          <input type="checkbox" name="pmr" value="true" defaultChecked={initial?.pmr ?? false} className="w-4 h-4 accent-[#2E7BFF]" />
          Accès PMR
        </label>
        <label className="flex items-center gap-2 text-[13px] text-[#A4ADC8] cursor-pointer">
          <input type="checkbox" name="tiers_temps" value="true" defaultChecked={initial?.tiersTemps ?? false} className="w-4 h-4 accent-[#2E7BFF]" />
          Tiers-temps
        </label>
      </div>
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-[rgba(117,155,232,.34)] text-[13px] text-[#A4ADC8] hover:bg-[#173266]"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-lg bg-[#2E7BFF] text-white text-[13px] font-semibold disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter la salle"}
        </button>
      </div>
    </form>
  );
}

function CarteSalle({
  s,
  selectionnee,
  onSelect,
}: {
  s: SalleVue;
  selectionnee: boolean;
  onSelect: () => void;
}) {
  const couleur = COULEUR_NIVEAU[s.niveau];
  return (
    <button
      type="button"
      className={`rc ${s.niveau}`}
      aria-pressed={selectionnee}
      onClick={onSelect}
      aria-label={`${s.nom} — ${s.occupation} % d'occupation — niveau ${s.niveauLabel}`}
    >
      <div className="nm">
        <span>{s.nomCourt}</span>
        {(s.tiersTemps || s.pmr) && (
          <span className="tags">
            {s.tiersTemps && <span className="tag tag-tt">TT</span>}
            {s.pmr && <span className="tag tag-pmr">PMR</span>}
          </span>
        )}
      </div>
      <div className="bar">
        <i style={{ width: `${Math.min(s.occupation, 100)}%`, background: couleur }} />
      </div>
      <div className="mt">
        <span>{s.etudiants}/{s.capacite}</span>
        <span>{s.nbSurveillants} surv.</span>
        <span className="pc" style={{ color: couleur }}>{s.occupation} %</span>
      </div>
      <div className="lo">{[s.batiment, s.etage].filter(Boolean).join(" · ") || "Localisation non renseignée"}</div>
      <span className="lvl">{s.niveauLabel}</span>
    </button>
  );
}

function Donut({ s }: { s: SalleVue }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const part = Math.min(s.occupation, 100) / 100;
  const couleur = COULEUR_NIVEAU[s.niveau];
  return (
    <div className="donut">
      <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`Occupation ${s.occupation} %`}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="8" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke={couleur} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${c * part} ${c}`} transform="rotate(-90 38 38)"
        />
        <text x="38" y="35" textAnchor="middle" fill="#F4F7FF" fontSize="16" fontWeight="800">{s.etudiants}</text>
        <text x="38" y="49" textAnchor="middle" fill="#8B95B8" fontSize="10">/{s.capacite}</text>
      </svg>
      <div className="lg">
        <div><i style={{ background: "#F0444B" }} />Étudiants<b>{s.etudiants}</b></div>
        <div><i style={{ background: "#2E7BFF" }} />Surveillants<b>{s.nbSurveillants}</b></div>
        <div><i style={{ background: "#8B95B8" }} />Places libres<b>{s.placesLibres}</b></div>
        <div><i style={{ background: couleur }} />Taux<b>{s.occupation} %</b></div>
      </div>
    </div>
  );
}

export function SallesCommandCenter({ view }: { view: SallesView }) {
  const [q, setQ] = useState("");
  const [batiment, setBatiment] = useState("tous");
  const [niveau, setNiveau] = useState<"tous" | NiveauSalle>("tous");
  const [amenagement, setAmenagement] = useState<FiltreAmenagement>("tous");
  const [tri, setTri] = useState<Tri>("criticite");
  const [mode, setMode] = useState<ModeVue>("grille");
  const [groupe, setGroupe] = useState(false);
  const [focus, setFocus] = useState<{ ids: number[]; libelle: string } | null>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "edit"; salle: SalleVue } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtresActifs =
    (q.trim() ? 1 : 0) +
    (batiment !== "tous" ? 1 : 0) +
    (niveau !== "tous" ? 1 : 0) +
    (amenagement !== "tous" ? 1 : 0) +
    (focus ? 1 : 0);

  const salles = useMemo(() => {
    const terme = q.trim().toLowerCase();
    const liste = view.salles.filter((s) => {
      if (focus && !focus.ids.includes(s.id)) return false;
      if (batiment !== "tous" && s.batiment !== batiment) return false;
      if (niveau !== "tous" && s.niveau !== niveau) return false;
      if (amenagement === "pmr" && !s.pmr) return false;
      if (amenagement === "tt" && !s.tiersTemps) return false;
      if (amenagement === "aucun" && (s.pmr || s.tiersTemps)) return false;
      if (terme && ![s.nom, s.batiment ?? "", s.etage ?? ""].join(" ").toLowerCase().includes(terme)) return false;
      return true;
    });
    const copie = [...liste];
    if (tri === "occupation") copie.sort((a, b) => b.occupation - a.occupation);
    else if (tri === "nom") copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    else if (tri === "capacite") copie.sort((a, b) => b.capacite - a.capacite);
    return copie; // "criticite" : ordre déjà produit par le moteur
  }, [view.salles, q, batiment, niveau, amenagement, tri, focus]);

  const groupes = useMemo(() => {
    if (!groupe) return null;
    const map = new Map<string, SalleVue[]>();
    for (const s of salles) {
      const cle = s.batiment ?? "Sans bâtiment";
      const arr = map.get(cle);
      if (arr) arr.push(s);
      else map.set(cle, [s]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [salles, groupe]);

  const salleSelectionnee = selection === null ? null : view.salles.find((s) => s.id === selection) ?? null;

  function reinitialiser() {
    setQ(""); setBatiment("tous"); setNiveau("tous"); setAmenagement("tous"); setFocus(null);
  }

  function appliquerAlerte(a: AlerteSalle) {
    if (a.cibles.length === 0) return;
    setFocus({ ids: a.cibles, libelle: a.titre });
    setSelection(null);
  }

  function soumettre(fd: FormData) {
    if (!dialog) return;
    startTransition(async () => {
      const res = dialog.mode === "edit" ? await updateSalle(dialog.salle.id, fd) : await createSalle(fd);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(dialog.mode === "edit" ? `« ${fd.get("nom")} » mise à jour` : `« ${fd.get("nom")} » ajoutée`);
        setDialog(null);
      }
    });
  }

  function supprimer(s: SalleVue) {
    if (!confirm(`Supprimer définitivement « ${s.nom} » ?`)) return;
    startTransition(async () => {
      const res = await deleteSalle(s.id);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`« ${s.nom} » supprimée`);
        if (selection === s.id) setSelection(null);
      }
    });
  }

  function dupliquer(s: SalleVue) {
    const fd = new FormData();
    fd.set("nom", `${s.nom} (copie)`);
    fd.set("batiment", s.batiment ?? "");
    fd.set("etage", s.etage ?? "");
    fd.set("capacite", String(s.capacite));
    fd.set("etudiants", "0");
    fd.set("nb_surveillants", "0");
    if (s.pmr) fd.set("pmr", "true");
    if (s.tiersTemps) fd.set("tiers_temps", "true");
    startTransition(async () => {
      const res = await createSalle(fd);
      if (res.error) showToast(res.error, "error");
      else showToast(`« ${s.nom} » dupliquée`);
    });
  }

  function exporter() {
    const rows: (string | number)[][] = [
      ["Salle", "Bâtiment", "Étage", "Capacité", "Étudiants", "Occupation %", "Surveillants", "Requis", "PMR", "Tiers-temps", "Niveau"],
      ...salles.map((s) => [
        s.nom, s.batiment ?? "", s.etage ?? "", s.capacite, s.etudiants, s.occupation,
        s.nbSurveillants, s.surveillantsRequis, s.pmr ? "oui" : "non", s.tiersTemps ? "oui" : "non", s.niveauLabel,
      ]),
    ];
    const blob = new Blob(["﻿" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${salles.length} salle(s) exportée(s)`);
  }

  const k = view.kpis;

  return (
    <>
      {/* ---------------- FILTRES ---------------- */}
      <div className="flt">
        <label className="fld" style={{ flex: 1 }}>
          <span>RECHERCHE</span>
          <div className="srch">
            <Search className="w-[15px] h-[15px]" aria-hidden />
            <input
              className="ipt" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une salle, un bâtiment…" aria-label="Rechercher une salle"
            />
          </div>
        </label>
        <label className="fld">
          <span>BÂTIMENT</span>
          <select className="ipt" value={batiment} onChange={(e) => setBatiment(e.target.value)}>
            <option value="tous">Tous</option>
            {view.batiments.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="fld">
          <span>STATUT</span>
          <select className="ipt" value={niveau} onChange={(e) => setNiveau(e.target.value as typeof niveau)}>
            <option value="tous">Tous</option>
            {ORDRE_LEGENDE.map((l) => <option key={l.niveau} value={l.niveau}>{l.libelle}</option>)}
          </select>
        </label>
        <label className="fld">
          <span>AMÉNAGEMENT</span>
          <select className="ipt" value={amenagement} onChange={(e) => setAmenagement(e.target.value as FiltreAmenagement)}>
            <option value="tous">Tous</option>
            <option value="pmr">PMR</option>
            <option value="tt">Tiers-temps</option>
            <option value="aucun">Sans aménagement</option>
          </select>
        </label>
        <span className="chipbtn" aria-live="polite">
          <SlidersHorizontal className="w-[15px] h-[15px]" aria-hidden />
          Filtres
          {filtresActifs > 0 && <span className="n">{filtresActifs}</span>}
        </span>
        <button type="button" className="chipbtn" onClick={reinitialiser} disabled={filtresActifs === 0}>
          <RotateCcw className="w-[15px] h-[15px]" aria-hidden />
          Réinitialiser
        </button>
      </div>

      <div className="scroll">
        {/* ---------------- KPI ---------------- */}
        <div className="skpis">
          <div className="skpi">
            <div className="ico ico-green"><DoorOpen className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.sallesConfigurees}</div>
            <div className="k">Salles configurées</div>
            <div className="sub">{view.batiments.length} bâtiment(s)</div>
          </div>
          <div className="skpi">
            <div className="ico ico-purple"><Layers className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.capaciteTotale}</div>
            <div className="k">Capacité totale</div>
            <div className="sub">étudiants</div>
          </div>
          <div className="skpi">
            <div className="ico ico-blue"><GraduationCap className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.etudiantsPlanifies}</div>
            <div className="k">Étudiants planifiés</div>
            <div className="sub">{k.tauxCapacite} % de la capacité</div>
          </div>
          <div className="skpi">
            <div className="ico ico-red"><TriangleAlert className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val" style={{ color: k.sallesCritiques > 0 ? "#F0444B" : undefined }}>{k.sallesCritiques}</div>
            <div className="k">Salles critiques</div>
            <div className="sub">{k.partCritiques} % des salles</div>
          </div>
          <div className="skpi">
            <div className="ico ico-orange"><Scale className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.sallesSousOccupees}</div>
            <div className="k">Salles sous-occupées</div>
            <div className="sub">{k.partSousOccupees} % des salles</div>
          </div>
          <div className="skpi">
            <div className="ico ico-amber"><ShieldAlert className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.alertesActives}</div>
            <div className="k">Alertes actives</div>
            <div className="sub">à traiter</div>
          </div>
          <div className="skpi">
            <div className="ico ico-cyan"><Users className="w-[17px] h-[17px]" aria-hidden /></div>
            <div className="val">{k.surveillantsRequis}</div>
            <div className="k">Surveillants requis</div>
            <div className="sub">
              affectés {k.surveillantsAffectes}
              {k.surveillantsManquants > 0 && ` · manque ${k.surveillantsManquants}`}
            </div>
          </div>
        </div>

        {/* ---------------- ALERTES ---------------- */}
        {view.alertes.length > 0 && (
          <>
            <div className="secttl"><AlertTriangle className="w-4 h-4" aria-hidden />Alertes &amp; actions prioritaires</div>
            <div className="alrow">
              {view.alertes.map((a) => (
                <div key={a.id} className={`alc ${a.ton}`}>
                  <div className="tx">
                    <div className="t">{a.titre}</div>
                    <div className="s">{a.detail}</div>
                  </div>
                  {a.id === "ia" ? (
                    <Link href="/operations/risques" className="go">
                      <Sparkles className="w-[13px] h-[13px] mr-1.5" aria-hidden />{a.cta}
                    </Link>
                  ) : (
                    <button type="button" className="go" onClick={() => appliquerAlerte(a)}>{a.cta}</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ---------------- GRILLE + PANNEAU ---------------- */}
        <div className="secttl" style={{ marginBottom: 10 }}>
          <Building2 className="w-4 h-4" aria-hidden />Vue d’ensemble — Occupation des salles
        </div>

        <div className="board">
          <div className="pnl">
            <div className="pnl-h">
              <h2>{salles.length} salle{salles.length > 1 ? "s" : ""} affichée{salles.length > 1 ? "s" : ""}</h2>
              {focus && (
                <button type="button" className="chipbtn" onClick={() => setFocus(null)} style={{ height: 28 }}>
                  {focus.libelle}<X className="w-[13px] h-[13px]" aria-hidden />
                </button>
              )}
              <div className="sp">
                <button
                  type="button" className="chipbtn" style={{ height: 29 }}
                  onClick={() => setGroupe((g) => !g)} aria-pressed={groupe}
                >
                  <Layers className="w-[14px] h-[14px]" aria-hidden />
                  {groupe ? "Dégrouper" : "Regrouper"}
                </button>
                <div className="tgl" role="group" aria-label="Mode d’affichage">
                  <button type="button" aria-pressed={mode === "grille"} aria-label="Vue grille" onClick={() => setMode("grille")}>
                    <LayoutGrid className="w-[15px] h-[15px]" aria-hidden />
                  </button>
                  <button type="button" aria-pressed={mode === "liste"} aria-label="Vue liste" onClick={() => setMode("liste")}>
                    <List className="w-[15px] h-[15px]" aria-hidden />
                  </button>
                </div>
                <label className="fld" style={{ minWidth: 0 }}>
                  <select
                    className="ipt" style={{ height: 29, fontSize: 11.5 }} value={tri}
                    onChange={(e) => setTri(e.target.value as Tri)} aria-label="Trier les salles"
                  >
                    <option value="criticite">Tri : Criticité</option>
                    <option value="occupation">Tri : Occupation</option>
                    <option value="capacite">Tri : Capacité</option>
                    <option value="nom">Tri : Nom</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="lgd">
              {ORDRE_LEGENDE.map((l) => (
                <span key={l.niveau}>
                  <i style={{ background: COULEUR_NIVEAU[l.niveau] }} />
                  <b>{l.libelle}</b> <span>{l.regle}</span>
                </span>
              ))}
            </div>

            {salles.length === 0 ? (
              <div className="empty">
                Aucune salle ne correspond aux filtres.
                {filtresActifs > 0 && <> <button type="button" className="go" style={{ marginLeft: 8 }} onClick={reinitialiser}>Réinitialiser</button></>}
              </div>
            ) : mode === "liste" ? (
              <div className="tbl-wrap">
                <TableSalles
                  salles={salles} selection={selection} onSelect={setSelection}
                  onEdit={(s) => setDialog({ mode: "edit", salle: s })} onDelete={supprimer} pending={pending}
                />
              </div>
            ) : groupes ? (
              groupes.map(([nom, liste]) => (
                <div className="grp" key={nom}>
                  <h3>{nom.toUpperCase()} — {liste.length}</h3>
                  <div className="grid" style={{ padding: "0 0 4px" }}>
                    {liste.map((s) => (
                      <CarteSalle key={s.id} s={s} selectionnee={selection === s.id} onSelect={() => setSelection(s.id)} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid">
                {salles.map((s) => (
                  <CarteSalle key={s.id} s={s} selectionnee={selection === s.id} onSelect={() => setSelection(s.id)} />
                ))}
                <button type="button" className="addc" onClick={() => setDialog({ mode: "create" })}>
                  <Plus className="w-5 h-5" aria-hidden />
                  Ajouter une salle
                </button>
              </div>
            )}
          </div>

          {/* --------- PANNEAU LATÉRAL --------- */}
          {salleSelectionnee ? (
            <aside className="pnl side-pnl" aria-label={`Détail de ${salleSelectionnee.nom}`}>
              <div className="hd">
                <div style={{ minWidth: 0 }}>
                  <h2>{salleSelectionnee.nomCourt}</h2>
                  <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      className="lvl"
                      style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: ".05em", borderRadius: 4, padding: "3px 7px",
                        textTransform: "uppercase",
                        background: `${COULEUR_NIVEAU[salleSelectionnee.niveau]}26`,
                        color: COULEUR_NIVEAU[salleSelectionnee.niveau],
                      }}
                    >
                      {salleSelectionnee.niveauLabel}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {salleSelectionnee.occupation} % de capacité
                    </span>
                  </div>
                </div>
                <button type="button" className="cls" onClick={() => setSelection(null)} aria-label="Fermer le détail">
                  <X className="w-[17px] h-[17px]" aria-hidden />
                </button>
              </div>

              <div className="blk">
                <h3>Informations générales</h3>
                <dl>
                  <div className="kv"><dt>Bâtiment</dt><dd>{salleSelectionnee.batiment ?? "—"}</dd></div>
                  <div className="kv"><dt>Étage</dt><dd>{salleSelectionnee.etage ?? "—"}</dd></div>
                  <div className="kv"><dt>Capacité</dt><dd>{salleSelectionnee.capacite} étudiants</dd></div>
                  <div className="kv"><dt>Occupés</dt><dd>{salleSelectionnee.etudiants} / {salleSelectionnee.capacite}</dd></div>
                  <div className="kv">
                    <dt>Surveillants</dt>
                    <dd>{salleSelectionnee.nbSurveillants} / {salleSelectionnee.surveillantsRequis} requis</dd>
                  </div>
                </dl>
              </div>

              <div className="blk">
                <h3>Occupation</h3>
                <Donut s={salleSelectionnee} />
              </div>

              <div className="blk">
                <h3>Aménagements</h3>
                <div className="kv">
                  <dt>Tiers-temps</dt>
                  <dd>{salleSelectionnee.tiersTemps ? <span className="tag tag-tt">TT</span> : "—"}</dd>
                </div>
                <div className="kv">
                  <dt>PMR</dt>
                  <dd>{salleSelectionnee.pmr ? <span className="tag tag-pmr">PMR</span> : "—"}</dd>
                </div>
              </div>

              <div className="blk">
                <h3>Notes &amp; risques</h3>
                {salleSelectionnee.notes.length > 0 ? (
                  salleSelectionnee.notes.map((n) => (
                    <div className="note" key={n}>
                      <AlertTriangle className="w-[13px] h-[13px]" aria-hidden />{n}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Aucune note.</div>
                )}
              </div>

              <div className="blk" style={{ borderBottom: 0 }}>
                <h3>Actions rapides</h3>
                <div className="qa">
                  <button type="button" onClick={() => setDialog({ mode: "edit", salle: salleSelectionnee })}>
                    <Pencil className="w-[13px] h-[13px]" aria-hidden />Modifier
                  </button>
                  <button type="button" onClick={() => dupliquer(salleSelectionnee)} disabled={pending}>
                    <Copy className="w-[13px] h-[13px]" aria-hidden />Dupliquer
                  </button>
                  <Link href="/operations/planification">
                    <UserPlus className="w-[13px] h-[13px]" aria-hidden />Affecter
                  </Link>
                  <Link href="/operations/pmr">
                    <Accessibility className="w-[13px] h-[13px]" aria-hidden />PMR / TT
                  </Link>
                  <button type="button" className="danger" onClick={() => supprimer(salleSelectionnee)} disabled={pending}>
                    <Trash2 className="w-[13px] h-[13px]" aria-hidden />Supprimer la salle
                  </button>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="pnl side-pnl" aria-label="Détail de salle">
              <div className="empty" style={{ padding: "34px 18px" }}>
                Sélectionnez une salle pour afficher son détail, ses risques et ses actions.
              </div>
            </aside>
          )}
        </div>

        {/* ---------------- TABLEAU DÉTAILLÉ ---------------- */}
        <div className="secttl"><List className="w-4 h-4" aria-hidden />Détail des salles ({salles.length})</div>
        <div className="pnl">
          <div className="pnl-h">
            <h2>Tableau détaillé</h2>
            <div className="sp">
              <button type="button" className="chipbtn" style={{ height: 29 }} onClick={exporter} disabled={salles.length === 0}>
                <Download className="w-[14px] h-[14px]" aria-hidden />Exporter
              </button>
              <button type="button" className="chipbtn" style={{ height: 29 }} onClick={() => setDialog({ mode: "create" })}>
                <Plus className="w-[14px] h-[14px]" aria-hidden />Nouvelle salle
              </button>
            </div>
          </div>
          <div className="tbl-wrap">
            <TableSalles
              salles={salles} selection={selection} onSelect={setSelection}
              onEdit={(s) => setDialog({ mode: "edit", salle: s })} onDelete={supprimer} pending={pending}
            />
          </div>
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-md bg-[#102352] border border-[rgba(119,151,211,.28)]">
          <DialogHeader>
            <DialogTitle className="text-[#F4F7FF]">
              {dialog?.mode === "edit" ? `Modifier — ${dialog.salle.nom}` : "Nouvelle salle"}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <FormulaireSalle
              initial={dialog.mode === "edit" ? dialog.salle : undefined}
              pending={pending}
              onSubmit={soumettre}
              onCancel={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TableSalles({
  salles, selection, onSelect, onEdit, onDelete, pending,
}: {
  salles: SalleVue[];
  selection: number | null;
  onSelect: (id: number) => void;
  onEdit: (s: SalleVue) => void;
  onDelete: (s: SalleVue) => void;
  pending: boolean;
}) {
  return (
    <table className="tb">
      <thead>
        <tr>
          {["Salle", "Bâtiment", "Capacité", "Étudiants", "Occupation", "Surv.", "PMR", "TT", "Niveau", "Actions"].map((h) => (
            <th key={h} scope="col">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {salles.map((s) => (
          <tr
            key={s.id}
            aria-selected={selection === s.id}
            onClick={() => onSelect(s.id)}
            style={{ cursor: "pointer" }}
          >
            <td>
              <div style={{ fontWeight: 700 }}>{s.nom}</div>
              {s.etage && <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{s.etage}</div>}
            </td>
            <td style={{ color: "var(--text-secondary)" }}>{s.batiment ?? "—"}</td>
            <td>{s.capacite}</td>
            <td>{s.etudiants}</td>
            <td>
              <span className="mini">
                <i style={{ width: `${Math.min(s.occupation, 100)}%`, background: COULEUR_NIVEAU[s.niveau] }} />
              </span>
              <span style={{ fontWeight: 800, color: COULEUR_NIVEAU[s.niveau] }}>{s.occupation} %</span>
            </td>
            <td>
              {s.nbSurveillants}
              {s.surveillantsManquants > 0 && (
                <span style={{ color: "#F6BE55", fontSize: 10.5 }}> (−{s.surveillantsManquants})</span>
              )}
            </td>
            <td>{s.pmr ? <span className="tag tag-pmr">PMR</span> : <span style={{ color: "var(--text-disabled)" }}>—</span>}</td>
            <td>{s.tiersTemps ? <span className="tag tag-tt">TT</span> : <span style={{ color: "var(--text-disabled)" }}>—</span>}</td>
            <td>
              <span className="dot-st" style={{ background: COULEUR_NIVEAU[s.niveau] }} />
              <span style={{ color: "var(--text-secondary)" }}>{s.niveauLabel}</span>
            </td>
            <td onClick={(e) => e.stopPropagation()}>
              <span className="ia">
                <button type="button" onClick={() => onEdit(s)} aria-label={`Modifier ${s.nom}`}>
                  <Pencil className="w-[13px] h-[13px]" aria-hidden />
                </button>
                <button type="button" className="dg" onClick={() => onDelete(s)} disabled={pending} aria-label={`Supprimer ${s.nom}`}>
                  <Trash2 className="w-[13px] h-[13px]" aria-hidden />
                </button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
