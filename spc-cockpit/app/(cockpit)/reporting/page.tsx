import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { campagnes } from "@/lib/data";

export default function ReportingPage() {
  const totalProspects = campagnes.reduce((s, c) => s + c.nombreProspects, 0);
  const totalChauds = campagnes.reduce((s, c) => s + c.tresChaudes, 0);
  const convRate = Math.round((totalChauds / totalProspects) * 100);

  return (
    <>
      <Topbar context="Reporting" title="Performance commerciale" />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {[
            { label: "Total prospects", value: totalProspects, sub: "3 campagnes actives" },
            { label: "Très chaud", value: totalChauds, sub: `${convRate}% de conversion` },
            { label: "Score BANT moyen", value: "9.4", sub: "Campagnes actives" },
            { label: "Analytics J+30", value: "0/3", sub: "À générer mi-juillet" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{kpi.value}</div>
              <div className="text-[12.5px] text-gray-500 mt-1">{kpi.label}</div>
              <div className="text-[11px] text-gray-400 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center text-[13px] text-gray-400">
          Rapport de performance détaillé disponible à J+30 via <span className="font-semibold text-[#1a6b7e]">/analyse</span>
        </div>
      </main>
      <ConseilBar text="Lancez /analyse à partir du 17 juillet 2026 pour obtenir le rapport de performance complet des campagnes IDF et National Écoles." />
    </>
  );
}
