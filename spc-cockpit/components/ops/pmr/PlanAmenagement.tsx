"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, MoreVertical,
  Pencil, Plus, SlidersHorizontal, Trash2, XCircle,
} from "lucide-react";
import type { Amenagement, Surveillant } from "@/lib/operations/types";
import type { Conformite, LigneAmenagement, StatutAmenagement } from "@/lib/operations/pmr-vue";
import { createAmenagement, updateAmenagement, deleteAmenagement } from "@/app/actions/amenagements";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/Toast";
import { PMR } from "./tokens";

// Tableau « Plan d'aménagement » (§11) — panneau dark navy, dense et lisible.
// Le CRUD passe par les Server Actions existantes, inchangées : la refonte est
// visuelle et analytique, elle n'altère aucune écriture.

const PAR_PAGE = 8;

const TON_CONFORMITE: Record<Conformite, { teinte: string; icone: typeof CheckCircle2 }> = {
  "Conforme": { teinte: PMR.succes, icone: CheckCircle2 },
  "À confirmer": { teinte: PMR.alerte, icone: AlertTriangle },
  "Surv. manquant": { teinte: PMR.critique, icone: XCircle },
};

const TON_STATUT: Record<StatutAmenagement, string> = {
  "Salle dédiée": PMR.turquoise,
  "Tiers-temps": PMR.cyan,
  "Isolé": PMR.violet,
  "Aménagement": PMR.texteSombreTertiaire,
};

const champSombre =
  "w-full px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40";

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold mb-1" style={{ color: PMR.texteClairSecondaire }}>{label}</label>
      {children}
    </div>
  );
}

function Formulaire({
  initial, surveillants, pending, onSubmit, onCancel,
}: {
  initial?: Amenagement; surveillants: Surveillant[]; pending: boolean;
  onSubmit: (fd: FormData) => void; onCancel: () => void;
}) {
  const style = { background: "#FFFFFF", border: `1px solid ${PMR.bordureClaire}`, color: PMR.texteClairPrimaire };
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
      className="space-y-3.5 mt-1"
    >
      <Champ label="Aménagement *">
        <input name="amenagement" required maxLength={200} defaultValue={initial?.amenagement} placeholder="ex : PMR — Fauteuil roulant" className={champSombre} style={style} />
        <p className="mt-1 text-[11px]" style={{ color: "#B54708" }}>
          Ne saisissez aucune donnée permettant d&apos;identifier un étudiant (nom, prénom, n° candidat…). 200 caractères max.
        </p>
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Salle">
          <input name="salle" defaultValue={initial?.salle ?? ""} placeholder="ex : E31" className={`${champSombre} font-mono`} style={style} />
        </Champ>
        <Champ label="Surveillant dédié">
          <select name="surveillant" defaultValue={initial?.surveillant ?? ""} className={champSombre} style={style}>
            <option value="">— Aucun —</option>
            {surveillants.map((s) => <option key={s.id} value={s.nom}>{s.nom}</option>)}
          </select>
        </Champ>
      </div>
      <label className="flex items-center gap-2 text-[13px] cursor-pointer pt-1" style={{ color: PMR.texteClairPrimaire }}>
        <input type="checkbox" name="tiers_temps" value="true" defaultChecked={initial?.tiersTemps ?? false} className="w-4 h-4 accent-[#2563EB]" />
        Tiers-temps (durée majorée d&apos;1/3)
      </label>
      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 min-h-[40px] rounded-[9px] text-[13px] font-semibold" style={{ border: `1px solid ${PMR.bordureClaire}`, color: PMR.texteClairSecondaire }}>
          Annuler
        </button>
        <button type="submit" disabled={pending} className="flex-1 min-h-[40px] rounded-[9px] text-white text-[13px] font-semibold disabled:opacity-50" style={{ background: PMR.primaire }}>
          {pending ? "Enregistrement…" : initial ? "Enregistrer" : "Ajouter l'aménagement"}
        </button>
      </div>
    </form>
  );
}

type Dialogue = { mode: "create" } | { mode: "edit"; ligne: LigneAmenagement } | { mode: "delete"; ligne: LigneAmenagement } | null;

