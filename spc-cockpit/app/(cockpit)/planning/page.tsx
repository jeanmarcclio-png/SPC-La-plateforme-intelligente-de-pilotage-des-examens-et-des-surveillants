import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getEcheances } from "@/lib/supabase/queries";
import { AddEcheanceButton, EcheanceActions } from "@/components/EcheanceModal";

export default async function PlanningPage() {
  const echeances = await getEcheances();
  const urgentes = echeances.filter((e) => e.urgent).length;

  return (
    <>
      <Topbar context="Planning" title="Calendrier opérationnel" badge={urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""}` : undefined} badgeColor="red" />
      <main className="flex-1 overflow-y-auto p-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-semibold text-gray-900">Échéances à venir</div>
            <AddEcheanceButton />
          </div>
          <div className="space-y-2">
            {echeances.length === 0 && (
              <div className="text-center py-8 text-[13px] text-gray-400">Aucune échéance. Cliquez sur &quot;+ Ajouter&quot; pour commencer.</div>
            )}
            {echeances.map((e) => (
              <div
                key={e.id}
                className={`group flex items-center gap-4 p-3 rounded-lg border ${e.urgent ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}
              >
                <span className={`text-[16px] font-extrabold min-w-[52px] ${e.urgent ? "text-red-600" : "text-gray-700"}`}>{e.date}</span>
                <span className="text-[13px] text-gray-700 flex-1">{e.nom}</span>
                <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${e.urgent ? "bg-red-100 text-red-600" : "bg-blue-50 text-[#4a90d9]"}`}>{e.tag}</span>
                <EcheanceActions echeance={e} />
              </div>
            ))}
          </div>
        </div>
      </main>
      <ConseilBar text="Deadline Fin Vague 1 IDF dans 8 jours. Concentrez vos appels sur les prospects A non contactés cette semaine." />
    </>
  );
}
