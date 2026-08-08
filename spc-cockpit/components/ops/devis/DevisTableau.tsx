"use client";

// Tableau des devis — centre de commandement de la page.
// Chaque ligne répond à trois questions : où en est ce devis, combien il pèse,
// et quelle est la prochaine action. La couleur ne porte JAMAIS seule
// l'information : chaque marqueur de priorité a une icône et un libellé.

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import type { Devis, StatutDevis } from "@/lib/operations/types";
import type { LigneDevis, NiveauPriorite } from "@/lib/operations/devis-cockpit";
import { deleteDevis, duplicateDevis, toggleDevisPriorite } from "@/app/actions/devis";
import { showToast } from "@/components/Toast";
import { euro, dateFR, pctFR } from "@/lib/operations/format";

// Badges de statut — teintes de la direction warm (§17). Volontairement locaux :
// le badge partagé `DevisBadge` porte la palette froide du reste du module.
const STATUT_STYLE: Record<StatutDevis, { fond: string; texte: string }> = {
  Brouillon: { fond: "var(--metier-neutral-soft)", texte: "var(--metier-neutral-ink)" },
  Envoyé: { fond: "var(--metier-blue-soft)", texte: "var(--metier-blue)" },
  Accepté: { fond: "var(--metier-green-soft)", texte: "var(--metier-green-ink)" },
  Refusé: { fond: "var(--metier-red-soft)", texte: "var(--metier-red)" },
  Facturé: { fond: "var(--accent-soft)", texte: "var(--accent)" },
};

const PRIORITE_STYLE: Record<NiveauPriorite, { couleur: string | null; icone: React.ReactNode | null }> = {
  urgent: { couleur: "var(--metier-red)", icone: <AlertCircle className="w-3.5 h-3.5" /> },
  attention: { couleur: "var(--metier-amber)", icone: <Clock className="w-3.5 h-3.5" /> },
  suivi: { couleur: "var(--metier-blue)", icone: <Send className="w-3.5 h-3.5" /> },
  positif: { couleur: "var(--metier-green)", icone: <Check className="w-3.5 h-3.5" /> },
  neutre: { couleur: null, icone: null },
};

const TAILLES = [10, 25, 50];

/**
 * Période de session compacte : « 15 → 26 juin 2026 » quand début et fin
 * tombent le même mois, « 28 juin → 3 juillet 2026 » sinon. Le tableau reste
 * lisible sans sacrifier l'information.
 */
function periodeLabel(d: Devis): string {
  if (!d.dateDebut) return "—";
  if (!d.dateFin || d.dateFin === d.dateDebut) return dateFR(d.dateDebut);
  const [, moisD, anneeD] = [d.dateDebut.slice(8), d.dateDebut.slice(5, 7), d.dateDebut.slice(0, 4)];
  const [, moisF, anneeF] = [d.dateFin.slice(8), d.dateFin.slice(5, 7), d.dateFin.slice(0, 4)];
  if (moisD === moisF && anneeD === anneeF) return `${Number(d.dateDebut.slice(8))} → ${dateFR(d.dateFin)}`;
  if (anneeD === anneeF) {
    const debutSansAnnee = dateFR(d.dateDebut).replace(` ${anneeD}`, "");
    return `${debutSansAnnee} → ${dateFR(d.dateFin)}`;
  }
  return `${dateFR(d.dateDebut)} → ${dateFR(d.dateFin)}`;
}

