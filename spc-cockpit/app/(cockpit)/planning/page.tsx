import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getEcheances } from "@/lib/supabase/queries";
import { AddEcheanceButton, EcheanceActions } from "@/components/EcheanceModal";

export default async function PlanningPage() {
  const echeances = await getEcheances();
  const urgentes = echeances.filter((e) => e.urgent).length;

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Planning" title="Calendrier opérationnel" badge={urgentes > 0 ? `${urgentes} urgent${urgentes > 1 ? "s" : ""}` : undefined} badgeColor="red" />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="text-[22px] font-extrabold text-white">Planning</div>
            <div className="text-[13px] text-white/70 mt-0.5">{urgentes > 0 ? `${urgentes} échéance${urgentes > 1 ? "s" : ""} urgente${urgentes > 1 ? "s" : ""}` : "Calendrier opérationnel"}</div>
          </div>
          <div className="p-4 space-y-2">
            {echeances.length === 0 && (
              <div className="text-center py-12 text-[13px] text-gray-400">Aucune échéance.</div>
            )}
            {echeances.map((e) => (
              <div key={e.id} className={`flex items-center gap-3 p-4 rounded-2xl border ${e.urgent ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
                <div className={`w-12 text-center flex-shrink-0`}>
                  <div className={`text-[17px] font-extrabold ${e.urgent ? "text-red-600" : "text-[#1a6b7e]"}`}>{e.date.split(" ")[0]}</div>
                  <div className="text-[10px] text-gray-400">{e.date.split(" ").slice(1).join(" ")}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-800 truncate">{e.nom}</div>
                  <span className={`text-[11px] font-semibold ${e.urgent ? "text-red-500" : "text-[#4a90d9]"}`}>{e.tag}</span>
                </div>
                {e.urgent && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">URGENT</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
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
                <div key={e.id} className={`group flex items-center gap-4 p-3 rounded-lg border ${e.urgent ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                  <span className={`text-[16px] font-extrabold min-w-[52px] ${e.urgent ? "text-red-600" : "text-gray-700"}`}>{e.date}</span>
                  <span className="text-[13px] text-gray-700 flex-1">{e.nom}</span>
                  <span className={`text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${e.urgent ? "bg-red-100 text-red-600" : "bg-blue-50 text-[#4a90d9]"}`}>{e.tag}</span>
                  <EcheanceActions echeance={e} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <ConseilBar text="Deadline Fin Vague 1 IDF dans 8 jours. Concentrez vos appels sur les prospects A non contactés cette semaine." />
      </div>
    </>
  );
}
