import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getLivrables } from "@/lib/supabase/queries";
import { LivrableStatutSelect } from "@/components/LivrableStatut";

export default async function LivrablesPage() {
  const livraisonIDF = await getLivrables();
  const valides = livraisonIDF.filter((l) => l.statut === "Validé").length;
  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Production" title="Livrables" badge={`${valides} validés`} badgeColor="green" />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="text-[22px] font-extrabold text-white">Livrables</div>
            <div className="text-[13px] text-white/70 mt-0.5">{valides}/{livraisonIDF.length} validés</div>
          </div>
          <div className="p-4 space-y-2">
            {livraisonIDF.map((l, i) => (
              <div key={l.id} className={`flex items-center gap-3 p-4 bg-white rounded-2xl border ${l.statut === "Validé" ? "border-teal-200" : "border-gray-100"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${l.statut === "Validé" ? "bg-[#1a6b7e] text-white" : "bg-gray-100 text-gray-400"}`}>
                  {l.statut === "Validé" ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-800 truncate">{l.nom}</div>
                  <div className="text-[11px] text-gray-400 truncate">{l.description}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${l.statut === "Validé" ? "bg-teal-50 text-[#1a6b7e]" : l.statut === "En cours" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                  {l.statut}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Livrable", "Description", "Campagne", "Statut", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-[.5px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {livraisonIDF.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">{l.nom}</td>
                    <td className="px-4 py-3 text-[12.5px] text-gray-500">{l.description}</td>
                    <td className="px-4 py-3 text-[12.5px] text-gray-600">IDF Complète 2026</td>
                    <td className="px-4 py-3"><LivrableStatutSelect id={l.id} statut={l.statut} /></td>
                    <td className="px-4 py-3 text-right text-[11.5px]">
                      {l.fichier ? <Link href="/campagnes" className="text-[#4a90d9] hover:underline">Ouvrir →</Link> : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <div className="hidden md:block">
        <ConseilBar text="Tous les livrables de prospection IDF sont validés. Prochaine étape : lancer l'Analytics J+30 le 17 juillet 2026 via /analyse." />
      </div>
    </>
  );
}
