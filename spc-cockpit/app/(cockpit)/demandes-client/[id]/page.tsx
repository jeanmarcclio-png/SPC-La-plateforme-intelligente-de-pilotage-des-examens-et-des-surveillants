export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { SectionRule } from "@/components/SectionRule";
import { DemandeStatutActions } from "@/components/DemandeStatutActions";
import { DemandeExportButtons } from "@/components/DemandeExportButtons";
import { DemandeConvertButton } from "@/components/DemandeConvertButton";
import { DemandeCorrectionButton } from "@/components/DemandeCorrectionButton";
import { DemandePiecesUploader } from "@/components/DemandePiecesUploader";
import { DemandeLienClient } from "@/components/DemandeLienClient";
import { getDemandeClient, getDemandeJournal, getDemandePieces, getDemandeLien } from "@/lib/operations/demandes";
import { STATUT_META } from "@/lib/operations/demandes-constants";
import { periodeDemande } from "@/lib/operations/demande-export";
import type { Contact } from "@/lib/operations/types";

const CRENEAU: Record<string, string> = { matin: "Matin", "apres-midi": "Après-midi" };

function ContactCard({ titre, c }: { titre: string; c: Contact & { role?: string } }) {
  const nom = [c.prenom, c.nom].filter(Boolean).join(" ").trim() || "—";
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[1px] text-gray-400 mb-1">{titre}</div>
      <div className="text-[14px] font-semibold text-gray-900">{nom}</div>
      <div className="text-[12px] text-gray-500">{c.fonction ?? c.role ?? "—"}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">{[c.email, c.telephone].filter(Boolean).join(" · ") || "—"}</div>
    </div>
  );
}

