export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevisList, getDevisLignes } from "@/lib/operations/queries";
import { DevisBadge } from "@/components/ops/badges";
import { PrintButton } from "@/components/ops/PrintButton";
import { euro } from "@/lib/operations/format";
import { ArrowLeft } from "lucide-react";

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const devisId = Number(id);
  const [devisList, lignes] = await Promise.all([getDevisList(), getDevisLignes()]);
  const devis = devisList.find((d) => d.id === devisId);
  if (!devis) notFound();

  const lignesDevis = lignes.filter((l) => l.devisId === devisId).sort((a, b) => a.ordre - b.ordre);
  const totalLignes = lignesDevis.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const ht = lignesDevis.length > 0 ? totalLignes : devis.montantHT;
  const tva = Math.round(ht * 0.2 * 100) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;

  return (
    <div className="p-5 md:p-7 max-w-[860px] mx-auto pb-16 print:p-0 print:max-w-none">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <Link href="/operations/devis" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour aux devis
        </Link>
        <PrintButton />
      </div>

      {/* Document */}
      <article className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 md:p-10 print:border-0 print:shadow-none print:rounded-none">
        {/* En-tête */}
        <header className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b-2" style={{ borderColor: "#0d2137" }}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-extrabold" style={{ background: "#0d2137" }}>
                SPC
              </span>
              <div>
                <div className="text-[16px] font-extrabold text-gray-900 leading-none">SPC — Sécurisation des examens</div>
                <div className="text-[11.5px] text-gray-400 mt-1">Surveillance d&apos;examens pour l&apos;enseignement supérieur</div>
              </div>
            </div>
            <div className="text-[11.5px] text-gray-500 mt-4 leading-relaxed">
              Paris · Île-de-France<br />
              contact@spc-surveillance.fr
            </div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-extrabold tracking-tight" style={{ color: "#0d2137" }}>DEVIS</div>
            <div className="text-[13px] font-mono font-bold text-gray-700 mt-1">{devis.reference}</div>
            <div className="mt-2"><DevisBadge statut={devis.statut} /></div>
          </div>
        </header>

        {/* Client + objet */}
        <div className="grid sm:grid-cols-2 gap-6 py-6 border-b border-gray-100">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400 mb-1.5">Client</div>
            <div className="text-[15px] font-extrabold text-gray-900">{devis.client}</div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[1px] text-gray-400 mb-1.5">Objet</div>
            <div className="text-[13.5px] text-gray-700">{devis.session ?? "Prestation de surveillance d'examens"}</div>
            <div className="text-[12px] text-gray-400 mt-0.5">Équipe mobilisée : {devis.nbSurveillants} surveillant{devis.nbSurveillants > 1 ? "s" : ""}</div>
          </div>
        </div>

        {/* Lignes */}
        <table className="w-full border-collapse my-6">
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

        {/* Totaux */}
        <div className="flex justify-end">
          <div className="w-full sm:w-[280px] space-y-2">
            <div className="flex justify-between text-[13px] text-gray-600">
              <span>Total HT</span>
              <span className="font-semibold">{euro(ht)}</span>
            </div>
            <div className="flex justify-between text-[13px] text-gray-600">
              <span>TVA 20 %</span>
              <span className="font-semibold">{euro(tva)}</span>
            </div>
            <div className="flex justify-between items-center rounded-xl px-4 py-3 text-white" style={{ background: "#0d2137" }}>
              <span className="text-[12px] font-bold uppercase tracking-wide">Total TTC</span>
              <span className="text-[17px] font-extrabold">{euro(ttc)}</span>
            </div>
          </div>
        </div>

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
