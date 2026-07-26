"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { parseSallesFromText, parseModeleInfos, type ModeleInfos } from "@/lib/operations/demandes-constants";
import { MODELE_SHEET_INFOS, MODELE_SHEET_SALLES } from "@/lib/operations/demande-export";
import { importerDemande } from "@/app/actions/demandes";
import type { DemandeSalle } from "@/lib/operations/types";

const CRENEAU: Record<string, string> = { matin: "Matin", "apres-midi": "Après-midi" };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400";

type Row = DemandeSalle & { _key: string; _sel: boolean };

function rowInvalid(r: DemandeSalle): boolean {
  return !r.dateExamen || r.etudiants <= 0 || r.surveillants <= 0;
}

export function DemandeImporter() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [infos, setInfos] = useState<ModeleInfos | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setFileName(null); setReadError(null); setParseErrors([]); setInfos(null); setRows([]); setSubmitError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    try {
      let sallesCsv = "";
      let infosRows: (string | number)[][] = [];

      if (file.name.toLowerCase().endsWith(".csv")) {
        sallesCsv = await file.text();
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer());
        const findSheet = (kw: string) => wb.SheetNames.find((n) => norm(n).includes(kw));
        const sallesName = findSheet(norm(MODELE_SHEET_SALLES)) ?? wb.SheetNames[0];
        const infosName = findSheet("contact") ?? findSheet(norm(MODELE_SHEET_INFOS)) ?? findSheet("etablissement");
        if (sallesName) sallesCsv = XLSX.utils.sheet_to_csv(wb.Sheets[sallesName]);
        if (infosName) infosRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets[infosName], { header: 1, blankrows: false });
      }

      const parsedInfos = parseModeleInfos(infosRows);
      const { salles, errors } = parseSallesFromText(sallesCsv);
      setInfos(parsedInfos);
      setParseErrors(errors);
      setRows(salles.map((s, i) => ({ ...s, _key: `imp-${i}`, _sel: !rowInvalid(s) })));
      if (salles.length === 0 && errors.length === 0) setReadError("Aucune salle exploitable dans ce fichier.");
    } catch {
      setReadError("Fichier illisible — formats acceptés : .xlsx, .xls, .csv.");
    } finally {
      e.target.value = "";
    }
  }

  function patchInfo(patch: Partial<ModeleInfos>) {
    setInfos((prev) => (prev ? { ...prev, ...patch } : prev));
  }
  function patchContact(which: "demandeur" | "responsableClient", patch: Partial<ModeleInfos["demandeur"]>) {
    setInfos((prev) => (prev ? { ...prev, [which]: { ...prev[which], ...patch } } : prev));
  }
  function toggle(key: string) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, _sel: !r._sel } : r)));
  }
  function setAll(sel: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, _sel: sel })));
  }

  const selected = rows.filter((r) => r._sel);
  const canSubmit = Boolean(infos?.etablissement?.trim()) && selected.length > 0;

  function submit() {
    if (!infos || !canSubmit) return;
    setSubmitError(null);
    startTransition(async () => {
      const res = await importerDemande({
        etablissement: infos.etablissement,
        campus: infos.campus,
        ville: infos.ville,
        typeEtablissement: infos.typeEtablissement,
        referenceClient: infos.referenceClient,
        observations: infos.observations,
        demandeur: infos.demandeur,
        responsableClient: infos.responsableClient,
        salles: selected.map(({ _key, _sel, ...s }) => { void _key; void _sel; return s; }),
      });
      if (res.error) setSubmitError(res.error);
      else if (res.id) router.push(`/demandes-client/${res.id}`);
    });
  }

  // ── Étape 1 : dépôt du fichier ──
  if (!infos) {
    return (
      <div className="space-y-3">
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-gray-300 bg-gray-50/50 py-12 px-4 text-center cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors">
          <Upload className="w-7 h-7 text-[var(--color-primary)]" />
          <div className="text-[14px] text-gray-700"><span className="font-semibold text-[var(--color-primary)]">Choisir un fichier</span> — modèle SPC rempli par le client</div>
          <div className="text-[12px] text-gray-400">Excel (.xlsx, .xls) ou CSV · l&apos;onglet « Salles » est lu automatiquement</div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
        </label>
        {fileName && <div className="text-[12px] text-gray-500 flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {fileName}</div>}
        {readError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-600">{readError}</div>}
      </div>
    );
  }

  // ── Étape 2 : aperçu & validation ──
  const nbInvalid = selected.filter(rowInvalid).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] text-gray-500 flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> {fileName} · <span className="font-semibold text-gray-700">{rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}</span>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /> Changer de fichier</button>
      </div>

      {/* Informations générales (éditables) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-[11px] font-bold uppercase tracking-[1px] text-gray-400 mb-3">Établissement & interlocuteurs</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11.5px] font-semibold text-gray-600">Établissement <span className="text-red-500">*</span></span>
            <input value={infos.etablissement} onChange={(e) => patchInfo({ etablissement: e.target.value })} placeholder="Nom de l'établissement" className={`${inputCls} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-gray-600">Site / Campus · Ville</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={infos.campus ?? ""} onChange={(e) => patchInfo({ campus: e.target.value })} placeholder="Campus" className={inputCls} />
              <input value={infos.ville ?? ""} onChange={(e) => patchInfo({ ville: e.target.value })} placeholder="Ville" className={inputCls} />
            </div>
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-gray-600">Demandeur — nom · email</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={infos.demandeur.nom ?? ""} onChange={(e) => patchContact("demandeur", { nom: e.target.value })} placeholder="Nom" className={inputCls} />
              <input value={infos.demandeur.email ?? ""} onChange={(e) => patchContact("demandeur", { email: e.target.value })} placeholder="Email" className={inputCls} />
            </div>
          </label>
          <label className="block">
            <span className="text-[11.5px] font-semibold text-gray-600">Responsable client — nom · email</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={infos.responsableClient.nom ?? ""} onChange={(e) => patchContact("responsableClient", { nom: e.target.value })} placeholder="Nom" className={inputCls} />
              <input value={infos.responsableClient.email ?? ""} onChange={(e) => patchContact("responsableClient", { email: e.target.value })} placeholder="Email" className={inputCls} />
            </div>
          </label>
        </div>
      </div>

      {/* Salles détectées */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold uppercase tracking-[1px] text-gray-400">Salles à importer <span className="text-gray-300 normal-case font-medium">· {selected.length}/{rows.length} sélectionnée{selected.length > 1 ? "s" : ""}</span></div>
          <div className="flex items-center gap-2 text-[11.5px]">
            <button type="button" onClick={() => setAll(true)} className="font-semibold text-gray-500 hover:text-gray-700">Tout cocher</button>
            <span className="text-gray-300">·</span>
            <button type="button" onClick={() => setAll(false)} className="font-semibold text-gray-500 hover:text-gray-700">Tout décocher</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["", "Date", "Créneau", "Salle", "Bât.", "Étud.", "Surv.", "Besoins", "Surveillance"].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.4px] ${i >= 5 && i <= 6 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const bad = rowInvalid(r);
                return (
                  <tr key={r._key} className={`border-b border-gray-100 last:border-0 ${!r._sel ? "opacity-40" : bad ? "bg-amber-50/40" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={r._sel} onChange={() => toggle(r._key)} aria-label={`Inclure la salle ${r.salle}`} className="w-4 h-4 accent-[var(--color-primary)]" /></td>
                    <td className="px-3 py-2 text-[12px] text-gray-600 whitespace-nowrap">{r.dateExamen || <span className="text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" />manquante</span>}</td>
                    <td className="px-3 py-2 text-[12px] text-gray-600">{CRENEAU[r.creneau] ?? r.creneau}</td>
                    <td className="px-3 py-2 text-[12.5px] font-mono font-semibold text-gray-800">{r.salle}</td>
                    <td className="px-3 py-2 text-[12px] text-gray-500">{r.batiment ?? "—"}</td>
                    <td className={`px-3 py-2 text-[12.5px] font-semibold text-center ${r.etudiants <= 0 ? "text-amber-600" : "text-gray-800"}`}>{r.etudiants || "—"}</td>
                    <td className={`px-3 py-2 text-[12.5px] font-semibold text-center ${r.surveillants <= 0 ? "text-amber-600" : "text-gray-800"}`}>{r.surveillants || "—"}</td>
                    <td className="px-3 py-2 text-[11px]">{[r.pmr && "PMR", r.tiersTemps && "T.-t."].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-gray-600 whitespace-nowrap">{r.debutSurveillance ?? "—"}–{r.finSurveillance ?? "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-5 text-center text-[12.5px] text-gray-400">Aucune salle détectée dans le fichier.</td></tr>}
            </tbody>
          </table>
        </div>
        {nbInvalid > 0 && (
          <div className="mt-2 text-[11.5px] text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {nbInvalid} salle{nbInvalid > 1 ? "s" : ""} incomplète{nbInvalid > 1 ? "s" : ""} sélectionnée{nbInvalid > 1 ? "s" : ""} — à compléter sur la fiche après import.</div>
        )}
        {parseErrors.length > 0 && (
          <ul className="mt-2 text-[11px] text-gray-500 space-y-0.5">
            {parseErrors.slice(0, 5).map((e, i) => <li key={i}>· {e}</li>)}
            {parseErrors.length > 5 && <li>· … +{parseErrors.length - 5} autre(s)</li>}
          </ul>
        )}
      </div>

      {submitError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-600">{submitError}</div>}

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="text-[12px] text-gray-400">La demande sera créée au statut <span className="font-semibold text-gray-600">« Importée depuis Excel »</span>.</div>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || pending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--color-primary)" }}
        >
          <CheckCircle2 className="w-4 h-4" /> {pending ? "Création…" : `Créer la demande (${selected.length})`}
        </button>
      </div>
    </div>
  );
}