function mailtoRelance(d: Devis): string {
  const objet = `Relance — devis ${d.reference} (${d.client})`;
  const corps = [
    "Bonjour,",
    "",
    `Je me permets de revenir vers vous au sujet du devis ${d.reference}${d.session ? ` — ${d.session}` : ""}.`,
    "Restant à votre disposition pour ajuster le dispositif de surveillance si nécessaire.",
    "",
    "Bien cordialement,",
    "Survéo — Surveillance d'examens",
  ].join("\n");
  return `mailto:${d.email ?? ""}?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
}

function MargeCell({ ligne }: { ligne: LigneDevis }) {
  if (ligne.margeTaux === null) {
    return (
      <span
        className="text-[12.5px] text-[var(--ink-disabled)]"
        title="Marge non calculable : équipe non chiffrée ou taux de revient inconnu"
      >
        —
      </span>
    );
  }
  const couleur =
    ligne.margeNiveau === "saine"
      ? { fond: "var(--metier-green-soft)", texte: "var(--metier-green-ink)" }
      : ligne.margeNiveau === "surveiller"
        ? { fond: "var(--metier-amber-soft)", texte: "var(--metier-amber-ink)" }
        : { fond: "var(--metier-red-soft)", texte: "var(--metier-red)" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-[11.5px] font-semibold tabular-nums"
      style={{ background: couleur.fond, color: couleur.texte }}
      title={`Marge estimée ${euro(ligne.margeHT ?? 0)} — ${ligne.heuresChiffrees.toLocaleString("fr-FR")} h chiffrées, coût de revient estimé ${euro(ligne.coutEstimeHT ?? 0)}`}
    >
      {pctFR(ligne.margeTaux)}
    </span>
  );
}

function MenuActions({ ligne, onModifier }: { ligne: LigneDevis; onModifier: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const d = ligne.devis;

  useEffect(() => {
    if (!open) return;
    function surClic(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function surEchap(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surEchap);
    };
  }, [open]);

  function basculerPriorite() {
    setOpen(false);
    startTransition(async () => {
      const res = await toggleDevisPriorite(d.id, !d.prioritaire);
      if (res.error) showToast(res.error, "error");
      else showToast(d.prioritaire ? `${d.reference} retiré des prioritaires` : `${d.reference} marqué prioritaire`);
    });
  }

  function supprimer() {
    setOpen(false);
    const message =
      d.statut === "Accepté" || d.statut === "Facturé"
        ? `⚠️ ATTENTION : le devis ${d.reference} est ${d.statut.toUpperCase()}.\nIl peut être lié à une mission, une planification ou une facture.\n\nSupprimer quand même définitivement ?`
        : `Supprimer définitivement le devis ${d.reference} (${d.client}) ?`;
    if (!confirm(message)) return;
    startTransition(async () => {
      const res = await deleteDevis(d.id);
      if (res.error) showToast(res.error, "error");
      else showToast(`${d.reference} supprimé`);
    });
  }

  const item =
    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[12.5px] text-[var(--ink-primary)] hover:bg-[var(--surface-subtle)] text-left transition-colors disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Plus d'actions sur ${d.reference}`}
        title="Plus d'actions"
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] min-w-[232px] rounded-[12px] border border-[var(--border-soft)] bg-[var(--surface-card)] overflow-hidden z-40"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <a
            role="menuitem"
            href={mailtoRelance(d)}
            onClick={() => setOpen(false)}
            className={`${item} ${d.email ? "" : "pointer-events-none opacity-40"}`}
            title={d.email ? `Écrire à ${d.email}` : "Aucune adresse e-mail sur ce devis"}
          >
            <Send className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            Relancer le client
          </a>
          <a
            role="menuitem"
            href={`mailto:${d.email ?? ""}?subject=${encodeURIComponent(`Devis ${d.reference} — ${d.client}`)}`}
            onClick={() => setOpen(false)}
            className={`${item} ${d.email ? "" : "pointer-events-none opacity-40"}`}
          >
            <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            Envoyer par e-mail
          </a>
          <button role="menuitem" type="button" onClick={basculerPriorite} className={item}>
            <Star className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            {d.prioritaire ? "Retirer la priorité" : "Marquer comme prioritaire"}
          </button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onModifier(); }} className={item}>
            <Pencil className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            Modifier le devis
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={supprimer}
            className={`${item} border-t border-[var(--border-soft)]`}
            style={{ color: "var(--metier-red)" }}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

const COLONNES = [
  "Référence",
  "Client",
  "Session",
  "Période",
  "Statut",
  "Montant HT",
  "Montant TTC",
  "Marge estimée",
  "Dernière action",
  "Prochaine action",
  "Actions",
];

