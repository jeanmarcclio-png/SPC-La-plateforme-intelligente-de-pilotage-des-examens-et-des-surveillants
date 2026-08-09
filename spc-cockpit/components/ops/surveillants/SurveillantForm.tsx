"use client";

import { useTransition } from "react";
import { useSoumissionUnique } from "@/components/ops/useSoumissionUnique";
import type { Surveillant } from "@/lib/operations/types";
import { createSurveillant, updateSurveillant } from "@/app/actions/surveillants";
import { exporterDonneesSurveillant, anonymiserSurveillant } from "@/app/actions/rgpd";
import { showToast } from "@/components/Toast";
import { Button } from "@/components/ops/Button";
import { Download, ShieldOff } from "lucide-react";

const ROLES = ["Coordinatrice", "Surveillant salle", "Surveillant volant", "Surveillant PMR"];
const STATUTS = ["Disponible", "Planifié", "Annulé", "Indisponible"];

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// Nom de famille pour pré-remplir : nom complet moins le prénom.
function familyNameOf(s?: Surveillant): string {
  if (!s) return "";
  if (s.prenom && s.nom.startsWith(s.prenom)) return s.nom.slice(s.prenom.length).trim();
  return s.nom;
}

function downloadTextFile(name: string, content: string, mime: string) {
  const blob = new Blob([mime.startsWith("text/csv") ? "﻿" + content : content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SurveillantForm({
  mode,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: Surveillant;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  // Verrou SYNCHRONE contre la rafale de clics (BUG-012) — mesuré : 3 clics
  // dans le même tick déclenchaient 3 créations.
  const handleSubmit = useSoumissionUnique((fd) => {
    startTransition(async () => {
      const result = mode === "edit" && initial
        ? await updateSurveillant(initial.id, fd)
        : await createSurveillant(fd);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast(mode === "edit" ? `« ${fd.get("nom")} » mis à jour` : `« ${fd.get("nom")} » ajouté à l'équipe`);
        onDone();
      }
    });
  }, pending);

  // RGPD — droit d'accès / portabilité.
  function handleExport() {
    if (!initial) return;
    startTransition(async () => {
      const res = await exporterDonneesSurveillant(initial.id);
      if (res.error || !res.json) { showToast(res.error ?? "Export impossible", "error"); return; }
      const slug = (res.nom ?? initial.nom).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
      downloadTextFile(`SPC_donnees_${slug}.json`, res.json, "application/json");
      if (res.csv) downloadTextFile(`SPC_affectations_${slug}.csv`, res.csv, "text/csv");
      showToast(`Données de « ${res.nom ?? initial.nom} » exportées (JSON + CSV).`);
    });
  }

  // RGPD — droit à l'effacement (heures conservées pour la paie).
  function handleAnonymize() {
    if (!initial) return;
    if (!confirm(
      `Anonymiser définitivement « ${initial.nom} » ?\n\n` +
      `• Nom, email et téléphone seront effacés\n` +
      `• Le compte de connexion sera supprimé\n` +
      `• Les heures et le taux sont conservés (obligations de paie)\n\n` +
      `Cette action est irréversible et sera journalisée.`
    )) return;
    startTransition(async () => {
      const res = await anonymiserSurveillant(initial.id);
      if (res.error) showToast(res.error, "error");
      else { showToast(`« ${initial.nom} » anonymisé. Agrégats d'heures conservés.`); onDone(); }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3.5 mt-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <input name="prenom" defaultValue={initial?.prenom ?? ""} placeholder="ex : Marie" className={inputCls} />
          </Field>
          <Field label="Nom *">
            <input name="nom" required defaultValue={familyNameOf(initial)} placeholder="ex : Lecomte" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rôle">
            <select name="role" defaultValue={initial?.role ?? "Surveillant salle"} className={inputCls}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Statut">
            <select name="statut" defaultValue={initial?.statut ?? "Disponible"} className={inputCls}>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="prenom@spc.fr" className={inputCls} />
          </Field>
          <Field label="Téléphone">
            <input name="telephone" defaultValue={initial?.telephone ?? ""} placeholder="06 12 34 56 78" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Disponibilité matin">
            <input name="dispo_matin" defaultValue={initial?.dispoMatin ?? ""} placeholder="ex : 08:00–13:00 · Oui" className={inputCls} />
          </Field>
          <Field label="Disponibilité après-midi">
            <input name="dispo_apm" defaultValue={initial?.dispoApm ?? ""} placeholder="ex : 13:30–18:00 · Non" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone / secteur">
            <input name="zone" defaultValue={initial?.zone ?? ""} placeholder="ex : Paris 15e · Saclay" className={inputCls} />
          </Field>
          <Field label="Compétences">
            <input name="qualifications" defaultValue={initial?.qualifications ?? ""} placeholder="ex : PMR · Tiers-temps" className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taux horaire (€)">
            <input name="taux_horaire" type="number" min="0" step="0.5" defaultValue={initial?.tauxHoraire ?? 18} className={inputCls} />
          </Field>
          <Field label="Note (/5)">
            <input name="note" type="number" min="0" max="5" step="0.1" defaultValue={initial?.note ?? 0} className={inputCls} />
          </Field>
        </div>
        <div className="flex gap-2.5 pt-1">
          <button type="button" onClick={onDone} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-opacity"
          >
            {pending ? "Enregistrement…" : mode === "edit" ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>

      {mode === "edit" && initial && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-[11px] font-bold uppercase tracking-[.6px] text-gray-400 mb-2">Données personnelles (RGPD)</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={pending}>
              <Download className="w-3.5 h-3.5" aria-hidden />Exporter les données
            </Button>
            <Button variant="danger" size="sm" onClick={handleAnonymize} disabled={pending}>
              <ShieldOff className="w-3.5 h-3.5" aria-hidden />Anonymiser (effacement)
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            L&apos;export couvre l&apos;identité, les disponibilités et les affectations. L&apos;anonymisation efface les données identifiantes tout en conservant les heures pour la paie (5 ans).
          </p>
        </div>
      )}
    </>
  );
}
