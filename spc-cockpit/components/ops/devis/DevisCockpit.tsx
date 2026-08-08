"use client";

// COCKPIT COMMERCIAL — DEVIS · orchestration de l'écran.
//
// Le view-model arrive calculé du serveur (lib/operations/devis-cockpit) : ce
// composant ne recalcule aucun chiffre métier, il gère l'état d'interaction —
// filtre rapide venu du pipeline ou d'une alerte, filtres du tableau, densité,
// dialogue de saisie — et l'export.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Download, Plus } from "lucide-react";
import type { Devis, DevisSalle } from "@/lib/operations/types";
import {
  appliquerFiltreRapide,
  clientsDistincts,
  filtrerLignes,
  FILTRES_VIDES,
  PERIODES,
  type ClePeriode,
  type CockpitDevis,
  type FiltreRapide,
  type FiltresDevis,
  type LigneDevis,
} from "@/lib/operations/devis-cockpit";
import { PageHeader } from "@/components/ops/shell";
import { toCSV } from "@/lib/operations/csv";
import { DevisKpis } from "./DevisKpis";
import { DevisPipeline } from "./DevisPipeline";
import { DevisAlertes } from "./DevisAlertes";
import { DevisFiltres } from "./DevisFiltres";
import { DevisTableau } from "./DevisTableau";
import { DevisFormDialog, type ModeDialog } from "./DevisFormDialog";

const BOUTON_BASE =
  "lift inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[10px] text-[12.5px] font-semibold transition-colors";

function exporterCSV(lignes: LigneDevis[], suffixe: string) {
  const entetes = [
    "Référence", "Client", "Session", "Début", "Fin", "Statut",
    "Montant HT", "Montant TTC", "Marge estimée %", "Heures chiffrées", "Coût de revient estimé HT",
    "Dernière action", "Prochaine action", "Priorité",
  ];
  const donnees = lignes.map((l) => [
    l.devis.reference,
    l.devis.client,
    l.devis.session ?? "",
    l.devis.dateDebut ?? "",
    l.devis.dateFin ?? "",
    l.devis.statut,
    l.devis.montantHT.toFixed(2),
    l.devis.montantTTC.toFixed(2),
    l.margeTaux === null ? "" : (l.margeTaux * 100).toFixed(1),
    l.heuresChiffrees === 0 ? "" : l.heuresChiffrees.toFixed(2),
    l.coutEstimeHT === null ? "" : l.coutEstimeHT.toFixed(2),
    l.derniereAction,
    l.prochaineAction.libelle,
    l.priorite.motif,
  ]);
  const blob = new Blob(["﻿" + toCSV([entetes, ...donnees])], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devis-spc-${suffixe}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DevisCockpit({
  vue,
  devis,
  devisSalles,
  periode,
  libelle,
  aujourdhui,
}: {
  vue: CockpitDevis;
  devis: Devis[];
  devisSalles: DevisSalle[];
  periode: ClePeriode;
  libelle: string;
  /** Référence temporelle du rendu serveur (ISO), pour des filtres déterministes. */
  aujourdhui: string;
}) {
  const router = useRouter();
  const [filtreRapide, setFiltreRapide] = useState<FiltreRapide | null>(null);
  const [filtres, setFiltres] = useState<FiltresDevis>(FILTRES_VIDES);
  const [avances, setAvances] = useState(false);
  const [dense, setDense] = useState(false);
  const [dialog, setDialog] = useState<ModeDialog | null>(null);

  const maintenant = useMemo(() => new Date(aujourdhui), [aujourdhui]);
  const lignes = useMemo(
    () => filtrerLignes(appliquerFiltreRapide(vue.lignes, filtreRapide), filtres, maintenant),
    [vue.lignes, filtreRapide, filtres, maintenant],
  );
  const clients = useMemo(() => clientsDistincts(vue.lignes), [vue.lignes]);

  function changerPeriode(cle: string) {
    router.push(cle === "tout" ? "/operations/devis" : `/operations/devis?periode=${cle}`, { scroll: false });
  }

  return (
    <>
      <PageHeader
        page="Devis"
        subtitle="Pilotage des devis et suivi du pipeline commercial opérations"
        badge={
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full align-middle"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Cockpit commercial
          </span>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => exporterCSV(lignes, periode)}
              title="Exporter les devis affichés au format CSV"
              className={`${BOUTON_BASE} border border-[var(--border-medium)] bg-[var(--surface-card)] text-[var(--ink-primary)] hover:bg-[var(--surface-card-hover)]`}
            >
              <Download className="w-3.5 h-3.5" aria-hidden />
              Exporter
            </button>
            <button
              type="button"
              onClick={() => setDialog({ mode: "create" })}
              className={`${BOUTON_BASE} text-white`}
              style={{ background: "var(--accent)" }}
            >
              <Plus className="w-4 h-4" aria-hidden />
              Nouveau devis
            </button>
          </>
        }
      />

      <div className="flex justify-end mb-4">
        <label className="inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-card)]">
          <CalendarRange className="w-3.5 h-3.5 text-[var(--ink-muted)]" aria-hidden />
          <span className="text-[12px] text-[var(--ink-muted)]">Période</span>
          <select
            value={periode}
            onChange={(e) => changerPeriode(e.target.value)}
            aria-label="Fenêtre d'analyse du cockpit (date de création des devis)"
            title={`Fenêtre d'analyse : ${libelle}`}
            className="text-[12.5px] font-semibold text-[var(--ink-primary)] bg-transparent focus:outline-none"
          >
            {PERIODES.map((p) => (
              <option key={p.cle} value={p.cle}>{p.libelle}</option>
            ))}
          </select>
        </label>
      </div>

      <DevisKpis kpis={vue.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3.5 mb-5">
        <DevisPipeline pipeline={vue.pipeline} filtre={filtreRapide} onFiltrer={setFiltreRapide} />
        <DevisAlertes alertes={vue.alertes} onFiltrer={setFiltreRapide} />
      </div>

      <DevisFiltres
        filtres={filtres}
        setFiltres={setFiltres}
        clients={clients}
        avances={avances}
        setAvances={setAvances}
        dense={dense}
        setDense={setDense}
        filtreRapide={filtreRapide}
        onEffacerFiltreRapide={() => setFiltreRapide(null)}
      />

      <DevisTableau lignes={lignes} dense={dense} onModifier={(d) => setDialog({ mode: "edit", devis: d })} />

      <DevisFormDialog
        dialog={dialog}
        devis={devis}
        devisSalles={devisSalles}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
