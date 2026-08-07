"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Download, FileSpreadsheet, FileText, Pencil, CheckCircle2, ArrowRightCircle, Archive, XCircle, Search } from "lucide-react";
import type { DemandeClient, LigneSalleDemande } from "@/lib/operations/demandes/types";
import { validerDemande, totauxDemande, genererReference, STATUTS_ACTIFS } from "@/lib/operations/demandes/logic";
import { chargerDemandes, enregistrerDemande, nouvelId } from "@/lib/operations/demandes/store";
import { telechargerExcel, telechargerModele, imprimerFiche } from "./exports";
import { DemandeForm } from "./DemandeForm";
import { StatutDemandeBadge } from "./StatutBadge";
import { PageHeader } from "@/components/ops/shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ops/Button";
import { showToast } from "@/components/Toast";
import { Kpi } from "@/components/ops/Kpi";
import { FileClock, ClipboardCheck, ShieldCheck, Briefcase } from "lucide-react";

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

export function DemandesWorkspace() {
  const [demandes, setDemandes] = useState<DemandeClient[] | null>(null);
  const [search, setSearch] = useState("");
  const [statut, setStatut] = useState("");
  const [editing, setEditing] = useState<DemandeClient | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chargement client-only (localStorage) après montage : indisponible au rendu
  // serveur, donc impossible à dériver pendant le render — d'où l'effet.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDemandes(chargerDemandes()); }, []);

  const refs = useMemo(() => (demandes ?? []).map((d) => d.reference), [demandes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (demandes ?? []).filter((d) => {
      if (statut && d.statut !== statut) return false;
      if (q && ![d.reference, d.etablissement, d.demandeur.nom, d.responsableClient.nom, d.responsableSpc].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [demandes, search, statut]);

  const count = (s: string) => (demandes ?? []).filter((d) => d.statut === s).length;

  function persist(d: DemandeClient, msg: string) {
    const list = enregistrerDemande(d);
    setDemandes(list);
    showToast(msg);
  }

  function onSave(d: DemandeClient) {
    persist(d, `Demande ${d.reference} enregistrée`);
    setEditing(null);
  }

  function valider(d: DemandeClient) {
    const errs = validerDemande(d);
    if (errs.length) { showToast(`La demande ne peut pas être validée : ${errs.length} élément(s) à corriger.`, "error"); setEditing(d); return; }
    persist({ ...d, statut: "Validée SPC", updatedAt: new Date().toISOString(), historique: [...d.historique, { action: "Validation SPC", date: new Date().toISOString() }] }, `Demande ${d.reference} validée SPC`);
  }

  function convertir(d: DemandeClient) {
    if (d.statut !== "Validée SPC") { showToast("La demande doit être « Validée SPC » avant conversion.", "error"); return; }
    const missionRef = `EX-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    persist({ ...d, statut: "Convertie en mission", missionRef, updatedAt: new Date().toISOString(), historique: [...d.historique, { action: "Conversion mission", date: new Date().toISOString(), detail: missionRef }] }, `Mission ${missionRef} créée depuis ${d.reference}`);
  }

  function changerStatut(d: DemandeClient, s: DemandeClient["statut"], label: string) {
    persist({ ...d, statut: s, updatedAt: new Date().toISOString(), historique: [...d.historique, { action: label, date: new Date().toISOString() }] }, `Demande ${d.reference} — ${label.toLowerCase()}`);
  }

  async function onImport(file: File) {
    try {
      const lignes = await parseFichierLignes(file);
      if (!lignes.length) { showToast("Aucune ligne exploitable dans le fichier.", "error"); return; }
      const d = blankDemande(refs);
      setEditing({ ...d, lignes, historique: [...d.historique, { action: "Import Excel", date: new Date().toISOString(), detail: `${lignes.length} ligne(s)` }] });
      showToast(`${lignes.length} ligne(s) importée(s) — complétez puis enregistrez.`);
    } catch {
      showToast("Impossible de lire ce fichier.", "error");
    }
  }

  if (demandes === null) {
    return <div className="py-20 text-center text-[13px] text-slate-400">Chargement des demandes…</div>;
  }

  return (
    <>
      <PageHeader
        page="Demandes clients"
        subtitle="Centralisez les demandes de surveillance avant mission et devis"
        actions={
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
            <Button variant="secondary" onClick={() => telechargerModele()}><Download className="w-4 h-4" aria-hidden />Modèle</Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" aria-hidden />Importer Excel/CSV</Button>
            <Button variant="accent" onClick={() => setEditing(blankDemande(refs))}><Plus className="w-4 h-4" aria-hidden />Nouvelle demande client</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="slate" label="Brouillon" value={String(count("Brouillon"))} sub="en cours de saisie" icon={<FileClock className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="amber" label="À vérifier" value={String(count("À vérifier"))} sub="à contrôler" icon={<ClipboardCheck className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="emerald" label="Validées SPC" value={String(count("Validée SPC"))} sub="prêtes à convertir" icon={<ShieldCheck className="w-4 h-4" />} />
        <Kpi variant="vivid" accent="indigo" label="Converties" value={String(count("Convertie en mission"))} sub="en mission" icon={<Briefcase className="w-4 h-4" />} />
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une demande (client, référence, demandeur…)" className="w-full pl-8 pr-3 py-2 text-[12.5px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-300" />
        </div>
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="text-[12.5px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 focus:outline-none">
          <option value="">Tous les statuts</option>
          {[...STATUTS_ACTIFS, "Convertie en mission", "Archivée", "Annulée"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1080px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {["Référence", "Client", "Demandeur", "Responsable client", "Responsable SPC", "Période", "Salles", "Étud.", "Statut", "Actions"].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-[.6px] ${i === 6 || i === 7 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} className="text-center py-12 text-[13px] text-slate-400">Aucune demande. Créez-en une avec « Nouvelle demande client ».</td></tr>}
              {filtered.map((d) => {
                const t = totauxDemande(d);
                return (
                  <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3"><button onClick={() => setEditing(d)} className="text-[12.5px] font-semibold text-indigo-600 hover:underline">{d.reference}</button>{d.missionRef && <div className="text-[10.5px] text-slate-400">→ {d.missionRef}</div>}</td>
                    <td className="px-4 py-3 text-[12.5px] font-medium text-slate-800">{d.etablissement || "—"}{d.campus && <div className="text-[11px] text-slate-400">{d.campus}</div>}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">{[d.demandeur.prenom, d.demandeur.nom].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">{[d.responsableClient.prenom, d.responsableClient.nom].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">{d.responsableSpc || "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">{t.periodeLabel}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700 text-right">{t.nbSalles}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700 text-right">{t.nbEtudiants}</td>
                    <td className="px-4 py-3"><StatutDemandeBadge statut={d.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconBtn label="Modifier" onClick={() => setEditing(d)}><Pencil className="w-4 h-4" /></IconBtn>
                        <IconBtn label="Excel" onClick={() => telechargerExcel(d)}><FileSpreadsheet className="w-4 h-4" /></IconBtn>
                        <IconBtn label="PDF" onClick={() => imprimerFiche(d)}><FileText className="w-4 h-4" /></IconBtn>
                        {(d.statut === "Complète" || d.statut === "À vérifier") && <IconBtn label="Valider SPC" tone="emerald" onClick={() => valider(d)}><CheckCircle2 className="w-4 h-4" /></IconBtn>}
                        {d.statut === "Validée SPC" && <IconBtn label="Convertir en mission" tone="indigo" onClick={() => convertir(d)}><ArrowRightCircle className="w-4 h-4" /></IconBtn>}
                        {d.statut !== "Archivée" && d.statut !== "Convertie en mission" && <IconBtn label="Annuler" tone="rose" onClick={() => changerStatut(d, "Annulée", "Annulation")}><XCircle className="w-4 h-4" /></IconBtn>}
                        <IconBtn label="Archiver" onClick={() => changerStatut(d, "Archivée", "Archivage")}><Archive className="w-4 h-4" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">Le devis n&apos;est jamais calculé ici : Demande → validation SPC → conversion en mission → devis. Données enregistrées localement (MVP interne).</p>

      {/* Formulaire */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Demande ${editing.reference} — ${editing.etablissement || "nouvelle"}` : ""}</DialogTitle>
          </DialogHeader>
          {editing && <DemandeForm demande={editing} onSave={onSave} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function IconBtn({ label, onClick, children, tone = "slate" }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "slate" | "emerald" | "indigo" | "rose" }) {
  const cls = { slate: "text-slate-400 hover:text-slate-700 hover:bg-slate-100", emerald: "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50", indigo: "text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50", rose: "text-slate-400 hover:text-rose-600 hover:bg-rose-50" }[tone];
  return <button onClick={onClick} aria-label={label} title={label} className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${cls}`}>{children}</button>;
}
