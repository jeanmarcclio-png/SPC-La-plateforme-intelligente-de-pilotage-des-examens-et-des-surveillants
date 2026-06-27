import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { getCampagnes, getProspects, getClusterScores, getSegmentRepartition, getLivrables } from "@/lib/supabase/queries";

export default async function ReportingPage() {
  const [campagnes, prospects, clusterScores, segmentRepartition, livrables] = await Promise.all([
    getCampagnes(),
    getProspects(),
    getClusterScores(),
    getSegmentRepartition(),
    getLivrables(),
  ]);

  const totalProspects = prospects.length;
  const tresChaudes = prospects.filter((p) => p.niveau === "Très chaud").length;
  const scoreMoyen = totalProspects > 0
    ? (prospects.reduce((s, p) => s + p.scoreBANT, 0) / totalProspects).toFixed(1)
    : "0.0";
  const rdvFixes = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis = prospects.filter((p) => p.statut === "Converti").length;
  const livrablesValides = livrables.filter((l) => l.statut === "Validé").length;

  const statutCounts: Record<string, number> = {};
  for (const p of prospects) {
    statutCounts[p.statut] = (statutCounts[p.statut] ?? 0) + 1;
  }
  const statutEntries = Object.entries(statutCounts).sort((a, b) => b[1] - a[1]);

  const statutColors: Record<string, string> = {
    "Non contacté": "#a0aec0",
    "En cours": "#4a90d9",
    "RDV fixé": "#38a169",
    "Converti": "#1a6b7e",
  };

  const tauxConversion = totalProspects > 0 ? Math.round(((rdvFixes + convertis) / totalProspects) * 100) : 0;

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Reporting" title="Performance commerciale" badge={`${campagnes.length} campagnes`} badgeColor="blue" />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="text-[22px] font-extrabold text-white">Performance</div>
            <div className="text-[13px] text-white/70 mt-0.5">{campagnes.length} campagnes · {totalProspects} prospects</div>
          </div>
          <div className="p-4 space-y-3">
            {/* 2×2 KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prospects", value: totalProspects, sub: `${campagnes.length} campagnes`, color: "text-gray-900" },
                { label: "Très chaud", value: tresChaudes, sub: `${Math.round((tresChaudes / (totalProspects || 1)) * 100)}% du pipeline`, color: "text-orange-500" },
                { label: "Score BANT", value: `${scoreMoyen}/10`, sub: "moyenne", color: "text-[#1a6b7e]" },
                { label: "RDV + Convertis", value: rdvFixes + convertis, sub: `taux ${tauxConversion}%`, color: "text-green-600" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className={`text-[26px] font-extrabold leading-none ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[12px] font-semibold text-gray-700 mt-1.5">{kpi.label}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Statuts pipeline */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Pipeline prospects</div>
              <div className="space-y-3">
                {statutEntries.map(([s, count]) => (
                  <div key={s}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-gray-600">{s}</span>
                      <span className="font-bold text-gray-800">{count} <span className="font-normal text-gray-400">({Math.round((count / totalProspects) * 100)}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / totalProspects) * 100}%`, background: statutColors[s] ?? "#a0aec0" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Segments — donut chart */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Répartition segments</div>
              <div className="flex items-center gap-4">
                <DonutChart data={segmentRepartition} total={totalProspects} />
                <div className="flex-1 space-y-2">
                  {segmentRepartition.map((s) => (
                    <div key={s.nom} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[12px] text-gray-600 flex-1">{s.nom}</span>
                      <span className="text-[12px] font-bold text-gray-800">{s.count}</span>
                      <span className="text-[12px] text-gray-400">({Math.round((s.count / totalProspects) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clusters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Score BANT / cluster</div>
              <div className="space-y-2.5">
                {clusterScores.map((c) => (
                  <div key={c.nom}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-gray-600 truncate flex-1">{c.nom}</span>
                      <span className="font-bold text-gray-800 ml-2">{c.score}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(c.score / 10) * 100}%`,
                        background: c.score >= 9.5 ? "#1a6b7e" : c.score >= 9 ? "#4a90d9" : "#a0aec0",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Livrables */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex justify-between mb-3">
                <div className="text-[13px] font-bold text-gray-800">Livrables</div>
                <span className="text-[12px] text-gray-400">{livrablesValides}/{livrables.length} validés</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-[#1a6b7e] transition-all" style={{ width: `${(livrablesValides / (livrables.length || 1)) * 100}%` }} />
              </div>
              <div className="space-y-1.5">
                {livrables.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-700 truncate flex-1">{l.nom}</span>
                    <span className={`ml-2 flex-shrink-0 font-semibold ${l.statut === "Validé" ? "text-[#1a6b7e]" : l.statut === "En cours" ? "text-blue-600" : "text-gray-400"}`}>{l.statut === "Validé" ? "✓" : l.statut === "En cours" ? "…" : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {[
            { label: "Total prospects", value: totalProspects, sub: `${campagnes.length} campagnes`, color: "text-gray-900" },
            { label: "Très chaud", value: tresChaudes, sub: `${Math.round((tresChaudes / (totalProspects || 1)) * 100)}% du pipeline`, color: "text-orange-500" },
            { label: "Score BANT moyen", value: scoreMoyen, sub: "Sur 10 pts", color: "text-[#1a6b7e]" },
            { label: "RDV fixés", value: rdvFixes + convertis, sub: `dont ${convertis} converti${convertis !== 1 ? "s" : ""}`, color: "text-green-600" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className={`text-[28px] font-extrabold leading-none ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[12.5px] text-gray-600 mt-1.5 font-medium">{kpi.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-[1fr_1fr_200px] gap-4 mb-4">

          {/* Répartition segments */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-700 mb-4">Répartition par segment</div>
            <div className="flex items-center gap-5">
              <DonutChart data={segmentRepartition} total={totalProspects} />
              <div className="space-y-2 flex-1">
                {segmentRepartition.map((s) => (
                  <div key={s.nom} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[11.5px] text-gray-600">{s.nom}</span>
                    </div>
                    <span className="text-[12px] font-bold text-gray-800">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Statuts prospects */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-700 mb-4">Statuts prospects</div>
            <div className="space-y-3">
              {statutEntries.map(([s, count]) => (
                <div key={s}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-gray-600">{s}</span>
                    <span className="font-bold text-gray-800">{count} <span className="font-normal text-gray-400">({Math.round((count / totalProspects) * 100)}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / totalProspects) * 100}%`,
                        background: statutColors[s] ?? "#a0aec0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clusters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-700 mb-4">Score / cluster</div>
            <div className="space-y-2.5">
              {clusterScores.slice(0, 6).map((c) => (
                <div key={c.nom}>
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                    <span className="truncate max-w-[110px]">{c.nom}</span>
                    <span className="font-bold text-gray-800">{c.score}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.score / 10) * 100}%`,
                        background: c.score >= 9.5 ? "#1a6b7e" : c.score >= 9 ? "#4a90d9" : "#a0aec0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Livrables progression */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-semibold text-gray-700">Progression des livrables</div>
            <span className="text-[12px] text-gray-400">{livrablesValides}/{livrables.length} validés</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {livrables.map((l) => {
              const pct = l.statut === "Validé" ? 100 : l.statut === "En cours" ? 50 : l.statut === "À renforcer" ? 70 : 0;
              const color = l.statut === "Validé" ? "#1a6b7e" : l.statut === "En cours" ? "#4a90d9" : l.statut === "À renforcer" ? "#f6ad55" : "#e2e8f0";
              return (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[11.5px] mb-1">
                      <span className="text-gray-700 font-medium truncate">{l.nom}</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0">{l.statut}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        </div>{/* end desktop */}
      </main>
      <div className="hidden md:block">
        <ConseilBar text={`${tresChaudes} prospects très chaud · score BANT moyen ${scoreMoyen}/10 · ${rdvFixes} RDV fixés. Lancez /analyse à J+30 pour le rapport complet.`} />
      </div>
    </>
  );
}

function DonutChart({ data, total }: { data: { nom: string; count: number; color: string }[]; total: number }) {
  const cx = 54, cy = 54, r = 40, strokeW = 14;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox="0 0 108 108" className="w-[108px] h-[108px] flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edf2f7" strokeWidth={strokeW} />
      {data.map((s) => {
        const dash = (s.count / total) * circumference;
        const gap = circumference - dash;
        const rotation = (offset / total) * 360 - 90;
        offset += s.count;
        return (
          <circle
            key={s.nom}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 18, fontWeight: 800, fill: "#1a202c" }}>{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 8, fill: "#718096" }}>prospects</text>
    </svg>
  );
}
