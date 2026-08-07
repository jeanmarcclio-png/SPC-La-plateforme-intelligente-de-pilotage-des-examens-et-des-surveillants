import Link from "next/link";
import { FileText } from "lucide-react";
import type { QuoteSummary } from "@/lib/operations/dashboard";
import { euro } from "@/lib/operations/format";
import { DevisBadge } from "@/components/ops/badges";
import { SectionCard } from "./SectionCard";

export function QuotesCard({ quotes }: { quotes: QuoteSummary[] }) {
  return (
    <SectionCard
      title="Devis récents"
      icon={<FileText className="w-4 h-4" />}
      action={{ label: "Voir tous les devis", href: "/operations/devis" }}
      padBody={false}
    >
      {quotes.length === 0 ? (
        <div className="px-5 py-8 text-center text-[13px] text-slate-500">Aucun devis récent.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[360px]">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70">
                <th className="px-2.5 py-2.5 text-left text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.7px]">Client</th>
                <th className="px-2.5 py-2.5 text-left text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.7px]">Réf.</th>
                <th className="px-2.5 py-2.5 text-right text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.7px]">Montant HT</th>
                <th className="px-2.5 py-2.5 text-left text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.7px]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40 transition-colors">
                  <td className="px-2.5 py-3 text-[12.5px] font-semibold text-slate-800 whitespace-nowrap">
                    <Link href={`/operations/devis/${q.id}`}>{q.client}</Link>
                  </td>
                  <td className="px-2.5 py-3 text-[10px] font-mono text-slate-500 whitespace-nowrap">{q.reference}</td>
                  <td className="px-2.5 py-3 text-right text-[12.5px] font-bold text-slate-800 tabular-nums whitespace-nowrap">{euro(q.montantHT)}</td>
                  <td className="px-2.5 py-3"><DevisBadge statut={q.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