export default async function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demande = await getDemandeClient(Number(id));
  if (!demande) notFound();
  const [journal, pieces, lien] = await Promise.all([getDemandeJournal(demande.id), getDemandePieces(demande.id), getDemandeLien(demande.id)]);

  const nbEtud = demande.salles.reduce((s, x) => s + x.etudiants, 0);

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Demandes clients" title={demande.etablissement} badge={demande.reference} badgeColor="blue" actions={<DemandeExportButtons demande={demande} />} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
          <Link href="/demandes-client" className="inline-flex items-center gap-1 text-[12px] text-white/70 mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Demandes</Link>
          <div className="text-[19px] font-extrabold text-white">{demande.etablissement}</div>
          <div className="text-[12px] text-white/70 font-mono">{demande.reference}</div>
          <div className="mt-3"><DemandeExportButtons demande={demande} /></div>
        </div>

        <div className="max-w-[1000px] mx-auto p-4 md:p-6 pb-40">
          <div className="hidden md:flex items-center justify-between mb-5">
            <Link href="/demandes-client" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-500 hover:text-gray-700"><ArrowLeft className="w-4 h-4" /> Retour à la liste</Link>
            <div className="flex items-center gap-3">
              <DemandeCorrectionButton id={demande.id} statut={demande.statut} />
              <DemandeConvertButton id={demande.id} statut={demande.statut} missionId={demande.missionId} />
              <DemandeStatutActions id={demande.id} statut={demande.statut} />
            </div>
          </div>

          {/* Bandeau synthèse */}
          <div className="rounded-2xl border border-gray-200 shadow-sm p-5 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUT_META[demande.statut].pill}`}>{demande.statut}</span>
              <span className="text-[12px] text-gray-400">{[demande.ville, demande.typeEtablissement].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { v: demande.salles.length, l: "salles" },
                { v: new Set(demande.salles.map((s) => `${s.dateExamen}|${s.creneau}`)).size, l: "créneaux" },
                { v: nbEtud, l: "étudiants" },
                { v: demande.pmrPresent ? demande.pmrNombre : 0, l: "PMR" },
                { v: demande.tiersTempsPresent ? demande.tiersTempsNombre : 0, l: "tiers-temps" },
              ].map((s, i) => (
                <div key={i} className="text-center bg-gray-50 rounded-xl py-3">
                  <div className="text-[22px] font-extrabold text-gray-900 leading-none">{s.v}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-gray-500 mt-3">Période : <span className="font-semibold text-gray-700">{periodeDemande(demande)}</span></div>
          </div>

          {/* Interlocuteurs */}
          <SectionRule label="Interlocuteurs" className="mt-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ContactCard titre="Demandeur" c={demande.demandeur} />
            <ContactCard titre="Responsable client" c={demande.responsableClient} />
            <ContactCard titre="Responsable SPC" c={{ nom: demande.responsableSpc.nom, role: demande.responsableSpc.role, email: demande.responsableSpc.email }} />
          </div>

          {/* Salles et horaires */}
          <SectionRule label="Salles et horaires demandés" count={`${demande.salles.length} salle${demande.salles.length > 1 ? "s" : ""}`} className="mt-8" />
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Date", "Créneau", "Salle", "Bât.", "Étud.", "Surv.", "Besoins", "Surveillance", "Observations"].map((h, i) => (
                    <th key={i} className={`px-3 py-2 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.4px] ${i >= 4 && i <= 5 ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demande.salles.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-[12px] text-gray-600 whitespace-nowrap">{s.dateExamen ?? "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-gray-600">{CRENEAU[s.creneau] ?? s.creneau}</td>
                    <td className="px-3 py-2 text-[12.5px] font-mono font-semibold text-gray-800">{s.salle}</td>
                    <td className="px-3 py-2 text-[12px] text-gray-500">{s.batiment ?? "—"}</td>
                    <td className="px-3 py-2 text-[12.5px] font-semibold text-gray-800 text-center">{s.etudiants}</td>
                    <td className="px-3 py-2 text-[12.5px] font-semibold text-gray-800 text-center">{s.surveillants}</td>
                    <td className="px-3 py-2 text-[11px]">{[s.pmr && "PMR", s.tiersTemps && "T.-t."].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-gray-600 whitespace-nowrap">{s.debutSurveillance ?? "—"}–{s.finSurveillance ?? "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-gray-500">{s.observations ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Besoins & observations */}
          {(demande.besoinsSpecifiques.length > 0 || demande.observations) && (
            <>
              <SectionRule label="Besoins & observations" className="mt-8" />
              {demande.besoinsSpecifiques.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {demande.besoinsSpecifiques.map((b) => (
                    <span key={b} className="rounded-full border border-gray-200 px-3 py-1 text-[12px] text-gray-600">{b}</span>
                  ))}
                </div>
              )}
              {demande.observations && <p className="text-[13px] text-gray-600 leading-relaxed">{demande.observations}</p>}
            </>
          )}

          {/* Lien client public */}
          <SectionRule label="Lien client" className="mt-8" />
          <DemandeLienClient demandeId={demande.id} lien={lien} />

          {/* Pièces jointes */}
          <SectionRule label="Pièces jointes" count={pieces.length ? `${pieces.length} document${pieces.length > 1 ? "s" : ""}` : undefined} className="mt-8" />
          <DemandePiecesUploader demandeId={demande.id} pieces={pieces} />

          {journal.length > 0 && (
            <>
              <SectionRule label="Historique" count={`${journal.length} action${journal.length > 1 ? "s" : ""}`} className="mt-8" />
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {journal.map((j) => (
                  <div key={j.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 flex-shrink-0" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-gray-800">{j.action}{j.detail && <span className="font-normal text-gray-500"> — {j.detail}</span>}</div>
                      <div className="text-[11px] text-gray-400">{new Date(j.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}{j.utilisateur ? ` · ${j.utilisateur}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            <strong>Document de demande client — sous réserve de validation SPC.</strong> Ne constitue pas un devis définitif.
          </div>
        </div>
      </main>
    </>
  );
}
