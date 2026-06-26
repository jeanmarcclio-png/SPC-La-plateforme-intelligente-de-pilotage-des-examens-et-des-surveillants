import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { CountUp } from "@/components/CountUp";
import { getCampagnes, getProspects, getAlertes, getEcheances } from "@/lib/supabase/queries";
import { computeCampagneHealth, generateExecutiveSummary } from "@/lib/ai/engine";

export default async function CockpitPage() {
  const [campagnes, prospects, alertes, echeances] = await Promise.all([
    getCampagnes(),
    getProspects(),
    getAlertes(),
    getEcheances(),
  ]);

  const totalAlertes     = alertes.reduce((s, a) => s + a.count, 0);
  const urgentEcheances  = echeances.filter((e) => e.urgent).length;
  const summary          = generateExecutiveSummary({ prospects, campagnes, totalAlertes, urgentEcheances });
  const healthScores     = campagnes.map((c) => ({ campagne: c, health: computeCampagneHealth(c) }));

  const total        = prospects.length;
  const contactes    = prospects.filter((p) => p.statut !== "Non contacté").length;
  const rdvFixes     = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis    = prospects.filter((p) => p.statut === "Converti").length;
  const tresChaudes  = prospects.filter((p) => p.niveau === "Très chaud").length;

  const kpis = [
    { label: "Prospects total",  value: total,     color: "#1a202c", sub: "établissements ciblés" },
    { label: "Contactés",        value: contactes,  color: "#4a90d9", sub: `${total > 0 ? Math.round((contactes / total) * 100) : 0}% du pipeline` },
    { label: "RDV fixés",        value: rdvFixes,   color: "#38a169", sub: "en discussion avancée" },
    { label: "Convertis",        value: convertis,  color: "#1a6b7e", sub: "clients signés" },
  ];

  return (
    <>
      <div className="hidden md:block">
        <Topbar context="Vue Exécutive" title="Cockpit Dirigeant" badge="IA" badgeColor="blue" />
      </div>

      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE header ── */}
        <div className="md:hidden">
          <div className="px-4 pt-5 pb-4" style={{ background: "#0d1e2e" }}>
            <div className="text-[22px] font-extrabold text-white">Cockpit Dirigeant</div>
            <div className="text-[13px] text-white/60 mt-0.5">Vue exécutive · IA</div>
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-4 animate-fade-up">

          {/* ── Executive Summary Banner ── */}
          <div
            className="rounded-2xl p-5 md:p-6 animate-scale-in"
            style={{ background: "linear-gradient(135deg, #0d1e2e 0%, #1a3a52 60%, #1a6b7e 100%)" }}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl flex-shrink-0">🧠</span>
              <div>
                <div className="text-[20px] md:text-[22px] font-extrabold text-white leading-tight">
                  {summary.headline}
                </div>
                <div className="text-[13px] text-white/70 mt-1 leading-relaxed">{summary.subline}</div>
              </div>
            </div>

            <div className="bg-white/[0.08] rounded-xl p-3.5 mb-4 border border-white/[0.12]">
              <div className="text-[11px] text-[#4a90d9] uppercase tracking-[1.2px] mb-1.5">📈 Prévision IA</div>
              <div className="text-[13px] text-white/80 leading-relaxed">{summary.forecast}</div>
            </div>

            {summary.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.actions.map((action, i) => (
                  <span
                    key={i}
                    className="text-[12px] font-semibold bg-white/[0.12] text-white/90 px-3 py-1.5 rounded-full border border-white/[0.15]"
                  >
                    {i + 1}. {action}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="text-[28px] font-extrabold" style={{ color: kpi.color }}>
                  <CountUp value={kpi.value} />
                </div>
                <div className="text-[12px] font-semibold text-gray-700 mt-0.5">{kpi.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Campaign Health Scores ── */}
          <div>
            <div className="text-[13px] font-semibold text-gray-900 mb-2.5">Santé des campagnes</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {healthScores.map(({ campagne: c, health }, i) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-[13.5px] font-bold text-gray-900 truncate">{c.nom}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">{c.perimetre}</div>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: health.color + "1a", color: health.color }}
                    >
                      {health.label}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="mb-3">
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-[11px] text-gray-400">Santé globale</span>
                      <span className="text-[18px] font-extrabold" style={{ color: health.color }}>{health.score}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bar-fill"
                        style={{ width: `${health.score}%`, background: health.color }}
                      />
                    </div>
                  </div>

                  {/* Signals */}
                  <div className="space-y-1">
                    {health.signals.map((s, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-[11px]">
                        <span>{s.ok ? "🟢" : "🔴"}</span>
                        <span className={s.ok ? "text-gray-600" : "text-red-500"}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Hot Prospects + Alertes ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top prospects très chaud */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-gray-900">🔥 Prospects "Très chaud"</span>
                <span className="text-[11px] text-gray-400">{tresChaudes} actifs</span>
              </div>
              <div className="space-y-2">
                {prospects
                  .filter((p) => p.niveau === "Très chaud" && p.statut !== "Converti")
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-[12.5px] font-semibold text-gray-800">{p.nom}</div>
                        <div className="text-[11px] text-gray-400">{p.segment} · {p.statut}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] font-extrabold text-[#1a6b7e]">{p.scoreBANT}</div>
                        <div className="text-[10px] text-gray-400">BANT</div>
                      </div>
                    </div>
                  ))}
              </div>
              <Link href="/qualification" className="block text-center text-[12px] text-[#4a90d9] font-semibold mt-3 hover:underline">
                Voir tous les prospects →
              </Link>
            </div>

            {/* Alertes + actions rapides */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-[13px] font-semibold text-gray-900 mb-3">Actions prioritaires</div>
              <div className="space-y-2 mb-4">
                {alertes.slice(0, 3).map((a) => (
                  <div key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                    a.type === "rouge" ? "bg-red-50 border-red-100" :
                    a.type === "orange" ? "bg-orange-50 border-orange-100" :
                    "bg-yellow-50 border-yellow-100"
                  }`}>
                    <span className="text-sm mt-0.5 flex-shrink-0">
                      {a.type === "rouge" ? "🔴" : a.type === "orange" ? "🟠" : "🟡"}
                    </span>
                    <div>
                      <div className="text-[12.5px] font-semibold text-gray-800">{a.titre}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/campagnes" className="text-center bg-[#1a6b7e]/[0.08] text-[#1a6b7e] text-[12px] font-semibold py-2 rounded-xl hover:bg-[#1a6b7e]/[0.15] transition-colors">
                  Campagnes
                </Link>
                <Link href="/planning" className="text-center bg-[#4a90d9]/[0.08] text-[#4a90d9] text-[12px] font-semibold py-2 rounded-xl hover:bg-[#4a90d9]/[0.15] transition-colors">
                  Planning
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
