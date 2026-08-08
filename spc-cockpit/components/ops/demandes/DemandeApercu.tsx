"use client";

// Aperçu décisionnel d'une demande (lecture seule) — thème Dark Graphite.
// Répond à la question « pourquoi cette demande est-elle à ce pourcentage,
// et que dois-je faire ensuite ? » sans ouvrir le formulaire de saisie.

import { Check, Pencil, X } from "lucide-react";
import type { DemandeClient } from "@/lib/operations/demandes/types";
import { ligneCockpit } from "@/lib/operations/demandes/cockpit";
import { totauxDemande } from "@/lib/operations/demandes/logic";
import { ACCENTS, ACCENT_STATUT, DG, accentCompletude } from "./cockpit-theme";
import { Anneau, BadgeDG, BoutonDG } from "./CockpitUI";

function nomComplet(c: { prenom?: string; nom?: string }): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ").trim();
}

/** « 2026-08-10 » → « 10 août 2026 » (une date ISO ne s'affiche jamais brute). */
function dateFR(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl p-3.5" style={{ background: DG.surface1, border: `1px solid ${DG.borderSoft}` }}>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[.08em] mb-2.5" style={{ color: DG.textTertiary }}>{titre}</h3>
      {children}
    </section>
  );
}

function Champ({ label, valeur }: { label: string; valeur?: string | number | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px]" style={{ color: DG.textMuted }}>{label}</div>
      <div className="text-[12.5px] truncate" style={{ color: DG.textSecondary }}>{valeur || "—"}</div>
    </div>
  );
}

export function DemandeApercu({ demande: d, onEditer }: { demande: DemandeClient; onEditer: () => void }) {
  const l = ligneCockpit(d);
  const t = totauxDemande(d);
  const accentPct = accentCompletude(l.completude.pct);

  return (
    <div className="space-y-3">
      {/* Synthèse */}
      <div className="flex items-center gap-4 flex-wrap">
        <BadgeDG accent={ACCENT_STATUT[d.statut] ?? "neutral"} point>{d.statut}</BadgeDG>
        <div className="flex items-center gap-2">
          <Anneau pct={l.completude.pct} accent={accentPct} taille={26} />
          <span className="text-[12.5px] font-semibold" style={{ color: ACCENTS[accentPct].color }}>{l.completude.pct}% complété</span>
        </div>
        <span className="text-[12.5px]" style={{ color: DG.textTertiary }}>
          {l.periodeLabel} · {t.nbSalles} salle{t.nbSalles > 1 ? "s" : ""} · {t.nbEtudiants} étudiants
        </span>
      </div>

      {/* Prochaine action */}
      <div
        className="rounded-xl px-3.5 py-3"
        style={{ background: ACCENTS.violet.soft, border: `1px solid ${ACCENTS.violet.ring}` }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[.08em]" style={{ color: DG.textTertiary }}>Prochaine action</div>
        <div className="text-[13.5px] font-semibold mt-0.5" style={{ color: DG.textPrimary }}>{l.action.label}</div>
        <div className="text-[11.5px]" style={{ color: DG.textSecondary }}>{l.action.detail}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Bloc titre="Établissement">
          <div className="grid grid-cols-2 gap-2.5">
            <Champ label="Client" valeur={d.etablissement} />
            <Champ label="Campus / site" valeur={d.campus} />
            <Champ label="Ville" valeur={d.ville} />
            <Champ label="Référence client" valeur={d.referenceClient} />
          </div>
        </Bloc>

        <Bloc titre="Interlocuteurs">
          <div className="grid grid-cols-2 gap-2.5">
            <Champ label="Demandeur" valeur={nomComplet(d.demandeur)} />
            <Champ label="Email demandeur" valeur={d.demandeur.email} />
            <Champ label="Responsable client" valeur={nomComplet(d.responsableClient)} />
            <Champ label="Responsable SPC" valeur={d.responsableSpc} />
          </div>
        </Bloc>
      </div>

      {/* Salles et créneaux */}
      <Bloc titre={`Salles et créneaux (${d.lignes.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px] text-[11.5px]">
            <thead>
              <tr style={{ color: DG.textMuted }}>
                {["Date", "Créneau", "Salle", "Étud.", "Surv.", "Examen", "Surveillance"].map((h) => (
                  <th key={h} scope="col" className="px-1.5 py-1 text-left font-semibold uppercase tracking-[.06em] text-[9.5px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.lignes.map((ligne) => (
                <tr key={ligne.id} style={{ borderTop: `1px solid ${DG.borderSoft}`, color: DG.textSecondary }}>
                  <td className="px-1.5 py-1.5 whitespace-nowrap">{dateFR(ligne.date)}</td>
                  <td className="px-1.5 py-1.5">{ligne.creneau || "—"}</td>
                  <td className="px-1.5 py-1.5">{ligne.salle || "—"}</td>
                  <td className="px-1.5 py-1.5">{ligne.etudiants ?? "—"}</td>
                  <td className="px-1.5 py-1.5">{ligne.surveillants ?? "—"}</td>
                  <td className="px-1.5 py-1.5">{ligne.debutExamen && ligne.finExamen ? `${ligne.debutExamen} – ${ligne.finExamen}` : "—"}</td>
                  <td className="px-1.5 py-1.5">{ligne.debutSurveillance && ligne.finSurveillance ? `${ligne.debutSurveillance} – ${ligne.finSurveillance}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloc>

      {/* Détail de complétude */}
      <Bloc titre="Détail de complétude">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
          {l.completude.blocs.map((b) => {
            const complet = b.score >= 1;
            const partiel = b.score > 0 && b.score < 1;
            return (
              <li key={b.cle} className="flex items-center gap-2 text-[11.5px]" style={{ color: complet ? DG.textSecondary : DG.textPrimary }}>
                {complet ? (
                  <Check aria-hidden className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENTS.success.color }} strokeWidth={2.2} />
                ) : (
                  <X aria-hidden className="w-3.5 h-3.5 flex-shrink-0" style={{ color: partiel ? ACCENTS.warning.color : ACCENTS.danger.color }} strokeWidth={2.2} />
                )}
                <span className="truncate">{b.label}</span>
                <span className="ml-auto flex-shrink-0" style={{ color: DG.textMuted }}>
                  {complet ? "OK" : partiel ? `${Math.round(b.score * 100)} %` : "manquant"}
                </span>
              </li>
            );
          })}
        </ul>
      </Bloc>

      {/* Historique */}
      <Bloc titre="Historique">
        <ol className="space-y-1.5">
          {[...d.historique].reverse().map((h, i) => (
            <li key={`${h.date}-${i}`} className="flex items-baseline gap-2 text-[11.5px]">
              <span className="flex-shrink-0" style={{ color: DG.textMuted }}>
                {new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
              <span style={{ color: DG.textSecondary }}>{h.action}</span>
              {h.detail && <span style={{ color: DG.textMuted }}>— {h.detail}</span>}
            </li>
          ))}
        </ol>
      </Bloc>

      <div className="flex justify-end pt-0.5">
        <BoutonDG variante="contour-violet" onClick={onEditer}>
          <Pencil className="w-4 h-4" strokeWidth={1.8} aria-hidden />
          Modifier la demande
        </BoutonDG>
      </div>
    </div>
  );
}
