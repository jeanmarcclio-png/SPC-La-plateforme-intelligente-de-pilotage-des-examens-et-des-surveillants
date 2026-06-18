import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge, ScoreTag } from "@/components/Badge";
import Link from "next/link";
import { getCampagnes, getAlertes, getEcheances, getClusterScores, getSegmentRepartition } from "@/lib/supabase/queries";

export default async function DashboardPage() {
  const [campagnes, alertes, echeances, clusterScores, segmentRepartition] = await Promise.all([
    getCampagnes(),
    getAlertes(),
    getEcheances(),
    getClusterScores(),
    getSegmentRepartition(),
  ]);
  const total = campagnes.reduce((s, c) => s + c.nombreProspects, 0);
  const tresChaudes = campagnes.reduce((s, c) => s + c.tresChaudes, 0);

  return (
    <>
      <Topbar title="Tableau de bord" badge="Actif" />

      <main className="flex-1 overflow-y-auto p-5">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {[
            { icon: "🔍", color: "bg-blue-50 text-blue-700", num: total, label: "établissements ciblés", link: "Voir tous →", href: "/campagnes" },
            { icon: "📈", color: "bg-teal-50 text-teal-700", num: tresChaudes, label: "prospects Très chaud", link: "Voir la liste →", href: "/qualification" },
            { icon: "🎯", color: "bg-orange-50 text-orange-700", num: "9,4", label: "Score BANT moyen /10", link: "Voir l'analyse →", href: "/qualification" },
            { icon: "⚠️", color: "bg-red-50 text-red-700", num: 5, label: "actions urgentes", link: "Voir le détail →", href: "/campagnes" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center mb-2.5 text-base ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div className="text-[26px] font-extrabold text-gray-900 leading-none">{kpi.num}</div>
              <div className="text-[12.5px] text-gray-500 mt-1">{kpi.label}</div>
              <Link href={kpi.href} className="text-[11.5px] text-[#4a90d9] mt-2.5 hover:underline block">{kpi.link}</Link>
            </div>
          ))}
        </div>

        {/* Main 2-col layout */}
        <div className="grid grid-cols-[1fr_252px] gap-4">
          <div>
            {/* Campagnes table */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-gray-900">Mes campagnes en cours</span>
              <Link href="/campagnes" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-600 hover:bg-gray-50">
                Voir toutes les campagnes
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Campagne", "Périmètre", "Deadline", "Score", "Statut", ""].map((h) => (
                      <th key={h} className="text-left px-3.5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-[.5px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campagnes.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3.5 py-3 text-[13px] font-semibold text-gray-800">{c.nom}</td>
                      <td className="px-3.5 py-3 text-[13px] text-gray-600">{c.perimetre}</td>
                      <td className="px-3.5 py-3">
                        <span className={`text-[13px] font-semibold ${c.joursRestants <= 10 && c.joursRestants > 0 ? "text-red-600" : "text-gray-800"}`}>
                          {c.joursRestants > 0 ? `J+${c.joursRestants}` : "Terminé"}
                        </span>
                        <div className="text-[11px] text-gray-400">{c.deadline}</div>
                      </td>
                      <td className="px-3.5 py-3"><ScoreTag score={c.score} /></td>
                      <td className="px-3.5 py-3">
                        <Badge variant={c.statut === "Actif" ? "tres-chaud" : c.statut === "En cours" ? "en-cours" : c.statut === "Terminé" ? "valide" : "a-rediger"}>
                          {c.statut}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right"><Link href="/campagnes" className="text-gray-300 hover:text-[#1a6b7e]">›</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom 3-col */}
            <div className="grid grid-cols-[200px_1fr_200px] gap-3.5">
              {/* Donut chart */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Répartition segments</div>
                <DonutChart data={segmentRepartition} />
                <div className="mt-3 space-y-1.5">
                  {segmentRepartition.map((s) => (
                    <div key={s.nom} className="flex items-center gap-2 text-[12px] text-gray-600">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="flex-1">{s.nom}</span>
                      <span className="font-semibold text-gray-800">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Scores BANT par cluster</div>
                <div className="space-y-2.5">
                  {clusterScores.map((c) => (
                    <div key={c.nom}>
                      <div className="flex justify-between text-[12px] text-gray-600 mb-1">
                        <span>{c.nom}</span>
                        <span className="font-semibold">{c.score}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#1a6b7e] transition-all" style={{ width: `${(c.score / 10) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Actions recommandées</div>
                {[
                  { ico: "📞", txt: "Appeler IFSI CHU Lyon — urgent S1", href: "/qualification" },
                  { ico: "📧", txt: "Email relance CPGE Lyon J+7",        href: "/qualification" },
                  { ico: "🔗", txt: "LinkedIn Kedge Bordeaux J+3",        href: "/qualification" },
                  { ico: "📊", txt: "Planifier /analyse à J+30",          href: "/reporting" },
                ].map((a, i) => (
                  <Link key={i} href={a.href} className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-1 -mx-1">
                    <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-[11px] flex-shrink-0">{a.ico}</span>
                    <span className="text-[12px] text-gray-600 leading-snug flex-1">{a.txt}</span>
                    <span className="text-gray-300 text-sm">›</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right alerts panel */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3.5">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-red-600 mb-3">
                <span>⚠</span> Alertes critiques
              </div>
              {alertes.map((a) => (
                <Link key={a.id} href="/livrables" className={`flex items-start gap-2.5 p-2.5 rounded-lg mb-2 hover:opacity-90 ${a.type === "rouge" ? "bg-red-50" : a.type === "orange" ? "bg-orange-50" : "bg-yellow-50"}`}>
                  <span className="text-base flex-shrink-0 mt-0.5">{a.type === "rouge" ? "📁" : a.type === "orange" ? "⏰" : "📊"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-gray-800">{a.titre}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{a.description}</div>
                    <span className="text-[11.5px] text-[#4a90d9] mt-1 block">Voir les dossiers →</span>
                  </div>
                  <span className={`min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1 text-white ${a.type === "rouge" ? "bg-red-500" : a.type === "orange" ? "bg-orange-500" : "bg-yellow-500"}`}>
                    {a.count}
                  </span>
                </Link>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2c7a7b] mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Échéances à venir
              </div>
              {echeances.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0 text-[12px]">
                  <span className="font-bold text-gray-800 min-w-[36px]">{e.date}</span>
                  <span className="text-gray-600 flex-1">{e.nom}</span>
                  <span className={`text-[11px] font-medium ${(e as { urgent?: boolean }).urgent ? "text-red-500" : "text-[#4a90d9]"}`}>{e.tag}</span>
                </div>
              ))}
              <Link href="/planning" className="text-[11.5px] text-[#4a90d9] mt-2 hover:underline block">Voir toutes les échéances →</Link>
            </div>
          </div>
        </div>
      </main>

      <ConseilBar text="Lancez les appels IFSI CHU (Lyon, Lille, Bordeaux, Marseille) simultanément en semaine 1. Une réponse positive crée une référence CHU exploitable pour les autres dès J+5." />
    </>
  );
}

function DonutChart({ data }: { data: { nom: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 100 100" className="w-[100px] h-[100px]">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edf2f7" strokeWidth="16" />
        {data.map((d) => {
          const pct = d.count / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const rotation = (offset / total) * 360 - 90;
          offset += d.count;
          return (
            <circle
              key={d.nom}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          );
        })}
        <text x="50" y="54" textAnchor="middle" className="text-[14px] font-bold" style={{ fontSize: 14, fontWeight: 700, fill: "#1a202c" }}>{total}</text>
      </svg>
    </div>
  );
}
