export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevisList, getDevisLignes, getDevisSalles, getDevisEquipe, getFactures, getMissions } from "@/lib/operations/queries";
import type { DevisSalle } from "@/lib/operations/types";
import { DevisBadge } from "@/components/ops/badges";
import { PrintButton } from "@/components/ops/PrintButton";
import { DuplicateDevisButton } from "@/components/ops/DuplicateDevisButton";
import { euro, dateFR } from "@/lib/operations/format";
import { calculateDevisTotals, parseTimeToMinutes, eurosToCents, centsToEuros } from "@/lib/operations/engine";
import { ArrowLeft, CheckCircle2, Euro, CalendarClock, Briefcase, AlertTriangle } from "lucide-react";

const NAVY = "#0d2137";

function mins(hm?: string): number | null {
  if (!hm) return null;
  try {
    return parseTimeToMinutes(hm);
  } catch {
    return null;
  }
}

function plage(salles: DevisSalle[]): { label: string; heures: number } {
  const debuts = salles.map((s) => mins(s.debut)).filter((v): v is number => v !== null);
  const fins = salles.map((s) => mins(s.fin)).filter((v): v is number => v !== null);
  if (!debuts.length || !fins.length) return { label: "Non", heures: 0 };
  const d = Math.min(...debuts);
  const f = Math.max(...fins);
  const fmt = (v: number) => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  return { label: `${fmt(d)}–${fmt(f)}`, heures: (f - d) / 60 };
}

function joursCalendaires(debut?: string, fin?: string): number | null {
  if (!debut || !fin) return null;
  const d = new Date(debut + "T00:00:00");
  const f = new Date(fin + "T00:00:00");
  if (isNaN(d.getTime()) || isNaN(f.getTime())) return null;
  return Math.round((f.getTime() - d.getTime()) / 86400000) + 1;
}

function joursOuvres(debut?: string, fin?: string): number | null {
  if (!debut || !fin) return null;
  const d = new Date(debut + "T00:00:00");
  const f = new Date(fin + "T00:00:00");
  if (isNaN(d.getTime()) || isNaN(f.getTime())) return null;
  let n = 0;
  for (const cur = new Date(d); cur <= f; cur.setDate(cur.getDate() + 1)) {
    const j = cur.getDay();
    if (j !== 0 && j !== 6) n++;
  }
  return n;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[1px] text-gray-500 mb-0.5">{label}</div>
      <div className="text-[13.5px] font-bold text-gray-900">{value}</div>
    </div>
  );
}

