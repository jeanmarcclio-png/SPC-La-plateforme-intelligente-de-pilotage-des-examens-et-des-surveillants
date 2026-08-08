"use client";

// Barre de recherche et filtres — une seule ligne, hauteurs identiques (§14).
// Le sélecteur « Toutes périodes » porte sur la PÉRIODE D'EXAMEN du devis ;
// la fenêtre d'analyse du cockpit se règle dans l'en-tête de page.

import { Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import {
  FILTRES_VIDES,
  filtresActifs,
  libelleFiltreRapide,
  type FiltresDevis,
  type FiltreRapide,
  type PeriodeSession,
} from "@/lib/operations/devis-cockpit";

const STATUTS = ["Brouillon", "Envoyé", "Accepté", "Refusé", "Facturé"];

const PERIODES_SESSION: { valeur: PeriodeSession; libelle: string }[] = [
  { valeur: "", libelle: "Toutes périodes" },
  { valeur: "avenir", libelle: "Sessions à venir" },
  { valeur: "mois", libelle: "Sessions ce mois-ci" },
  { valeur: "passees", libelle: "Sessions passées" },
];

const CHAMP =
  "h-10 rounded-[10px] border border-[var(--border-soft)] bg-[var(--surface-card)] text-[12.5px] text-[var(--ink-primary)] px-3";

export function DevisFiltres({
  filtres,
  setFiltres,
  clients,
  avances,
  setAvances,
  dense,
  setDense,
  filtreRapide,
  onEffacerFiltreRapide,
}: {
  filtres: FiltresDevis;
  setFiltres: (f: FiltresDevis) => void;
  clients: string[];
  avances: boolean;
  setAvances: (v: boolean) => void;
  dense: boolean;
  setDense: (v: boolean) => void;
  filtreRapide: FiltreRapide | null;
  onEffacerFiltreRapide: () => void;
}) {
  const nbActifs = filtresActifs(filtres);

  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" aria-hidden />
          <input
            type="search"
            value={filtres.recherche}
            onChange={(e) => setFiltres({ ...filtres, recherche: e.target.value })}
            placeholder="Rechercher un devis, un client, une référence…"
            aria-label="Rechercher un devis, un client, une référence"
            className={`${CHAMP} w-full pl-9`}
          />
        </div>

        <select
          value={filtres.statut}
          onChange={(e) => setFiltres({ ...filtres, statut: e.target.value })}
          aria-label="Filtrer par statut"
          className={CHAMP}
        >
          <option value="">Tous statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filtres.periodeSession}
          onChange={(e) => setFiltres({ ...filtres, periodeSession: e.target.value as PeriodeSession })}
          aria-label="Filtrer par période de session"
          title="Période d'examen du devis"
          className={CHAMP}
        >
          {PERIODES_SESSION.map((p) => (
            <option key={p.valeur} value={p.valeur}>{p.libelle}</option>
          ))}
        </select>

        <select
          value={filtres.client}
          onChange={(e) => setFiltres({ ...filtres, client: e.target.value })}
          aria-label="Filtrer par client"
          className={`${CHAMP} max-w-[190px]`}
        >
          <option value="">Tous clients</option>
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setAvances(!avances)}
          aria-expanded={avances}
          className={`${CHAMP} inline-flex items-center gap-1.5 font-semibold hover:bg-[var(--surface-card-hover)]`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          Filtres avancés
          {nbActifs > 0 && (
            <span
              className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {nbActifs}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDense(!dense)}
          aria-pressed={dense}
          title={dense ? "Affichage confortable" : "Affichage compact"}
          aria-label={dense ? "Passer en affichage confortable" : "Passer en affichage compact"}
          className={`${CHAMP} w-10 flex items-center justify-center !px-0 hover:bg-[var(--surface-card-hover)]`}
        >
          <Rows3 className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {avances && (
        <div className="mt-2.5 rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-app-alt)] p-3.5 flex items-end gap-3 flex-wrap">
          <label className="text-[11.5px] font-semibold text-[var(--ink-secondary)]">
            Montant HT minimum
            <input
              type="number"
              min="0"
              step="50"
              value={filtres.montantMin}
              onChange={(e) => setFiltres({ ...filtres, montantMin: e.target.value })}
              placeholder="0"
              className={`${CHAMP} block mt-1 w-[150px] font-normal`}
            />
          </label>
          <label className="text-[11.5px] font-semibold text-[var(--ink-secondary)]">
            Montant HT maximum
            <input
              type="number"
              min="0"
              step="50"
              value={filtres.montantMax}
              onChange={(e) => setFiltres({ ...filtres, montantMax: e.target.value })}
              placeholder="—"
              className={`${CHAMP} block mt-1 w-[150px] font-normal`}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-[12.5px] text-[var(--ink-primary)] h-10">
            <input
              type="checkbox"
              checked={filtres.prioritaires}
              onChange={(e) => setFiltres({ ...filtres, prioritaires: e.target.checked })}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            Uniquement les devis prioritaires
          </label>
          <button
            type="button"
            onClick={() => setFiltres(FILTRES_VIDES)}
            className="h-10 px-3 rounded-[10px] text-[12.5px] font-semibold text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] ml-auto"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {filtreRapide && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[12px] text-[var(--ink-muted)]">Sélection en cours :</span>
          <button
            type="button"
            onClick={onEffacerFiltreRapide}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {libelleFiltreRapide(filtreRapide)}
            <X className="w-3 h-3" aria-hidden />
            <span className="sr-only">Retirer ce filtre</span>
          </button>
        </div>
      )}
    </div>
  );
}