export function PlanAmenagement({
  lignes, amenagements, surveillants,
}: {
  lignes: LigneAmenagement[]; amenagements: Amenagement[]; surveillants: Surveillant[];
}) {
  const [filtre, setFiltre] = useState<"tous" | Conformite>("tous");
  const [page, setPage] = useState(0);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const filtrees = useMemo(
    () => (filtre === "tous" ? lignes : lignes.filter((l) => l.conformite === filtre)),
    [lignes, filtre]
  );
  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageSure = Math.min(page, pages - 1);
  const visibles = filtrees.slice(pageSure * PAR_PAGE, (pageSure + 1) * PAR_PAGE);

  const brut = (id: number) => amenagements.find((a) => a.id === id);

  function soumettre(fd: FormData) {
    if (!dialogue || dialogue.mode === "delete") return;
    startTransition(async () => {
      const r = dialogue.mode === "edit" ? await updateAmenagement(dialogue.ligne.id, fd) : await createAmenagement(fd);
      if (r.error) return showToast(r.error, "error");
      showToast(dialogue.mode === "edit" ? "Aménagement mis à jour" : "Aménagement ajouté");
      setDialogue(null);
    });
  }

  function supprimer(l: LigneAmenagement) {
    startTransition(async () => {
      const r = await deleteAmenagement(l.id);
      if (r.error) return showToast(r.error, "error");
      showToast(`${l.reference} supprimé`);
      setDialogue(null);
    });
  }

  const FILTRES: { cle: "tous" | Conformite; label: string }[] = [
    { cle: "tous", label: "Tous" },
    { cle: "Conforme", label: "Conformes" },
    { cle: "À confirmer", label: "À confirmer" },
    { cle: "Surv. manquant", label: "Surv. manquant" },
  ];

  return (
    <>
      <section
        aria-labelledby="titre-plan"
        className="rounded-[12px] overflow-hidden"
        style={{ background: PMR.fondPanneau, border: `1px solid ${PMR.bordureSombre}` }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 flex-wrap" style={{ borderBottom: `1px solid ${PMR.bordureSombre}` }}>
          <h2 id="titre-plan" className="flex items-center gap-2 text-[16px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>
            Plan d&apos;aménagement
            <span
              title="Horaires et durées dérivés des créneaux réels de la salle sur la session ; durée majorée d'1/3 pour les tiers-temps."
              className="inline-flex"
            >
              <Info className="w-4 h-4" style={{ color: PMR.texteSombreTertiaire }} aria-hidden />
              <span className="sr-only">
                Horaires et durées dérivés des créneaux réels de la salle sur la session ; durée majorée d&apos;un tiers pour les tiers-temps.
              </span>
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" role="group" aria-label="Filtrer par conformité">
              {FILTRES.map((f) => {
                const actif = filtre === f.cle;
                const n = f.cle === "tous" ? lignes.length : lignes.filter((l) => l.conformite === f.cle).length;
                return (
                  <button
                    key={f.cle}
                    type="button"
                    onClick={() => { setFiltre(f.cle); setPage(0); }}
                    aria-pressed={actif}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-[9px] text-[12px] font-semibold transition-colors"
                    style={actif
                      ? { background: PMR.primaire, color: "#FFFFFF" }
                      : { border: `1px solid ${PMR.bordureSombre}`, color: PMR.texteSombreSecondaire }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
                    {f.label}
                    <span className="text-[10.5px] opacity-80">{n}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setDialogue({ mode: "create" })}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-[9px] text-[12.5px] font-semibold text-white transition-colors hover:opacity-95"
              style={{ background: PMR.primaire }}
            >
              <Plus className="w-4 h-4" aria-hidden />Ajouter
            </button>
          </div>
        </div>

        {/* Desktop : tableau dense */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse min-w-[940px]">
            <caption className="sr-only">
              Plan d&apos;aménagement — {filtrees.length} aménagement(s), page {pageSure + 1} sur {pages}.
            </caption>
            <thead>
              <tr style={{ background: PMR.fondPanneau2 }}>
                {["Réf.", "Étudiant / aménagement", "Salle", "Horaire", "Durée réelle", "Surveillant dédié", "Conformité", "Statut"].map((h) => (
                  <th key={h} scope="col" className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[.8px]" style={{ color: PMR.texteSombreTertiaire }}>
                    {h}
                  </th>
                ))}
                <th scope="col" className="text-right px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[.8px]" style={{ color: PMR.texteSombreTertiaire }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[13px]" style={{ color: PMR.texteSombreSecondaire }}>
                    {lignes.length === 0 ? "Aucun aménagement enregistré pour cette session." : "Aucun aménagement ne correspond au filtre."}
                  </td>
                </tr>
              )}
              {visibles.map((l) => {
                const c = TON_CONFORMITE[l.conformite];
                const IconeC = c.icone;
                return (
                  <tr key={l.id} className="transition-colors hover:bg-[#102F4D]" style={{ borderTop: `1px solid ${PMR.bordureSombre}` }}>
                    <td className="px-4 py-3 text-[12px] font-mono whitespace-nowrap" style={{ color: PMR.texteSombreTertiaire }}>{l.reference}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: PMR.texteSombrePrimaire }}>{l.libelle}</td>
                    <td className="px-4 py-3">
                      {l.salle
                        ? <span className="text-[12px] font-mono font-semibold px-2 py-1 rounded-[6px]" style={{ background: "rgba(255,255,255,0.06)", color: PMR.texteSombrePrimaire }}>{l.salle}</span>
                        : <span className="text-[12px]" style={{ color: PMR.alerte }}>à définir</span>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] whitespace-nowrap" style={{ color: PMR.texteSombreSecondaire }}>
                      {l.horaire ? `${l.horaire.debut} – ${l.horaire.fin}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] font-semibold whitespace-nowrap" style={{ color: PMR.texteSombrePrimaire }}>
                      {l.dureeLabel}
                      {l.tiersTemps && l.dureeMinutes > 0 && <span className="sr-only"> (durée majorée d&apos;un tiers)</span>}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] whitespace-nowrap" style={{ color: l.surveillant ? PMR.texteSombreSecondaire : PMR.critique }}>
                      {l.surveillant ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap" style={{ color: c.teinte }} title={l.motif || undefined}>
                        <IconeC className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                        {l.conformite}
                        {l.motif && <span className="sr-only"> — {l.motif}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: `${TON_STATUT[l.statut]}26`, color: TON_STATUT[l.statut] }}>
                        {l.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5 relative">
                        <button
                          type="button"
                          onClick={() => setDialogue({ mode: "edit", ligne: l })}
                          aria-label={`Modifier l'aménagement ${l.reference}`}
                          className="w-10 h-10 flex items-center justify-center rounded-[9px] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                          style={{ color: PMR.texteSombreSecondaire }}
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenu(menu === l.id ? null : l.id)}
                          aria-haspopup="menu"
                          aria-expanded={menu === l.id}
                          aria-label={`Autres actions pour ${l.reference}`}
                          className="w-10 h-10 flex items-center justify-center rounded-[9px] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                          style={{ color: PMR.texteSombreSecondaire }}
                        >
                          <MoreVertical className="w-4 h-4" aria-hidden />
                        </button>
                        {menu === l.id && (
                          <>
                            <span className="fixed inset-0 z-20" onClick={() => setMenu(null)} aria-hidden />
                            <div role="menu" className="absolute right-0 top-11 z-30 w-[184px] rounded-[10px] overflow-hidden py-1" style={{ background: PMR.fondPanneau2, border: `1px solid ${PMR.bordureSombre}` }}>
                              <button
                                role="menuitem"
                                onClick={() => { setMenu(null); setDialogue({ mode: "delete", ligne: l }); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12.5px] text-left transition-colors hover:bg-[#102F4D]"
                                style={{ color: PMR.critique }}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden />Supprimer…
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile : une fiche par aménagement (§17) */}
        <ul className="md:hidden">
          {visibles.length === 0 && (
            <li className="px-4 py-8 text-center text-[12.5px]" style={{ color: PMR.texteSombreSecondaire }}>
              Aucun aménagement à afficher.
            </li>
          )}
          {visibles.map((l) => {
            const c = TON_CONFORMITE[l.conformite];
            const IconeC = c.icone;
            return (
              <li key={l.id} className="px-4 py-3.5" style={{ borderTop: `1px solid ${PMR.bordureSombre}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono" style={{ color: PMR.texteSombreTertiaire }}>{l.reference}</p>
                    <p className="text-[13.5px] font-bold" style={{ color: PMR.texteSombrePrimaire }}>{l.libelle}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: `${TON_STATUT[l.statut]}26`, color: TON_STATUT[l.statut] }}>
                    {l.statut}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[12px]">
                  <div className="flex gap-1.5"><dt style={{ color: PMR.texteSombreTertiaire }}>Salle</dt><dd style={{ color: PMR.texteSombrePrimaire }}>{l.salle || "—"}</dd></div>
                  <div className="flex gap-1.5"><dt style={{ color: PMR.texteSombreTertiaire }}>Durée</dt><dd style={{ color: PMR.texteSombrePrimaire }}>{l.dureeLabel}</dd></div>
                  <div className="col-span-2 flex gap-1.5"><dt style={{ color: PMR.texteSombreTertiaire }}>Horaire</dt><dd style={{ color: PMR.texteSombrePrimaire }}>{l.horaire ? `${l.horaire.debut} – ${l.horaire.fin}` : "—"}</dd></div>
                  <div className="col-span-2 flex gap-1.5"><dt style={{ color: PMR.texteSombreTertiaire }}>Surveillant</dt><dd style={{ color: l.surveillant ? PMR.texteSombrePrimaire : PMR.critique }}>{l.surveillant ?? "—"}</dd></div>
                </dl>
                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: c.teinte }}>
                    <IconeC className="w-3.5 h-3.5" aria-hidden />{l.conformite}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDialogue({ mode: "edit", ligne: l })}
                    aria-label={`Modifier l'aménagement ${l.reference}`}
                    className="min-h-[40px] px-3.5 rounded-[9px] text-[12px] font-semibold"
                    style={{ border: `1px solid ${PMR.bordureSombre}`, color: PMR.texteSombrePrimaire }}
                  >
                    Modifier
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pied : résultats + pagination (§11) */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap" style={{ borderTop: `1px solid ${PMR.bordureSombre}` }}>
          <p className="text-[12px]" style={{ color: PMR.texteSombreSecondaire }}>
            {filtrees.length} résultat{filtrees.length > 1 ? "s" : ""}
          </p>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={pageSure === 0}
                aria-label="Page précédente"
                className="w-10 h-10 flex items-center justify-center rounded-[9px] disabled:opacity-40 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                style={{ border: `1px solid ${PMR.bordureSombre}`, color: PMR.texteSombreSecondaire }}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </button>
              <span className="min-w-[40px] h-10 flex items-center justify-center rounded-[9px] text-[12.5px] font-bold" style={{ background: PMR.primaire, color: "#FFFFFF" }}>
                {pageSure + 1}
                <span className="sr-only"> sur {pages}</span>
              </span>
              <button
                type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={pageSure >= pages - 1}
                aria-label="Page suivante"
                className="w-10 h-10 flex items-center justify-center rounded-[9px] disabled:opacity-40 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
                style={{ border: `1px solid ${PMR.bordureSombre}`, color: PMR.texteSombreSecondaire }}
              >
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Création / édition */}
      <Dialog open={dialogue?.mode === "create" || dialogue?.mode === "edit"} onOpenChange={(v) => !v && setDialogue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogue?.mode === "edit" ? `Modifier — ${dialogue.ligne.reference}` : "Nouvel aménagement"}</DialogTitle>
          </DialogHeader>
          {(dialogue?.mode === "create" || dialogue?.mode === "edit") && (
            <Formulaire
              initial={dialogue.mode === "edit" ? brut(dialogue.ligne.id) : undefined}
              surveillants={surveillants}
              pending={pending}
              onSubmit={soumettre}
              onCancel={() => setDialogue(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <Dialog open={dialogue?.mode === "delete"} onOpenChange={(v) => !v && setDialogue(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Supprimer l&apos;aménagement ?</DialogTitle></DialogHeader>
          {dialogue?.mode === "delete" && (
            <>
              <p className="text-[13px]" style={{ color: PMR.texteClairSecondaire }}>
                L&apos;aménagement <strong style={{ color: PMR.texteClairPrimaire }}>{dialogue.ligne.reference}</strong> ({dialogue.ligne.libelle})
                sera définitivement supprimé.
              </p>
              <div className="flex gap-2.5 pt-4">
                <button type="button" onClick={() => setDialogue(null)} className="flex-1 min-h-[40px] rounded-[9px] text-[12.5px] font-semibold" style={{ border: `1px solid ${PMR.bordureClaire}`, color: PMR.texteClairSecondaire }}>
                  Annuler
                </button>
                <button type="button" disabled={pending} onClick={() => supprimer(dialogue.ligne)} className="flex-1 min-h-[40px] rounded-[9px] text-white text-[12.5px] font-semibold disabled:opacity-50" style={{ background: PMR.critique }}>
                  {pending ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
