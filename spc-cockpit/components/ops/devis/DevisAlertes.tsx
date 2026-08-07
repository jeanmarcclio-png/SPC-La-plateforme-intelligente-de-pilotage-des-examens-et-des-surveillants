"use client";

// Alertes & actions prioritaires — des lignes de décision, pas des cartes.
// Chaque alerte porte UNE action : elle filtre le tableau ou ouvre l'écran qui
// permet de traiter le sujet. Aucune alerte décorative : la liste est vide
// quand il n'y a rien à faire, et le dit.

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CalendarX2, CheckCircle2, Clock, FileWarning, Receipt } from "lucide-react";
import type { AlerteDevis, FiltreRapide, NiveauAlerteDevis } from "@/lib/operations/devis-cockpit";

const TON: Record<NiveauAlerteDevis, { fond: string; couleur: string }> = {
  urgent: { fond: "var(--metier-red-soft)", couleur: "var(--metier-red)" },
  attention: { fond: "var(--metier-amber-soft)", couleur: "var(--metier-amber-ink)" },
  info: { fond: "var(--metier-blue-soft)", couleur: "var(--metier-blue)" },
};

const ICONE: Record<string, React.ReactNode> = {
  relance: <Clock className="w-4 h-4" />,
  expiration: <CalendarX2 className="w-4 h-4" />,
  facturation: <Receipt className="w-4 h-4" />,
  brouillons: <FileWarning className="w-4 h-4" />,
  marge: <AlertTriangle className="w-4 h-4" />,
};

const VISIBLES = 3;

export function DevisAlertes({
  alertes,
  onFiltrer,
}: {
  alertes: AlerteDevis[];
  onFiltrer: (f: FiltreRapide) => void;
}) {
  const [tout, setTout] = useState(false);
  const liste = tout ? alertes : alertes.slice(0, VISIBLES);

  return (
    <section
      className="rounded-[15px] border border-[var(--border-soft)] bg-[var(--surface-card)] p-[19px]"
      style={{ boxShadow: "var(--shadow-card)" }}
      aria-labelledby="titre-alertes"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2
          id="titre-alertes"
          className="text-[11px] font-bold uppercase tracking-[0.9px] text-[var(--ink-secondary)]"
        >
          Alertes &amp; actions prioritaires
        </h2>
        {alertes.length > VISIBLES && (
          <button
            type="button"
            onClick={() => setTout((v) => !v)}
            className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] rounded"
          >
            {tout ? "Réduire" : `Voir toutes (${alertes.length})`}
          </button>
        )}
      </div>

      {alertes.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)] py-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--metier-green)" }} aria-hidden />
          Aucune action prioritaire : relances, validités et facturations sont à jour.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border-soft)]">
          {liste.map((a) => {
            const ton = TON[a.niveau];
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: ton.fond, color: ton.couleur }}
                >
                  {ICONE[a.id] ?? <AlertTriangle className="w-4 h-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--ink-primary)] leading-snug">{a.titre}</p>
                  <p className="text-[12px] text-[var(--ink-muted)] mt-0.5">{a.detail}</p>
                </div>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="lift flex-shrink-0 px-3.5 py-2 rounded-[10px] bg-[var(--surface-app-alt)] border border-[var(--border-medium)] text-[12.5px] font-semibold text-[var(--ink-primary)] min-h-[40px] inline-flex items-center"
                  >
                    {a.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => a.filtre && onFiltrer(a.filtre)}
                    className="lift flex-shrink-0 px-3.5 py-2 rounded-[10px] bg-[var(--surface-app-alt)] border border-[var(--border-medium)] text-[12.5px] font-semibold text-[var(--ink-primary)] min-h-[40px]"
                  >
                    {a.cta}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
