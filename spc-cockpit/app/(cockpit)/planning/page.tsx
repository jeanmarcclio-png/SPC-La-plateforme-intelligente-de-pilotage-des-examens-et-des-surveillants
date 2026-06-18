import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { echeances } from "@/lib/data";

export default function PlanningPage() {
  return (
    <>
      <Topbar context="Planning" title="Calendrier opérationnel" />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="text-[14px] font-semibold text-gray-900 mb-4">Échéances à venir</div>
          <div className="space-y-2">
            {echeances.map((e, i) => (
              <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${(e as { urgent?: boolean }).urgent ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                <span className={`text-[16px] font-extrabold min-w-[52px] ${(e as { urgent?: boolean }).urgent ? "text-red-600" : "text-gray-700"}`}>{e.date}</span>
                <span className="text-[13px] text-gray-700 flex-1">{e.nom}</span>
                <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${(e as { urgent?: boolean }).urgent ? "bg-red-100 text-red-600" : "bg-blue-50 text-[#4a90d9]"}`}>{e.tag}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-center text-[13px] text-gray-400">
            Vue calendrier complète — disponible Sprint 2
          </div>
        </div>
      </main>
      <ConseilBar text="Deadline Fin Vague 1 IDF dans 8 jours. Concentrez vos appels sur les prospects A non contactés cette semaine." />
    </>
  );
}
