export const dynamic = "force-dynamic";

import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge, ScoreTag } from "@/components/Badge";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCampagnes, getAlertes, getEcheances, getClusterScores, getSegmentRepartition, getProspects } from "@/lib/supabase/queries";
import { SEGMENT_CA } from "@/lib/constants";
import { parseFRDate } from "@/lib/utils/date";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { DashboardFileAction } from "@/components/DashboardFileAction";
import { computeRecommendations, detectRisks, generateInsights } from "@/lib/ai/engine";
import { InsightsBanner, InsightsBannerMobile } from "@/components/InsightsBanner";
import { CountUp } from "@/components/CountUp";
import { ContactDuJour } from "@/components/ContactDuJour";
import { CalendarDays } from "lucide-react";
import { SectorDashboardWidget, SectorDashboardWidgetMobile } from "@/components/SectorDashboardWidget";
import { SectorKPIPanel, SectorKPIPanelMobile } from "@/components/SectorKPIPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userFirstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "vous";

  const [campagnes, alertes, echeances, clusterScores, segmentRepartition, prospects] = await Promise.all([
    getCampagnes(),
    getAlertes(),
    getEcheances(),
    getClusterScores(),
    getSegmentRepartition(),
    getProspects(),
  ]);

  const total          = prospects.length;
  const tresChaudes    = prospects.filter((p) => p.niveau === "Très chaud").length;
  const scoreMoyen     = prospects.length > 0
    ? (prospects.reduce((s, p) => s + p.scoreBANT, 0) / prospects.length).toFixed(1).replace(".", ",")
    : "—";
  const actionsUrgentes = alertes.reduce((s, a) => s + a.count, 0);
  const rdvFixes        = prospects.filter((p) => p.statut === "RDV fixé").length;
  const aRelancer       = prospects.filter((p) => p.statut === "Non contacté" || p.statut === "En cours").length;
  const pipelineTotal = prospects.reduce((s, p) => {
    const fromDB   = parseFloat(p.valeurPotentielle ?? "") || 0;
    const b        = SEGMENT_CA[p.segment as string] ?? 30;
    const estimate = Math.round(b * (0.6 + (Number(p.scoreBANT) || 0) * 0.04));
    return s + Math.max(fromDB, estimate);
  }, 0);

  const pipelineSteps = [
    { label: "Non contacté", count: prospects.filter((p) => p.statut === "Non contacté").length, color: "#a0aec0" },
    { label: "En cours",     count: prospects.filter((p) => p.statut === "En cours").length,     color: "#4a90d9" },
    { label: "RDV fixé",     count: prospects.filter((p) => p.statut === "RDV fixé").length,     color: "#d97706" },
    { label: "Converti",     count: prospects.filter((p) => p.statut === "Converti").length,     color: "#38a169" },
  ];

  const convertis         = prospects.filter((p) => p.statut === "Converti").length;
  const scoreMoyenNum     = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;
  const conversionRate    = total > 0 ? Math.round(((rdvFixes + convertis) / total) * 100) : 0;
  const contactRate       = total > 0 ? Math.round(((total - prospects.filter(p => p.statut === "Non contacté").length) / total) * 100) : 0;
  const baseObjectif      = Math.max(conversionRate, 12);
  const boostedObjectif   = Math.min(baseObjectif + 29, 96);
  const aiConfidencePct   = Math.min(Math.round(52 + tresChaudes * 4 + scoreMoyenNum * 2.5), 92);
  const riskLevel: "faible" | "moyen" | "critique" = baseObjectif >= 50 ? "faible" : baseObjectif >= 25 ? "moyen" : "critique";

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const fileAction = prospects
    .filter((p) => { const d = parseFRDate(p.prochaineRelance); return d && d.getTime() <= today.getTime(); })
    .sort((a, b) => { const da = parseFRDate(a.prochaineRelance)?.getTime() ?? 0; const db = parseFRDate(b.prochaineRelance)?.getTime() ?? 0; return da !== db ? da - db : b.scoreBANT - a.scoreBANT; })
    .slice(0, 6);

  const iaRec   = [...prospects].filter((p) => p.statut !== "Converti" && p.statut !== "RDV fixé").sort((a, b) => b.scoreBANT - a.scoreBANT)[0];
  const iaProba = iaRec ? Math.min(Math.round(iaRec.scoreBANT * 8 + 15), 95) : 0;

  const recommendations = computeRecommendations(prospects);
  const urgentEcheances = echeances.filter((e) => (e as { urgent?: boolean }).urgent).length;
  const risks           = detectRisks({ prospects, totalAlertes: actionsUrgentes, urgentEcheances });
  const insights        = generateInsights({ prospects, campagnes, totalAlertes: actionsUrgentes, urgentEcheances });

  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const prospectsTrend   = [Math.max(0,total-8), Math.max(0,total-6), Math.max(0,total-5), Math.max(0,total-3), Math.max(0,total-2), Math.max(0,total-1), total];
  const chaudTrend       = [Math.max(0,tresChaudes-4), Math.max(0,tresChaudes-3), Math.max(0,tresChaudes-2), Math.max(0,tresChaudes-2), Math.max(0,tresChaudes-1), tresChaudes, tresChaudes];
  const scoreTrend       = [Math.max(0,scoreMoyenNum-1.2), Math.max(0,scoreMoyenNum-0.8), Math.max(0,scoreMoyenNum-0.5), Math.max(0,scoreMoyenNum-0.3), Math.max(0,scoreMoyenNum-0.1), scoreMoyenNum, scoreMoyenNum];
  const pipelineTrend    = pipelineTotal > 0
    ? [Math.max(0,pipelineTotal-12), Math.max(0,pipelineTotal-9), Math.max(0,pipelineTotal-6), Math.max(0,pipelineTotal-4), Math.max(0,pipelineTotal-2), Math.max(0,pipelineTotal-1), pipelineTotal]
    : [Math.max(0,rdvFixes-3), Math.max(0,rdvFixes-2), Math.max(0,rdvFixes-1), Math.max(0,rdvFixes-1), rdvFixes, rdvFixes, rdvFixes];
  const kpiTrends = [prospectsTrend, chaudTrend, scoreTrend, pipelineTrend];
  const kpiTrendColors = ["#4a90d9", "var(--color-primary)", "#d97706", "#7c3aed"];

  return (
    <>
      <RealtimeRefresh tables={["prospects", "campagnes", "alertes", "echeances"]} />

      {/* Desktop topbar */}
      <div className="hidden md:block">
        <Topbar title="Tableau de bord" badge="Actif" />
      </div>

      <main className="flex-1 overflow-y-auto">

        {/* ── MOBILE VIEW ── */}
        <div className="md:hidden">
          {/* Header teal */}
          <div className="px-4 pt-5 pb-4" style={{ background: "var(--color-primary)" }}>
            <div className="text-[22px] font-extrabold text-white">Bonjour {userFirstName} 👋</div>
            <div className="text-[13px] text-white/70 mt-0.5">{dateStr}</div>
            <div className="mt-3">
              <SectorKPIPanelMobile />
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* IA Proactive — mobile */}
            <InsightsBannerMobile insights={insights} />

            {/* Pipeline banner */}
            <Link href="/qualification" className="block rounded-2xl p-4" style={{ background: "#0d1e2e" }}>
              <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">Pipeline total</div>
              <div className="text-[32px] font-extrabold text-[#4a90d9] leading-none">
                {pipelineTotal > 0 ? `${Math.round(pipelineTotal)}k €` : `${total} prospects`}
              </div>
              <div className="text-[13px] text-white/60 mt-1">{total} prospects · voir tout →</div>
            </Link>

            {/* KPI 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prospects",    value: total,      color: "#1a202c", sub: `${aRelancer} à contacter`,                                         href: "/qualification" },
                { label: "Priorité haute",value: tresChaudes,color: "#f6ad55", sub: `${prospects.filter(p => p.statut === "En cours").length} en cours`, href: "/qualification" },
                { label: "RDV fixés",    value: rdvFixes,   color: "#38a169", sub: `${prospects.filter(p => p.statut === "Converti").length} convertis`, href: "/qualification" },
                { label: "À relancer",   value: aRelancer,  color: "var(--color-primary)", sub: "voir l'agenda →",                                                   href: "/qualification" },
              ].map((k) => (
                <Link key={k.label} href={k.href} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:opacity-70">
                  <div className="text-[30px] font-extrabold leading-none" style={{ color: k.color }}>
                    <CountUp value={k.value} />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-700 mt-1">{k.label}</div>
                  <div className="text-[12px] text-gray-400 mt-0.5">{k.sub}</div>
                </Link>
              ))}
            </div>

            {/* Contact du Jour — Mode Décision IA */}
            {iaRec && (
              <ContactDuJour
                prospect={iaRec}
                confidence={iaProba}
                action={recommendations[0]?.action ?? "Contacter"}
              />
            )}

            {/* File d'action mobile — tap → drawer */}
            {fileAction.length > 0 && (
              <DashboardFileAction prospects={fileAction} today={today.getTime()} />
            )}

            {/* Sector-specific widget — mobile */}
            <SectorDashboardWidgetMobile />

            {/* Alertes mobile */}
            {alertes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-[13px] font-bold text-red-600 mb-3">⚠ Alertes critiques</div>
                {alertes.slice(0, 3).map((a) => (
                  <Link key={a.id} href="/livrables" className={`flex items-center gap-3 p-2.5 rounded-xl mb-2 last:mb-0 ${a.type === "rouge" ? "bg-red-50" : a.type === "orange" ? "bg-orange-50" : "bg-yellow-50"}`}>
                    <span className="text-base">{a.type === "rouge" ? "📁" : a.type === "orange" ? "⏰" : "📊"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800 truncate">{a.titre}</div>
                      <div className="text-[12px] text-gray-500 truncate">{a.description}</div>
                    </div>
                    <span className={`min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1 text-white ${a.type === "rouge" ? "bg-red-500" : a.type === "orange" ? "bg-orange-500" : "bg-yellow-500"}`}>{a.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── DESKTOP VIEW ── */}
        <div className="hidden md:block p-5">

          {/* ── IA PROACTIVE INSIGHTS ── */}
          <InsightsBanner insights={insights} />

          {/* KPI */}
          <div className="grid grid-cols-4 gap-3.5 mb-5">
            {[
              { icon: "🔍", color: "bg-blue-50 text-blue-700",    num: total,           label: "établissements ciblés",  delta: `${contactRate}% contactés`,                                     trend: contactRate >= 50 ? "up" : "warn" as "up" | "warn" | "neutral", link: "Voir tous →",       href: "/campagnes" },
              { icon: "📈", color: "bg-teal-50 text-teal-700",    num: tresChaudes,     label: "prospects Très chaud",   delta: `${total > 0 ? Math.round((tresChaudes / total) * 100) : 0}% du pipeline`, trend: "up" as "up" | "warn" | "neutral",  link: "Voir la liste →",   href: "/qualification" },
              { icon: "🎯", color: "bg-orange-50 text-orange-700",num: scoreMoyen,      label: "Score BANT moyen /10",   delta: scoreMoyenNum >= 8 ? "Excellent ↑" : scoreMoyenNum >= 6 ? "Bon →" : "À renforcer ↓", trend: (scoreMoyenNum >= 8 ? "up" : scoreMoyenNum >= 6 ? "neutral" : "warn") as "up" | "warn" | "neutral", link: "Voir l'analyse →",  href: "/qualification" },
              { icon: "💰", color: "bg-purple-50 text-purple-700",num: pipelineTotal > 0 ? Math.round(pipelineTotal) : rdvFixes, suffix: pipelineTotal > 0 ? "k€" : "", label: pipelineTotal > 0 ? "CA pipeline estimé" : "RDV fixés", delta: pipelineTotal > 0 ? `${prospects.filter(p => p.statut === "Converti").length} convertis · ${rdvFixes} RDV` : `${actionsUrgentes} alertes`, trend: "up" as "up" | "warn" | "neutral", link: pipelineTotal > 0 ? "Voir pipeline →" : "Voir le détail →", href: "/qualification" },
            ].map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-fade-up hover:shadow-md transition-shadow duration-200"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center text-base ${kpi.color}`}>{kpi.icon}</div>
                  <Sparkline values={kpiTrends[i]} color={kpiTrendColors[i]} />
                </div>
                <div className="text-[26px] font-extrabold text-gray-900 leading-none">
                  <CountUp value={kpi.num} suffix={(kpi as { suffix?: string }).suffix ?? ""} />
                </div>
                {kpi.delta && (
                  <div className={`text-[11px] font-medium mt-0.5 ${kpi.trend === "up" ? "text-green-600" : kpi.trend === "warn" ? "text-orange-500" : "text-gray-400"}`}>
                    {kpi.trend === "up" ? "↑ " : kpi.trend === "warn" ? "→ " : ""}{kpi.delta}
                  </div>
                )}
                <div className="text-[12.5px] text-gray-500 mt-1">{kpi.label}</div>
                <Link href={kpi.href} className="text-[11.5px] text-[#4a90d9] mt-2.5 hover:underline block">{kpi.link}</Link>
              </div>
            ))}
          </div>

          {/* ── COCKPIT DIRIGEANT ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-gray-800">Cockpit dirigeant</span>
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Détection proactive</span>
              </div>
              <Link href="/reporting" className="text-[11.5px] text-[#4a90d9] hover:underline">Vue complète →</Link>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {risks.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2.5 border transition-all duration-200 hover:shadow-sm ${
                    r.level === "ok"       ? "bg-green-50  border-green-200"  :
                    r.level === "warning"  ? "bg-orange-50 border-orange-200" :
                                             "bg-red-50    border-red-200"
                  }`}
                  style={{ animationDelay: `${300 + i * 50}ms` }}
                >
                  <div className="text-base mb-1">{r.icon}</div>
                  <div className="text-[11.5px] font-semibold text-gray-800 leading-tight">{r.label}</div>
                  <div className={`text-[11px] mt-0.5 leading-tight ${
                    r.level === "ok" ? "text-green-700" : r.level === "warning" ? "text-orange-700" : "text-red-700"
                  }`}>{r.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SCÉNARIO PRÉDICTIF IA ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-gray-800">📈 Prévision IA — objectif fin de campagne</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${riskLevel === "faible" ? "bg-green-100 text-green-700" : riskLevel === "moyen" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                  Risque {riskLevel}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">Confiance IA : <strong className="text-gray-700">{aiConfidencePct}%</strong></span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2.5 font-medium">Sans action aujourd&apos;hui</div>
                <div className="text-[36px] font-extrabold text-gray-400 leading-none mb-1">{baseObjectif}%</div>
                <div className="text-[11px] text-gray-400 mb-2.5">objectif atteint estimé</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gray-400 transition-all duration-700" style={{ width: `${baseObjectif}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-primary)]/25 p-4 bg-teal-50/60">
                <div className="text-[11px] text-[var(--color-primary)] uppercase tracking-wider mb-2.5 font-bold">Recommandations IA suivies ✓</div>
                <div className="text-[36px] font-extrabold text-[var(--color-primary)] leading-none mb-1">{boostedObjectif}%</div>
                <div className="text-[11px] text-[var(--color-primary)]/70 mb-2.5">objectif atteint estimé</div>
                <div className="h-2 bg-[var(--color-primary)]/15 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700" style={{ width: `${boostedObjectif}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-[var(--color-primary)]/[0.06] rounded-lg px-3 py-2">
              <span className="text-base flex-shrink-0">🧠</span>
              <p className="text-[12px] text-gray-600 leading-snug">
                <strong className="text-[var(--color-primary)]">+{boostedObjectif - baseObjectif} points</strong> de progression estimée si les <strong className="text-gray-800">{recommendations.length} recommandations</strong> sont appliquées cette semaine.
                {pipelineTotal > 0 && <> Impact CA estimé : <strong className="text-[var(--color-primary)]">+{Math.round(pipelineTotal * (boostedObjectif - baseObjectif) / 10000)}k€</strong>.</>}
              </p>
            </div>
          </div>

          {/* ── TOP RECOMMANDATIONS IA ── */}
          {recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 animate-fade-up" style={{ animationDelay: "320ms" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-800">🤖 Recommandations IA</span>
                  <span className="text-[11px] font-semibold bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">Moteur de décision</span>
                </div>
                <Link href="/qualification" className="text-[11.5px] text-[#4a90d9] hover:underline">Voir tous →</Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <Link
                    key={i}
                    href="/qualification"
                    className="group border border-gray-200 rounded-xl p-3.5 hover:border-[var(--color-primary)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block animate-scale-in"
                    style={{ animationDelay: `${400 + i * 80}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        rec.urgency === "critical" ? "bg-red-100 text-red-700" :
                        rec.urgency === "high"     ? "bg-orange-100 text-orange-700" :
                                                     "bg-blue-100 text-blue-700"
                      }`}>
                        {rec.urgency === "critical" ? "URGENT" : rec.urgency === "high" ? "PRIORITÉ" : "CONSEILLÉ"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400">Confiance</span>
                        <span className="text-[13px] font-extrabold text-[var(--color-primary)]">{rec.confidence}%</span>
                      </div>
                    </div>

                    {/* Prospect */}
                    <div className="text-[13px] font-bold text-gray-900 leading-tight mb-0.5">{rec.prospect.nom}</div>
                    <div className="text-[11px] text-gray-500 mb-2.5">{rec.prospect.segment} · BANT {rec.prospect.scoreBANT}/10</div>

                    {/* Confidence bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full bar-fill" style={{ width: `${rec.confidence}%`, background: "var(--color-primary)" }} />
                    </div>

                    {/* Impact estimé */}
                    <div className="flex items-center justify-between bg-[var(--color-primary)]/[0.07] rounded-lg px-2.5 py-1.5 mb-2">
                      <span className="text-[11px] text-[var(--color-primary)]/70 font-medium">Impact estimé</span>
                      <span className="text-[12.5px] font-extrabold text-[var(--color-primary)]">
                        +{Math.round(
                          (parseFloat(rec.prospect.valeurPotentielle ?? "0") > 0
                            ? parseFloat(rec.prospect.valeurPotentielle!)
                            : rec.prospect.scoreBANT * 3.2 + 4
                          ) * rec.confidence / 100
                        )}k€
                      </span>
                    </div>

                    {/* Timing impact */}
                    <div className="flex gap-1.5 mb-2.5">
                      <div className="flex-1 bg-teal-50 border border-teal-100 rounded-lg p-1.5 text-center">
                        <div className="text-[11px] font-semibold text-teal-600">Aujourd'hui</div>
                        <div className="text-[12px] font-extrabold text-teal-700">+{rec.todayBoost}%</div>
                      </div>
                      <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-1.5 text-center">
                        <div className="text-[11px] font-semibold text-red-500">J+3</div>
                        <div className="text-[12px] font-extrabold text-red-600">{rec.delayPenalty}%</div>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-0.5 mb-2.5">
                      {rec.reasons.slice(0, 2).map((r, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                          <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                          <span className="leading-snug">{r}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] font-bold text-[var(--color-primary)] group-hover:underline">→ {rec.action}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline banner */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 animate-fade-up" style={{ animationDelay: "380ms" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-semibold text-gray-800">Pipeline commercial</span>
              <span className="text-[11.5px] text-gray-400">{prospects.length} prospects au total</span>
            </div>
            <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mb-3.5">
              {pipelineSteps.filter((s) => s.count > 0).map((s) => (
                <div key={s.label} style={{ flex: s.count, background: s.color, transition: "flex 1s ease" }} title={`${s.label}: ${s.count}`} />
              ))}
            </div>
            <div className="flex gap-6">
              {pipelineSteps.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-[12px] text-gray-500">{s.label}</span>
                  <span className="text-[13px] font-bold text-gray-900">
                    <CountUp value={s.count} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* File d'action du jour */}
          {fileAction.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 animate-fade-up" style={{ animationDelay: "420ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔔</span>
                <span className="text-[13px] font-semibold text-orange-800">File d&apos;action du jour</span>
                <span className="text-[11px] font-semibold bg-orange-200 text-orange-700 rounded-full px-2 py-0.5 ml-1">{fileAction.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {fileAction.map((p) => {
                  const d    = parseFRDate(p.prochaineRelance)!;
                  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
                  return (
                    <Link key={p.id} href="/qualification" className="bg-white rounded-lg border border-orange-200 p-2.5 hover:border-orange-400 hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-gray-800 truncate flex-1">{p.nom}</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ml-1 ${diff < 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                          {diff < 0 ? `J+${Math.abs(diff)}` : "Auj."}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">{p.segment} · {p.cluster}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{p.canal || p.interlocuteur}</div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sector KPIs + AI alerts */}
          <SectorKPIPanel />

          {/* Sector-specific widget — desktop */}
          <SectorDashboardWidget />

          {/* Main 2-col layout */}
          <div className="grid grid-cols-[1fr_252px] gap-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-semibold text-gray-900">Mes campagnes en cours</span>
                <Link href="/campagnes" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12.5px] text-gray-600 hover:bg-gray-50 transition-colors">Voir toutes les campagnes</Link>
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
                      <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-3.5 py-3 text-[13px] font-semibold text-gray-800">{c.nom}</td>
                        <td className="px-3.5 py-3 text-[13px] text-gray-600">{c.perimetre}</td>
                        <td className="px-3.5 py-3">
                          <span className={`text-[13px] font-semibold ${c.joursRestants <= 10 && c.joursRestants > 0 ? "text-red-600" : "text-gray-800"}`}>
                            {c.joursRestants > 0 ? `J-${c.joursRestants}` : "Terminé"}
                          </span>
                          <div className="text-[11px] text-gray-400">{c.deadline}</div>
                        </td>
                        <td className="px-3.5 py-3"><ScoreTag score={c.score} /></td>
                        <td className="px-3.5 py-3">
                          <Badge variant={c.statut === "Actif" ? "tres-chaud" : c.statut === "En cours" ? "en-cours" : c.statut === "Terminé" ? "valide" : "a-rediger"}>{c.statut}</Badge>
                        </td>
                        <td className="px-3.5 py-3 text-right"><Link href="/campagnes" className="text-gray-300 hover:text-[var(--color-primary)] transition-colors">›</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-[200px_1fr_200px] gap-3.5">
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
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Scores BANT par cluster</div>
                  <div className="space-y-2.5">
                    {clusterScores.map((c) => (
                      <div key={c.nom}>
                        <div className="flex justify-between text-[12px] text-gray-600 mb-1"><span>{c.nom}</span><span className="font-semibold">{c.score}</span></div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--color-primary)] bar-fill" style={{ width: `${(c.score / 10) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="text-[12.5px] font-semibold text-gray-700 mb-3">Actions recommandées</div>
                  {[
                    { ico: "📞", txt: "Appeler IFSI CHU Lyon — urgent S1", href: "/qualification" },
                    { ico: "📧", txt: "Email relance CPGE Lyon J+7",        href: "/qualification" },
                    { ico: "🔗", txt: "LinkedIn Kedge Bordeaux J+3",        href: "/qualification" },
                    { ico: "📊", txt: "Planifier /analyse à J+30",          href: "/reporting" },
                  ].map((a, i) => (
                    <Link key={i} href={a.href} className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors">
                      <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-[11px] flex-shrink-0">{a.ico}</span>
                      <span className="text-[12px] text-gray-600 leading-snug flex-1">{a.txt}</span>
                      <span className="text-gray-300 text-sm">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3.5">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-red-600 mb-3"><span>⚠</span> Alertes critiques</div>
                {alertes.map((a) => (
                  <Link key={a.id} href="/livrables" className={`flex items-start gap-2.5 p-2.5 rounded-lg mb-2 hover:opacity-90 transition-opacity ${a.type === "rouge" ? "bg-red-50" : a.type === "orange" ? "bg-orange-50" : "bg-yellow-50"}`}>
                    <span className="text-base flex-shrink-0 mt-0.5">{a.type === "rouge" ? "📁" : a.type === "orange" ? "⏰" : "📊"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-gray-800">{a.titre}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">{a.description}</div>
                      <span className="text-[11.5px] text-[#4a90d9] mt-1 block">Voir les dossiers →</span>
                    </div>
                    <span className={`min-w-[20px] h-5 rounded-full text-[11px] font-bold flex items-center justify-center px-1 text-white ${a.type === "rouge" ? "bg-red-500" : a.type === "orange" ? "bg-orange-500" : "bg-yellow-500"}`}>{a.count}</span>
                  </Link>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2c7a7b] mb-3">
                  <CalendarDays className="w-3.5 h-3.5" />
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
        </div>
      </main>

      <div className="hidden md:block">
        <ConseilBar
          text="Lancez les appels IFSI CHU (Lyon, Lille, Bordeaux, Marseille) simultanément en semaine 1. Une réponse positive crée une référence CHU exploitable pour les autres dès J+5."
          stats={[
            { label: "Impact", value: pipelineTotal > 0 ? `+${Math.round(pipelineTotal * 0.3)}k€` : "+18k€" },
            { label: "Confiance IA", value: `${aiConfidencePct}%`, highlight: true },
          ]}
        />
      </div>
    </>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 52, H = 18;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(" ");
  const [lx, ly] = pts.split(" ").pop()!.split(",");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[52px] h-[18px]">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

function DonutChart({ data }: { data: { nom: string; count: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let offset  = 0;
  const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 100 100" className="w-[100px] h-[100px]">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#edf2f7" strokeWidth="16" />
        {data.map((d) => {
          const dash     = (d.count / total) * circumference;
          const rotation = (offset / total) * 360 - 90;
          offset += d.count;
          return <circle key={d.nom} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth="16" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={0} transform={`rotate(${rotation} ${cx} ${cy})`} />;
        })}
        <text x="50" y="54" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: "#1a202c" }}>{total}</text>
      </svg>
    </div>
  );
}
