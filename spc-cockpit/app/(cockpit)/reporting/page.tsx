export const dynamic = "force-dynamic";

import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { FacturationButton } from "@/components/FacturationButton";
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
  const tresChaudes    = prospects.filter((p) => p.niveau === "Très chaud").length;
  const scoreMoyen     = totalProspects > 0
    ? (prospects.reduce((s, p) => s + p.scoreBANT, 0) / totalProspects).toFixed(1)
    : "0.0";
  const rdvFixes     = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis    = prospects.filter((p) => p.statut === "Converti").length;
  const contactes    = prospects.filter((p) => p.statut !== "Non contacté").length;
  const livrablesValides = livrables.filter((l) => l.statut === "Validé").length;

  const statutCounts: Record<string, number> = {};
  for (const p of prospects) {
    statutCounts[p.statut] = (statutCounts[p.statut] ?? 0) + 1;
  }
  const statutEntries = Object.entries(statutCounts).sort((a, b) => b[1] - a[1]);

  const statutColors: Record<string, string> = {
    "Non contacté": "#a0aec0",
    "En cours":     "#4a90d9",
    "RDV fixé":     "#38a169",
    "Converti":     "var(--color-primary)",
  };

  const tauxConversion = totalProspects > 0 ? Math.round(((rdvFixes + convertis) / totalProspects) * 100) : 0;

  const currentPipelineCA = prospects.reduce((s, p) => s + (parseFloat(p.valeurPotentielle ?? "0") || 0), 0);
  const forecastConversions = Math.max(convertis, Math.ceil(totalProspects * Math.max(tauxConversion / 100, 0.08)));
  const forecastCABase = currentPipelineCA > 0 ? Math.round(currentPipelineCA * Math.max(tauxConversion / 100, 0.08)) : 0;
  const forecastConversionsBoosted = Math.min(Math.ceil(forecastConversions * 1.6), totalProspects);
  const forecastCABoosted = Math.round(forecastCABase * 1.6);
  const gainPct = forecastConversions > 0 ? Math.round((forecastConversionsBoosted / forecastConversions - 1) * 100) : 60;

  // Score distribution buckets
  const scoreBuckets = [
    { label: "0–2",  min: 0,  max: 2  },
    { label: "3–4",  min: 3,  max: 4  },
    { label: "5–6",  min: 5,  max: 6  },
    { label: "7–8",  min: 7,  max: 8  },
    { label: "9–10", min: 9,  max: 10 },
  ].map((b) => ({
    ...b,
    count: prospects.filter((p) => p.scoreBANT >= b.min && p.scoreBANT <= b.max).length,
  }));
  const maxBucketCount = Math.max(...scoreBuckets.map((b) => b.count), 1);

  // Funnel steps
  const funnelSteps = [
    { label: "Prospects",  count: totalProspects, color: "#a0aec0"  },
    { label: "Contactés",  count: contactes,      color: "#4a90d9"  },
    { label: "RDV fixés",  count: rdvFixes,       color: "#38a169"  },
    { label: "Convertis",  count: convertis,      color: "var(--color-primary)" },
  ];

  const campagneActive = campagnes.find((c) => c.statut === "Actif") ?? campagnes[0];
  const todayStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div className="hidden md:block">
        <Topbar
          context="Reporting"
          title="Performance commerciale"
          badge={`${campagnes.length} campagnes`}
          badgeColor="blue"
          actions={
            <FacturationButton
              campagneNom={campagneActive?.nom ?? "Toutes campagnes"}
              totalProspects={totalProspects}
              convertis={convertis}
              rdvFixes={rdvFixes}
              scoreMoyen={scoreMoyen}
              pipelineCA={Math.round(currentPipelineCA)}
              tresChaudes={tresChaudes}
              date={todayStr}
            />
          }
        />
      </div>
      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[22px] font-extrabold text-white">Performance</div>
                <div className="text-[13px] text-white/70 mt-0.5">{campagnes.length} campagnes · {totalProspects} prospects</div>
              </div>
              <div className="mt-1">
                <FacturationButton
                  campagneNom={campagneActive?.nom ?? "Toutes campagnes"}
                  totalProspects={totalProspects}
                  convertis={convertis}
                  rdvFixes={rdvFixes}
                  scoreMoyen={scoreMoyen}
                  pipelineCA={Math.round(currentPipelineCA)}
                  tresChaudes={tresChaudes}
                  date={todayStr}
                />
              </div>
            </div>
          </div>
          <div className="p-4 pb-40 space-y-3">
            {/* 2×2 KPIs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prospects", value: totalProspects, sub: `${campagnes.length} campagnes`, bar: "bg-sky-500" },
                { label: "Très chaud", value: tresChaudes, sub: `${Math.round((tresChaudes / (totalProspects || 1)) * 100)}% du pipeline`, bar: "bg-amber-500" },
                { label: "Score BANT", value: `${scoreMoyen}/10`, sub: "moyenne", bar: "bg-teal-500" },
                { label: "RDV + Convertis", value: rdvFixes + convertis, sub: `taux ${tauxConversion}%`, bar: "bg-emerald-500" },
              ].map((kpi, i) => (
                <div key={i} className="relative overflow-hidden bg-white rounded-2xl p-4 pt-[18px] border border-gray-100 shadow-sm">
                  <span aria-hidden className={`absolute top-0 left-0 right-0 h-[3px] ${kpi.bar}`} />
                  <div className="text-[26px] font-extrabold leading-none text-gray-900">{kpi.value}</div>
                  <div className="text-[12px] font-semibold text-gray-700 mt-1.5">{kpi.label}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Conversion Funnel — mobile */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Entonnoir de conversion</div>
              <FunnelChart steps={funnelSteps} />
            </div>

            {/* Score Distribution — mobile */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="text-[13px] font-bold text-gray-800 mb-3">Distribution score BANT</div>
              <ScoreHistogram buckets={scoreBuckets} maxCount={maxBucketCount} />
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
                        background: c.score >= 9.5 ? "var(--color-primary)" : c.score >= 9 ? "#4a90d9" : "#a0aec0",
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
                <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${(livrablesValides / (livrables.length || 1)) * 100}%` }} />
              </div>
              <div className="space-y-1.5">
                {livrables.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-gray-700 truncate flex-1">{l.nom}</span>
                    <span className={`ml-2 flex-shrink-0 font-semibold ${l.statut === "Validé" ? "text-[var(--color-primary)]" : l.statut === "En cours" ? "text-blue-600" : "text-gray-400"}`}>{l.statut === "Validé" ? "✓" : l.statut === "En cours" ? "…" : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden md:block p-5 md:p-6">

        {/* ── ANCRE : Prévision fin de trimestre (l'élément qui mène la page) ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[var(--color-primary)]">Prévision</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[17px] font-extrabold text-gray-900 tracking-tight">Objectif fin de trimestre</span>
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">IA prédictive</span>
              </div>
            </div>
            <span className="text-[11px] text-gray-400">Base : {totalProspects} prospects · {campagnes.length} campagnes</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-3 font-medium">Trajectoire actuelle</div>
              <div className="flex items-end gap-4 mb-3">
                <div>
                  <div className="text-[30px] font-extrabold text-gray-600 leading-none">{forecastConversions}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">conversions estimées</div>
                </div>
                {forecastCABase > 0 && (
                  <div className="text-right pb-0.5">
                    <div className="text-[22px] font-extrabold text-gray-500">{Math.round(forecastCABase)}k€</div>
                    <div className="text-[11px] text-gray-400">CA potentiel</div>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-gray-500">Taux de conversion actuel : {tauxConversion}%</div>
            </div>
            <div className="border border-[var(--color-primary)]/25 rounded-xl p-4 bg-teal-50/60">
              <div className="text-[11px] text-[var(--color-primary)] uppercase tracking-wider mb-3 font-bold">Avec accélération recommandée</div>
              <div className="flex items-end gap-4 mb-3">
                <div>
                  <div className="text-[30px] font-extrabold text-[var(--color-primary)] leading-none">{forecastConversionsBoosted}</div>
                  <div className="text-[11px] text-[var(--color-primary)]/70 mt-0.5">conversions estimées</div>
                </div>
                {forecastCABoosted > 0 && (
                  <div className="text-right pb-0.5">
                    <div className="text-[22px] font-extrabold text-[var(--color-primary)]">{Math.round(forecastCABoosted)}k€</div>
                    <div className="text-[11px] text-[var(--color-primary)]/70">CA potentiel</div>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-primary)]/80 font-medium">+{gainPct}% vs trajectoire actuelle</div>
            </div>
          </div>
        </div>

        {/* ── Groupe : Synthèse ── */}
        <SectionRule label="Synthèse" />
        <div className="grid grid-cols-4 gap-3.5 mb-4">
          {[
            { label: "Total prospects", value: totalProspects, sub: `${campagnes.length} campagnes`, bar: "bg-sky-500" },
            { label: "Très chaud", value: tresChaudes, sub: `${Math.round((tresChaudes / (totalProspects || 1)) * 100)}% du pipeline`, bar: "bg-amber-500" },
            { label: "Score BANT moyen", value: scoreMoyen, sub: "Sur 10 pts", bar: "bg-teal-500" },
            { label: "RDV fixés", value: rdvFixes + convertis, sub: `dont ${convertis} converti${convertis !== 1 ? "s" : ""}`, bar: "bg-emerald-500" },
          ].map((kpi, i) => (
            <div key={i} className="relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm p-4 pt-[18px]">
              <span aria-hidden className={`absolute top-0 left-0 right-0 h-[3px] ${kpi.bar}`} />
              <div className="text-[28px] font-extrabold leading-none text-gray-900">{kpi.value}</div>
              <div className="text-[12.5px] text-gray-600 mt-1.5 font-medium">{kpi.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Groupe : Analyse ── */}
        <SectionRule label="Analyse" className="mt-8" />
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
                        background: c.score >= 9.5 ? "var(--color-primary)" : c.score >= 9 ? "#4a90d9" : "#a0aec0",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics avancés row */}
        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Entonnoir de conversion */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-700 mb-4">Entonnoir de conversion</div>
            <FunnelChart steps={funnelSteps} />
          </div>

          {/* Distribution score BANT */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-[13px] font-semibold text-gray-700 mb-4">Distribution score BANT</div>
            <ScoreHistogram buckets={scoreBuckets} maxCount={maxBucketCount} />
          </div>

        </div>

        {/* ── Groupe : Livrables ── */}
        <SectionRule label="Livrables" count={`${livrablesValides}/${livrables.length} validés`} className="mt-8" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-2 gap-3">
            {livrables.map((l) => {
              const pct = l.statut === "Validé" ? 100 : l.statut === "En cours" ? 50 : l.statut === "À renforcer" ? 70 : 0;
              const color = l.statut === "Validé" ? "var(--color-primary)" : l.statut === "En cours" ? "#4a90d9" : l.statut === "À renforcer" ? "#f6ad55" : "#e2e8f0";
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

// ─── Section rule (eyebrow + filet, crée les groupes de lecture) ──────────────
function SectionRule({ label, count, className = "" }: { label: string; count?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 mb-3 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-gray-400">{label}</span>
      <span className="h-px flex-1 bg-gray-200" aria-hidden />
      {count && <span className="text-[12px] text-gray-400 flex-shrink-0">{count}</span>}
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: { nom: string; count: number; color: string }[]; total: number }) {
  const cx = 54, cy = 54, r = 40, strokeW = 14;
  const circumference = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 108 108" className="w-[108px] h-[108px] flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edf2f7" strokeWidth={strokeW} />
      {data.map((s, i) => {
        const offset = data.slice(0, i).reduce((sum, x) => sum + x.count, 0);
        const dash = (s.count / total) * circumference;
        const gap  = circumference - dash;
        const rotation = (offset / total) * 360 - 90;
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

// ─── Funnel Chart ─────────────────────────────────────────────────────────────
function FunnelChart({ steps }: { steps: { label: string; count: number; color: string }[] }) {
  const maxCount = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.count / maxCount) * 100;
        const dropPct = i > 0 && steps[i - 1].count > 0
          ? Math.round((1 - s.count / steps[i - 1].count) * 100)
          : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-gray-600">{s.label}</span>
              <div className="flex items-center gap-2">
                {dropPct !== null && dropPct > 0 && dropPct < 100 && (
                  <span className="text-[11px] text-red-400">−{dropPct}%</span>
                )}
                <span className="font-bold text-gray-800">{s.count}</span>
              </div>
            </div>
            <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700"
                style={{ width: `${pct}%`, background: s.color }}
              >
                {pct > 20 && (
                  <span className="text-[10px] font-bold text-white">
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Histogram ──────────────────────────────────────────────────────────
function ScoreHistogram({ buckets, maxCount }: { buckets: { label: string; count: number }[]; maxCount: number }) {
  const colors = ["#a0aec0", "#4a90d9", "#f6ad55", "#38a169", "var(--color-primary)"];
  return (
    <div className="flex items-end gap-2 h-[100px]">
      {buckets.map((b, i) => {
        const heightPct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-semibold">{b.count > 0 ? b.count : ""}</span>
            <div className="w-full rounded-t-md transition-all duration-700" style={{
              height:     `${Math.max(heightPct, 2)}%`,
              background: colors[i] ?? "#a0aec0",
              minHeight:  b.count > 0 ? 4 : 0,
            }} />
            <span className="text-[10px] text-gray-400">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