function SallesTable({ titre, salles }: { titre: string; salles: DevisSalle[] }) {
  if (salles.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 mb-2.5">{titre}</h2>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full border-collapse min-w-[620px]">
          <thead>
            <tr style={{ background: NAVY }}>
              {["N° salle", "Étudiants", "Surv.", "PMR", "Tiers-t.", "Début", "Fin", "Observations"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-bold text-white/80 uppercase tracking-[.8px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {salles.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900">{s.salle}</td>
                <td className="px-4 py-2.5 text-[13px] text-gray-700">{s.etudiants}</td>
                <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900">{s.surveillants}</td>
                <td className="px-4 py-2.5 text-[12px]">{s.pmr ? <span className="font-bold text-amber-600">PMR</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-[12px]">{s.tiersTemps ? <span className="font-bold text-sky-600">1/3</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2.5 text-[12.5px] font-mono text-gray-700">{s.debut ?? "—"}</td>
                <td className="px-4 py-2.5 text-[12.5px] font-mono text-gray-700">{s.fin ?? "—"}</td>
                <td className="px-4 py-2.5 text-[12px] text-gray-500">{s.observations ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
              <td className="px-4 py-2.5 text-[12.5px] font-extrabold text-gray-900">Total ({salles.length} salle{salles.length > 1 ? "s" : ""})</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-gray-900">{salles.reduce((t, s) => t + s.etudiants, 0)}</td>
              <td className="px-4 py-2.5 text-[13px] font-extrabold text-gray-900">{salles.reduce((t, s) => t + s.surveillants, 0)}</td>
              <td colSpan={5} className="px-4 py-2.5 text-[12px] font-semibold text-gray-500">
                PMR : {salles.filter((s) => s.pmr).length} · TT : {salles.filter((s) => s.tiersTemps).length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const devisId = Number(id);
  const [devisList, lignes, sallesAll, equipeAll, factures, missions] = await Promise.all([
    getDevisList(), getDevisLignes(), getDevisSalles(), getDevisEquipe(), getFactures(), getMissions(),
  ]);
  const devis = devisList.find((d) => d.id === devisId);
  if (!devis) notFound();
  const equipe = equipeAll.filter((e) => e.devisId === devisId).sort((a, b) => a.ordre - b.ordre);
  const facture = factures.find((f) => f.devisId === devisId);
  const mission = devis.missionId ? missions.find((m) => m.id === devis.missionId) : undefined;

  const lignesDevis = lignes.filter((l) => l.devisId === devisId).sort((a, b) => a.ordre - b.ordre);
  const salles = sallesAll.filter((s) => s.devisId === devisId);
  const sallesMatin = salles.filter((s) => s.session === "matin");
  const sallesApm = salles.filter((s) => s.session === "apres-midi");

  const totalLignes = lignesDevis.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const totalEquipe = equipe.reduce((s, e) => s + e.effectif * e.heuresPers * e.tauxH, 0);
  const baseBrute = equipe.length > 0 ? totalEquipe : lignesDevis.length > 0 ? totalLignes : devis.montantHT;
  const { ht, tva, ttc } = calculateDevisTotals({
    baseBruteHT: baseBrute,
    fraisDeplacement: devis.fraisDeplacement,
    fraisCoordination: devis.fraisCoordination,
    remise: devis.remise,
  });
  const ecart = centsToEuros(eurosToCents(ht) - eurosToCents(devis.montantHT));

  const matin = plage(sallesMatin);
  const apm = plage(sallesApm);
  const heuresJour = matin.heures + apm.heures;
  const calendaires = joursCalendaires(devis.dateDebut, devis.dateFin);
  const retenus = joursOuvres(devis.dateDebut, devis.dateFin);

  return (
    <div className="p-5 md:p-7 max-w-[900px] mx-auto pb-16 print:p-0 print:max-w-none">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <Link href="/operations/devis" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour à la liste
        </Link>
        <div className="flex items-center gap-2.5">
          <DuplicateDevisButton id={devis.id} reference={devis.reference} />
          <PrintButton />
        </div>
      </div>

      {/* Bandeau devis accepté */}
      {(devis.statut === "Accepté" || devis.statut === "Facturé") && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-[13.5px] font-bold text-gray-900">Devis accepté — mission confirmée</div>
              <div className="text-[12px] text-emerald-700">Vous pouvez planifier la session et créer la facture.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mission && (
              <Link href="/operations/missions" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-[12.5px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                <Briefcase className="w-3.5 h-3.5" aria-hidden />
                Mission {mission.reference} →
              </Link>
            )}
            <Link href="/operations/planification" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-[12.5px] font-bold text-gray-700 hover:bg-gray-50 transition-colors">
              <CalendarClock className="w-3.5 h-3.5" aria-hidden />
              Voir le planning →
            </Link>
            <Link href="/operations/facturation" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[12.5px] font-bold transition-opacity hover:opacity-90" style={{ background: NAVY }}>
              <Euro className="w-3.5 h-3.5" aria-hidden />
              Créer la facture →
            </Link>
          </div>
        </div>
      )}

      {/* Document */}
      <article className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 md:p-10 print:border-0 print:shadow-none print:rounded-none">
        {/* En-tête */}
        <header className="flex items-start justify-between gap-4 flex-wrap pb-5 border-b-2" style={{ borderColor: NAVY }}>
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-extrabold" style={{ background: NAVY }}>
                SPC
              </span>
              <span className="text-[13.5px] font-bold text-gray-700">SPC Platform · Surveillance d&apos;examens</span>
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight" style={{ color: NAVY }}>DEVIS PRÉVISIONNEL</h1>
            {devis.session && <p className="text-[13px] text-gray-500 mt-0.5">{devis.session}</p>}
          </div>
          <div className="text-right">
            <div className="text-[17px] font-extrabold font-mono text-gray-900">{devis.reference}</div>
            {devis.dateDebut && <div className="text-[12px] text-gray-400 mt-0.5">Date : {dateFR(devis.dateDebut)}</div>}
            <div className="mt-2"><DevisBadge statut={devis.statut} /></div>
          </div>
        </header>

        {/* Informations client & mission */}
        <section className="py-6 border-b border-gray-100">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 mb-3.5">Informations client &amp; mission</h2>
          <div className="rounded-xl bg-gray-50/70 border border-gray-100 p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
            <Info label="Établissement" value={devis.client} />
            <Info label="Contact" value={devis.contact ?? "—"} />
            <Info label="E-mail" value={devis.email ?? "—"} />
            <Info label="Ville / site" value={devis.ville ?? "—"} />
            <Info label="Type d'épreuve" value={devis.typeEpreuve ?? "—"} />
            <Info label="Date début" value={devis.dateDebut ? dateFR(devis.dateDebut) : "—"} />
            <Info label="Date fin" value={devis.dateFin ? dateFR(devis.dateFin) : "—"} />
            <Info label="Jours calendaires" value={calendaires !== null ? String(calendaires) : "—"} />
            <Info label="Jours retenus" value={retenus !== null ? String(retenus) : "—"} />
            <Info label="Session matin" value={matin.label} />
            <Info label="Session après-midi" value={apm.label} />
            <Info label="Heures / jour" value={heuresJour > 0 ? `${heuresJour.toFixed(2).replace(".", ",")} h` : "—"} />
          </div>
        </section>

        {/* Répartition des salles */}
        {salles.length > 0 && (
          <section className="pt-6">
            <SallesTable titre="Répartition des salles — session du matin" salles={sallesMatin} />
            <SallesTable titre="Répartition des salles — session de l'après-midi" salles={sallesApm} />
          </section>
        )}

        {/* Équipe & volume horaire */}
        {equipe.length > 0 && (
          <section className="pt-2 pb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 mb-2.5">Équipe &amp; volume horaire</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full border-collapse min-w-[560px]">
                <thead>
                  <tr style={{ background: NAVY }}>
                    {["Rôle", "Effectif", "H fact./pers.", "Total heures", "Taux/h", "Sous-total HT"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-bold text-white/80 uppercase tracking-[.8px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipe.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-[13px] font-semibold text-gray-900">{e.role}</td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-700">{e.effectif}</td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-700">{e.heuresPers.toLocaleString("fr-FR")}h</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900">{(e.effectif * e.heuresPers).toLocaleString("fr-FR")}h</td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-700 whitespace-nowrap">{euro(e.tauxH)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900 whitespace-nowrap text-right">{euro(e.effectif * e.heuresPers * e.tauxH)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                    <td className="px-4 py-2.5 text-[12.5px] font-extrabold text-gray-900">TOTAL</td>
                    <td className="px-4 py-2.5 text-[13px] font-extrabold text-gray-900">{equipe.reduce((t, e) => t + e.effectif, 0)}</td>
                    <td />
                    <td className="px-4 py-2.5 text-[13px] font-extrabold text-gray-900">{equipe.reduce((t, e) => t + e.effectif * e.heuresPers, 0).toLocaleString("fr-FR")}h</td>
                    <td />
                    <td className="px-4 py-2.5 text-[13.5px] font-extrabold text-gray-900 whitespace-nowrap text-right">{euro(totalEquipe)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Prestations */}
        <section className="pt-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 mb-2.5">Détail des prestations</h2>
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">Désignation</th>
                <th className="text-right py-2.5 px-3 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px] whitespace-nowrap">Qté</th>
                <th className="text-right py-2.5 px-3 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px] whitespace-nowrap">PU HT</th>
                <th className="text-right py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px] whitespace-nowrap">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lignesDevis.length === 0 ? (
                <tr className="border-b border-gray-100">
                  <td className="py-3.5 text-[13px] text-gray-800">Prestation de surveillance — {devis.session ?? devis.client}</td>
                  <td className="py-3.5 px-3 text-right text-[13px] text-gray-600">1</td>
                  <td className="py-3.5 px-3 text-right text-[13px] text-gray-600 whitespace-nowrap">{euro(devis.montantHT)}</td>
                  <td className="py-3.5 text-right text-[13px] font-bold text-gray-900 whitespace-nowrap">{euro(devis.montantHT)}</td>
                </tr>
              ) : (
                lignesDevis.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-3.5 pr-4 text-[13px] text-gray-800 leading-snug">{l.designation}</td>
                    <td className="py-3.5 px-3 text-right text-[13px] text-gray-600 whitespace-nowrap">
                      {l.quantite.toLocaleString("fr-FR")} {l.unite !== "forfait" ? l.unite : ""}
                    </td>
                    <td className="py-3.5 px-3 text-right text-[13px] text-gray-600 whitespace-nowrap">{euro(l.prixUnitaire)}</td>
                    <td className="py-3.5 text-right text-[13px] font-bold text-gray-900 whitespace-nowrap">{euro(l.quantite * l.prixUnitaire)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Récapitulatif financier */}
          <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-gray-500 mb-2.5">Récapitulatif financier</h2>
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
            <div className="flex justify-between px-4 py-2.5 text-[13px] text-gray-700">
              <span>Base brute HT ({equipe.length > 0 ? "heures × tarifs" : "détail des prestations"})</span>
              <span className="font-semibold">{euro(baseBrute)}</span>
            </div>
            {devis.fraisDeplacement > 0 && (
              <div className="flex justify-between px-4 py-2.5 text-[13px] text-gray-700">
                <span>Frais de déplacement</span>
                <span className="font-semibold">{euro(devis.fraisDeplacement)}</span>
              </div>
            )}
            {devis.fraisCoordination > 0 && (
              <div className="flex justify-between px-4 py-2.5 text-[13px] text-gray-700">
                <span>Frais de coordination</span>
                <span className="font-semibold">{euro(devis.fraisCoordination)}</span>
              </div>
            )}
            {devis.remise > 0 && (
              <div className="flex justify-between px-4 py-2.5 text-[13px] text-red-600">
                <span>Remise</span>
                <span className="font-semibold">− {euro(devis.remise)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 text-[13.5px] font-extrabold text-gray-900">
              <span>Total HT</span>
              <span>{euro(ht)}</span>
            </div>
            <div className="flex justify-between px-4 py-2.5 text-[13px] text-gray-700">
              <span>TVA 20 %</span>
              <span className="font-semibold">{euro(tva)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 text-white rounded-b-xl" style={{ background: NAVY }}>
              <span className="text-[12px] font-bold uppercase tracking-wide">Total TTC</span>
              <span className="text-[17px] font-extrabold">{euro(ttc)}</span>
            </div>
          </div>

          {Math.abs(ecart) >= 0.01 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12.5px] text-amber-800 print:hidden">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              <span>
                Écart de <strong>{euro(Math.abs(ecart))}</strong> entre le total calculé ({euro(ht)}) et le montant
                enregistré sur le devis ({euro(devis.montantHT)}). Mettez à jour le devis ou son détail pour aligner les deux.
              </span>
            </div>
          )}

          {facture && (
            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[13px] text-gray-700">
                <span className="font-bold text-gray-900">Facture {facture.reference}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                Statut : <span className={`font-bold ${facture.statut === "Payée" ? "text-emerald-600" : facture.statut === "En retard" ? "text-red-600" : "text-sky-700"}`}>{facture.statut}</span>
                {facture.echeance && <span className="text-gray-500"> · échéance {dateFR(facture.echeance)}</span>}
              </div>
              <div className="text-[13px] font-bold text-gray-900">
                Reste à encaisser : {euro(facture.statut === "Payée" ? 0 : facture.montantTTC)}
              </div>
            </div>
          )}
        </section>

        {/* Conditions */}
        <footer className="mt-8 pt-5 border-t border-gray-100 text-[11.5px] text-gray-500 leading-relaxed">
          <p className="font-bold text-gray-600 mb-1">Conditions</p>
          <p>
            Devis valable 30 jours à compter de son émission. Règlement à 30 jours date de facture.
            La prestation comprend la coordination terrain, la présence garantie en salle, la prise en
            charge des aménagements (tiers-temps, PMR, isolement) et le rapport post-session transmis
            à la direction des examens.
          </p>
          <p className="mt-3 text-gray-400">
            Bon pour accord — date et signature du client : ______________________________
          </p>
        </footer>
      </article>
    </div>
  );
}
