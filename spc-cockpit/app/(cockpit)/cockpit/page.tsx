export const dynamic = "force-dynamic";

import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { CountUp } from "@/components/CountUp";
import { getCampagnes, getProspects, getAlertes, getEcheances } from "@/lib/supabase/queries";
import { computeCampagneHealth, generateExecutiveSummary } from "@/lib/ai/engine";
import { SectorCockpitPanel } from "@/components/SectorCockpitPanel";

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

  const pipelineCA = prospects.reduce((s, p) => s + (parseFloat(p.valeurPotentielle ?? "0") || 0), 0);
  const conversionRate = total > 0 ? Math.round(((rdvFixes + convertis) / total) * 100) : 0;
  const baseObjectif = Math.max(conversionRate, 12);
  const boostedObjectif = Math.min(baseObjectif + 29, 96);

  const kpis = [
    { label: "Prospects total",  value: total,      suffix: "",    color: "#1a202c", sub: "établissements ciblés", delta: null },
    { label: pipelineCA > 0 ? "Pipeline CA" : "Contactés", value: pipelineCA > 0 ? Math.round(pipelineCA) : contactes, suffix: pipelineCA > 0 ? "k€" : "", color: pipelineCA > 0 ? "#6b46c1" : "#4a90d9", sub: pipelineCA > 0 ? "CA estimé total" : `${total > 0 ? Math.round((contactes / total) * 100) : 0}% du pipeline`, delta: pipelineCA > 0 ? `${contactes} contactés` : null },
    { label: "RDV fixés",        value: rdvFixes,   suffix: "",    color: "#38a169", sub: "en discussion avancée", delta: rdvFixes > 0 ? `${Math.round((rdvFixes / total) * 100)}% du pipeline` : null },
    { label: "Convertis",        value: convertis,  suffix: "",    color: "var(--color-primary)", sub: "clients signés", delta: convertis > 0 ? "↑ Signature confirmée" : null },
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

        <div className="p-4 md:p-5 pb-40 md:pb-5 space-y-4 animate-fade-up">

          {/* ── Executive Summary Banner — sector-aware ── */}
          <SectorCockpitPanel />

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="text-[28px] font-extrabold" style={{ color: kpi.color }}>
                  <CountUp value={kpi.value} suffix={kpi.suffix} />
                </div>
                <div className="text-[12px] font-semibold text-gray-700 mt-0.5">{kpi.label}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{kpi.sub}</div>
                {kpi.delta && (
                  <div className="text-[11px] text-[var(--color-primary)] font-medium mt-1">{kpi.delta}</div>
                )}
              </div>
            ))}
          </div>

          {/* ── Scénario Prédictif ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="flex">
              <div className="flex-1 p-4 border-r border-gray-100">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-medium">Sans action</div>
                <div className="flex items-end gap-2 mb-1.5">
                  <span className="text-[26px] font-extrabold text-gray-400 leading-none">{baseObjectif}%</span>
                  <span className="text-[11px] text-gray-400 pb-0.5">objectif</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-300 rounded-full" style={{ width: `${baseObjectif}%` }} />
                </div>
              </div>
              <div className="flex-1 p-4" style={{ background: "rgba(26,107,126,0.04)" }}>
                <div className="text-[11px] text-[var(--color-primary)] uppercase tracking-wider mb-2 font-bold">IA recommandée ✓</div>
                <div className="flex items-end gap-2 mb-1.5">
                  <span className="text-[26px] font-extrabold text-[var(--color-primary)] leading-none">{boostedObjectif}%</span>
                  <span className="text-[11px] text-[var(--color-primary)]/60 pb-0.5">objectif</span>
                </div>
                <div className="h-1.5 bg-[var(--color-primary)]/15 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${boostedObjectif}%` }} />
                </div>
              </div>
              <div className="flex items-center px-4 flex-shrink-0 border-l border-gray-100">
                <div className="text-center">
                  <div className="text-[22px] font-extrabold text-[var(--color-primary)]">+{boostedObjectif - baseObjectif}pts</div>
                  <div className="text-[11px] text-gray-400">gain estimé</div>
                </div>
              </div>
            </div>
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
                        <div className="text-[14px] font-extrabold text-[var(--color-primary)]">{p.scoreBANT}</div>
                        <div className="text-[11px] text-gray-400">BANT</div>
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
                <Link href="/campagnes" className="text-center bg-[var(--color-primary)]/[0.08] text-[var(--color-primary)] text-[12px] font-semibold py-2 rounded-xl hover:bg-[var(--color-primary)]/[0.15] transition-colors">
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