export function DevisTableau({
  lignes,
  dense,
  onModifier,
}: {
  lignes: LigneDevis[];
  dense: boolean;
  onModifier: (d: Devis) => void;
}) {
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pages = Math.max(1, Math.ceil(lignes.length / taille));
  const pageCourante = Math.min(page, pages);
  const debut = (pageCourante - 1) * taille;
  const visibles = lignes.slice(debut, debut + taille);
  const cellPad = dense ? "px-3 py-2" : "px-3 py-3";
  // La colonne d'actions porte 4 cibles de 40 px : on lui laisse moins de marge
  // latérale pour que le tableau tienne en entier sur les grands écrans.
  const cellPadActions = dense ? "px-2 py-2" : "px-2 py-3";

  function dupliquer(d: Devis) {
    startTransition(async () => {
      const res = await duplicateDevis(d.id);
      if (res.error) showToast(res.error, "error");
      else {
        showToast(`${d.reference} dupliqué en brouillon`);
        if (res.newId) router.push(`/operations/devis/${res.newId}`);
      }
    });
  }

  return (
    <section
      id="devis-tableau"
      className="rounded-[15px] border border-[var(--border-soft)] bg-[var(--surface-card)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse min-w-[1180px]">
          <caption className="sr-only">
            Devis du cockpit commercial, avec statut, montants, marge estimée et prochaine action.
          </caption>
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-app-alt)]">
              {COLONNES.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={`${c === "Actions" ? cellPadActions : cellPad} text-left text-[10.5px] font-bold uppercase tracking-[0.8px] text-[var(--ink-muted)] whitespace-nowrap ${
                    c === "Montant HT" || c === "Montant TTC" ? "text-right" : ""
                  } ${c === "Actions" ? "text-right" : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={COLONNES.length} className="text-center py-12 text-[13px] text-[var(--ink-muted)]">
                  Aucun devis ne correspond aux filtres.
                </td>
              </tr>
            )}
            {visibles.map((l) => {
              const d = l.devis;
              const p = PRIORITE_STYLE[l.priorite.niveau];
              const statut = STATUT_STYLE[d.statut];
              const attention = l.priorite.niveau === "attention";
              return (
                <tr
                  key={d.id}
                  className="row-hover border-b border-[var(--border-soft)] last:border-0 transition-colors"
                  style={attention ? { background: "rgba(245, 158, 11, 0.05)" } : undefined}
                >
                  <td className={`${cellPad} relative whitespace-nowrap`}>
                    {p.couleur && (
                      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: p.couleur }} />
                    )}
                    <span className="flex items-center gap-2">
                      {p.icone && (
                        <span style={{ color: p.couleur ?? undefined }} title={l.priorite.motif} className="flex-shrink-0">
                          {p.icone}
                          <span className="sr-only">{l.priorite.motif}. </span>
                        </span>
                      )}
                      {d.prioritaire && (
                        <Star className="w-3 h-3 flex-shrink-0" style={{ color: "var(--metier-amber)" }} aria-hidden />
                      )}
                      <Link
                        href={`/operations/devis/${d.id}`}
                        className="text-[12px] font-mono text-[var(--ink-secondary)] hover:text-[var(--accent)] rounded"
                      >
                        {d.reference}
                      </Link>
                    </span>
                  </td>
                  <td className={`${cellPad} text-[13px] font-semibold text-[var(--ink-primary)] whitespace-nowrap`}>
                    {d.client}
                  </td>
                  <td className={`${cellPad} text-[12.5px] text-[var(--ink-secondary)] max-w-[168px]`}>
                    <span className="block truncate" title={d.session ?? undefined}>{d.session ?? "—"}</span>
                  </td>
                  <td className={`${cellPad} text-[12px] text-[var(--ink-secondary)] whitespace-nowrap`}>
                    {periodeLabel(d)}
                  </td>
                  <td className={`${cellPad} whitespace-nowrap`}>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: statut.fond, color: statut.texte }}
                    >
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                      {d.statut}
                    </span>
                  </td>
                  <td className={`${cellPad} text-[13px] text-[var(--ink-secondary)] text-right tabular-nums whitespace-nowrap`}>
                    {euro(d.montantHT)}
                  </td>
                  <td className={`${cellPad} text-[13px] font-bold text-[var(--ink-primary)] text-right tabular-nums whitespace-nowrap`}>
                    {euro(d.montantTTC)}
                  </td>
                  <td className={`${cellPad} whitespace-nowrap`}>
                    <MargeCell ligne={l} />
                  </td>
                  <td className={`${cellPad} text-[12px] text-[var(--ink-secondary)] whitespace-nowrap`}>
                    {l.derniereAction}
                  </td>
                  <td className={`${cellPad} text-[12px] whitespace-nowrap`}>
                    <span
                      className="inline-flex items-center gap-1.5 font-semibold"
                      style={{
                        color:
                          l.prochaineAction.ton === "urgent"
                            ? "var(--metier-red)"
                            : l.prochaineAction.ton === "action"
                              ? "var(--metier-amber-ink)"
                              : "var(--ink-muted)",
                      }}
                    >
                      {l.prochaineAction.ton !== "neutre" && (
                        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                      {l.prochaineAction.libelle}
                    </span>
                  </td>
                  <td className={`${cellPadActions} text-right`}>
                    <div className="row-actions flex items-center justify-end">
                      <Link
                        href={`/operations/devis/${d.id}`}
                        aria-label={`Voir le devis ${d.reference}`}
                        title="Voir le devis"
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
                      >
                        <Eye className="w-4 h-4" aria-hidden />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onModifier(d)}
                        aria-label={`Modifier le devis ${d.reference}`}
                        title="Modifier le devis"
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
                      >
                        <Pencil className="w-4 h-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => dupliquer(d)}
                        disabled={pending}
                        aria-label={`Dupliquer le devis ${d.reference}`}
                        title="Dupliquer"
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-40"
                      >
                        <Copy className="w-4 h-4" aria-hidden />
                      </button>
                      <MenuActions ligne={l} onModifier={() => onModifier(d)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile (§23) : le tableau devient une liste de cartes métier. */}
      <ul className="md:hidden divide-y divide-[var(--border-soft)]">
        {visibles.length === 0 && (
          <li className="text-center py-10 text-[13px] text-[var(--ink-muted)]">
            Aucun devis ne correspond aux filtres.
          </li>
        )}
        {visibles.map((l) => {
          const d = l.devis;
          const p = PRIORITE_STYLE[l.priorite.niveau];
          const statut = STATUT_STYLE[d.statut];
          return (
            <li key={d.id} className="relative px-4 py-3.5">
              {p.couleur && (
                <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: p.couleur }} />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/operations/devis/${d.id}`}
                    className="text-[14px] font-semibold text-[var(--ink-primary)] rounded"
                  >
                    {d.client}
                  </Link>
                  <p className="text-[12px] text-[var(--ink-muted)] truncate">{d.session ?? "—"}</p>
                </div>
                <span
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: statut.fond, color: statut.texte }}
                >
                  <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {d.statut}
                </span>
              </div>

              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <dt className="text-[var(--ink-muted)]">Période</dt>
                  <dd className="text-[var(--ink-secondary)]">{periodeLabel(d)}</dd>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <dt className="text-[var(--ink-muted)]">Marge</dt>
                  <dd><MargeCell ligne={l} /></dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="text-[var(--ink-muted)]">HT</dt>
                  <dd className="text-[var(--ink-secondary)] tabular-nums">{euro(d.montantHT)}</dd>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <dt className="text-[var(--ink-muted)]">TTC</dt>
                  <dd className="font-bold text-[var(--ink-primary)] tabular-nums">{euro(d.montantTTC)}</dd>
                </div>
              </dl>

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <span className="text-[12px] text-[var(--ink-muted)] truncate">{l.derniereAction}</span>
                <span
                  className="text-[12px] font-semibold flex-shrink-0"
                  style={{
                    color:
                      l.prochaineAction.ton === "urgent"
                        ? "var(--metier-red)"
                        : l.prochaineAction.ton === "action"
                          ? "var(--metier-amber-ink)"
                          : "var(--ink-muted)",
                  }}
                >
                  {l.prochaineAction.libelle}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/operations/devis/${d.id}`}
                  className="flex-1 h-10 rounded-[10px] border border-[var(--border-medium)] text-[12.5px] font-semibold text-[var(--ink-primary)] flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden />
                  Voir
                </Link>
                <button
                  type="button"
                  onClick={() => onModifier(d)}
                  className="flex-1 h-10 rounded-[10px] border border-[var(--border-medium)] text-[12.5px] font-semibold text-[var(--ink-primary)] flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden />
                  Modifier
                </button>
                <MenuActions ligne={l} onModifier={() => onModifier(d)} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 border-t border-[var(--border-soft)] bg-[var(--surface-app-alt)]">
        <p className="text-[12px] text-[var(--ink-muted)]">
          {lignes.length === 0
            ? "Aucun devis à afficher"
            : `Affichage ${debut + 1} à ${Math.min(debut + taille, lignes.length)} sur ${lignes.length} devis`}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, pageCourante - 1))}
            disabled={pageCourante === 1}
            aria-label="Page précédente"
            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === pageCourante ? "page" : undefined}
              className="min-w-9 h-9 px-2 rounded-[9px] text-[12.5px] font-semibold transition-colors"
              style={
                n === pageCourante
                  ? { background: "var(--accent-soft)", color: "var(--accent)" }
                  : { color: "var(--ink-secondary)" }
              }
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage(Math.min(pages, pageCourante + 1))}
            disabled={pageCourante === pages}
            aria-label="Page suivante"
            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
          <select
            value={taille}
            onChange={(e) => {
              setTaille(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Nombre de devis par page"
            className="h-9 ml-1 rounded-[9px] border border-[var(--border-soft)] bg-[var(--surface-card)] text-[12px] text-[var(--ink-secondary)] px-2"
          >
            {TAILLES.map((t) => (
              <option key={t} value={t}>{t} / page</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
