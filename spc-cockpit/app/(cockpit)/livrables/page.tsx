import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge } from "@/components/Badge";
import { getLivrables } from "@/lib/supabase/queries";

export default async function LivrablesPage() {
  const livraisonIDF = await getLivrables();
  return (
    <>
      <Topbar context="Production" title="Livrables" badge="7 validés" badgeColor="green" />
      <main className="flex-1 overflow-y-auto p-5">
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
                  <td className="px-4 py-3"><Badge variant={l.statut === "Validé" ? "valide" : "a-rediger"}>{l.statut}</Badge></td>
                  <td className="px-4 py-3 text-right text-[11.5px]">
                    {l.fichier ? <Link href="/campagnes" className="text-[#4a90d9] hover:underline">Ouvrir →</Link> : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <ConseilBar text="Tous les livrables de prospection IDF sont validés. Prochaine étape : lancer l'Analytics J+30 le 17 juillet 2026 via /analyse." />
    </>
  );
}
