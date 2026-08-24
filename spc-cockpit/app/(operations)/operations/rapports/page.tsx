export const dynamic = "force-dynamic";

import { getMissions, getSurveillants, getSalles } from "@/lib/operations/queries";
import { Kpi } from "@/components/ops/Kpi";
import { MissionBadge } from "@/components/ops/badges";
import { RapportExportCSV } from "@/components/ops/RapportExportCSV";
import { euro, dateFR } from "@/lib/operations/format";
import { tendanceCA } from "@/lib/operations/stats";
import { Euro, ClipboardCheck, Users, DoorOpen } from "lucide-react";
import { PageHeader } from "@/components/ops/shell";
import { BandeauSource } from "@/components/ops/EtatSource";
import { origineGlobale, premiereErreur } from "@/lib/operations/source";

export default async function RapportsPage() {
  const [jeuMissions, jeuSurveillants, jeuSalles] = await Promise.all([
    getMissions(), getSurveillants(), getSalles(),
  ]);
  const missions = jeuMissions.lignes;
  const surveillants = jeuSurveillants.lignes;
  const salles = jeuSalles.lignes;
  const origine = origineGlobale(jeuMissions, jeuSurveillants, jeuSalles);

  const realisees = missions.filter((m) => m.statut === "Terminée");
  const caTotal = missions.filter((m) => m.statut !== "Annulée").reduce((s, m) => s + m.montantHT, 0);
  const actifs = surveillants.filter((s) => s.statut !== "Indisponible").length;
  const sallesUtilisees = missions.filter((m) => m.statut !== "Annulée").reduce((s, m) => s + m.nbSalles, 0);

  const tendance = tendanceCA(missions);
  const maxMois = Math.max(...tendance.map((t) => t.total), 1);

  return (
    <div className="p-5 md:p-7 w-full max-w-[1560px] mx-auto pb-16">
      <PageHeader
        page="Rapports"
        title="Rapports post-session"
        subtitle="Bilan de l'activité, analyse des missions et export comptable"
        actions={<RapportExportCSV missions={missions} />}
      />

      <BandeauSource origine={origine} detail={premiereErreur(jeuMissions, jeuSurveillants, jeuSalles)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <Kpi variant="vivid" accent="emerald" label="CA total (HT)" value={euro(caTotal)} sub="missions non annulées" icon={<Euro className="w-4 h-4" />} href="/operations/devis" />
        <Kpi variant="vivid" accent="indigo" label="Examens réalisés" value={String(realisees.length)} sub="missions terminées" icon={<ClipboardCheck className="w-4 h-4" />} href="/operations/missions" />
        <Kpi variant="vivid" accent="teal" label="Surveillants actifs" value={String(actifs)} sub={`sur ${surveillants.length} dans l'équipe`} icon={<Users className="w-4 h-4" />} href="/operations/surveillants" />
        <Kpi variant="vivid" accent="cyan" label="Salles utilisées" value={String(sallesUtilisees)} sub={`${salles.length} salles configurées`} icon={<DoorOpen className="w-4 h-4" />} href="/operations/salles" />
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Tendance CA */}
        <section aria-label="Tendance chiffre d'affaires" className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 self-start">
          <h2 className="text-[14px] font-bold text-gray-900">Tendance CA</h2>
          <p className="text-[12px] text-gray-400 mb-4">Montants HT par mois de mission</p>
          {tendance.length === 0 ? (
            <p className="text-[12.5px] text-gray-400 py-4">Aucune mission datée pour l&apos;instant.</p>
          ) : (
            <div className="space-y-2.5">
              {tendance.map((t) => (
                <div key={t.key} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-gray-500 w-12 flex-shrink-0">{t.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((t.total / maxMois) * 100)}%`, background: "#059669" }} />
                  </div>
                  <span className="text-[11.5px] font-semibold text-gray-700 w-[84px] text-right flex-shrink-0">{euro(t.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Historique des missions */}
        <section aria-label="Historique des missions" className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="px-5 pt-4.5 pb-3.5 border-b border-gray-100">
            <h2 className="text-[14px] font-bold text-gray-900">Historique des missions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Réf.", "Client", "Date", "Périmètre", "Statut", "Montant HT"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-[.8px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-indigo-50/50 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-mono text-gray-400 whitespace-nowrap">{m.reference}</td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-gray-800">{m.client}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{dateFR(m.dateMission)}</td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-600 whitespace-nowrap">{m.nbSalles}S / {m.nbSurveillants}P</td>
                    <td className="px-5 py-3"><MissionBadge statut={m.statut} /></td>
                    <td className="px-5 py-3 text-[13px] font-extrabold text-gray-900 whitespace-nowrap">{euro(m.montantHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
