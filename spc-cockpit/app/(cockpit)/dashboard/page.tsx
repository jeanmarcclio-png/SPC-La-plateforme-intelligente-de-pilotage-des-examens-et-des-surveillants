import { Topbar } from "@/components/Topbar";
import { ConseilBar } from "@/components/ConseilBar";
import { Badge, ScoreTag } from "@/components/Badge";
import Link from "next/link";
import { getCampagnes, getAlertes, getEcheances, getClusterScores, getSegmentRepartition, getProspects } from "@/lib/supabase/queries";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { DashboardFileAction } from "@/components/DashboardFileAction";
import { computeRecommendations, detectRisks, generateInsights } from "@/lib/ai/engine";
import { InsightsBanner, InsightsBannerMobile } from "@/components/InsightsBanner";
import { CountUp } from "@/components/CountUp";
import { ContactDuJour } from "@/components/ContactDuJour";

export default async function DashboardPage() {
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
  const pipelineTotal   = prospects.reduce((s, p) => s + (typeof p.valeurPotentielle === "number" ? p.valeurPotentielle : 0), 0);

  const pipelineSteps = [
    { label: "Non contacté", count: prospects.filter((p) => p.statut === "Non contacté").length, color: "#a0aec0" },
    { label: "En cours",     count: prospects.filter((p) => p.statut === "En cours").length,     color: "#4a90d9" },
    { label: "RDV fixé",     count: prospects.filter((p) => p.statut === "RDV fixé").length,     color: "#d97706" },
    { label: "Converti",     count: prospects.filter((p) => p.statut === "Converti").length,     color: "#38a169" },
  ];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  function parseFRDate(s?: string): Date | null {
    if (!s) return null;
    const parts = s.split("/");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }

  const fileAction = prospects
    .filter((p) => { const d = parseFRDate(p.prochaineRelance); return d && d.getTime() <= today.getTime(); })
    .sort((a, b) => { const da = parseFRDate(a.prochaineRelance)!.getTime(); const db = parseFRDate(b.prochaineRelance)!.getTime(); return da !== db ? da - db : b.scoreBANT - a.scoreBANT; })
    .slice(0, 6);

  const iaRec   = [...prospects].filter((p) => p.statut !== "Converti" && p.statut !== "RDV fixé").sort((a, b) => b.scoreBANT - a.scoreBANT)[0];
  const iaProba = iaRec ? Math.min(Math.round(iaRec.scoreBANT * 8 + 15), 95) : 0;

  const recommendations = computeRecommendations(prospects);
  const urgentEcheances = echeances.filter((e) => (e as { urgent?: boolean }).urgent).length;
  const risks           = detectRisks({ prospects, totalAlertes: actionsUrgentes, urgentEcheances });
  const insights        = generateInsights({ prospects, campagnes, totalAlertes: actionsUrgentes, urgentEcheances });

  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

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
          <div className="px-4 pt-5 pb-4" style={{ background: "#1a6b7e" }}>
            <div className="text-[22px] font-extrabold text-white">Bonjour Jean-Marc 👋</div>
            <div className="text-[13px] text-white/70 mt-0.5">{dateStr}</div>
          </div>

          <div className="p-4 space-y-3">
            {/* IA Proactive — mobile */}
            <InsightsBannerMobile insights={insights} />

            {/* Pipeline banner */}
            <Link href="/qualification" className="block rounded-2xl p-4" style={{ background: "#0d1e2e" }}>
              <div className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">Pipeline total</div>
              <div className="text-[32px] font-extrabold text-[#4a90d9] leading-none">
                {pipelineTotal > 0 ? `${(pipelineTotal / 1000).toFixed(0)}k €` : `${total} prospects`}
              </div>
              <div className="text-[13px] text-white/60 mt-1">{total} prospects · voir tout →</div>
            </Link>

            {/* KPI 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Prospects",    value: total,      color: "#1a202c", sub: `${aRelancer} à contacter`,                                         href: "/qualification" },
                { label: "Priorité haute",value: tresChaudes,color: "#f6ad55", sub: `${prospects.filter(p => p.statut === "En cours").length} en cours`, href: "/qualification" },
                { label: "RDV fixés",    value: rdvFixes,   color: "#38a169", sub: `${prospects.filter(p => p.statut === "Converti").length} convertis`, href: "/qualification" },
                { label: "À relancer",   value: aRelancer,  color: "#1a6b7e", sub: "voir l'agenda →",                                                   href: "/qualification" },
              ].map((k) => (
                <Link key={k.label} href={k.href} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:opacity-70">
                  <div className="text-[30px] font-extrabold leading-none" style={{ color: k.color }}>
                    <CountUp value={k.value} />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-700 mt-1">{k.label}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{k.sub}</div>
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

            {/* Alertes mobile */}
            {alertes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-[13px] font-bold text-red-600 mb-3">⚠ Alertes critiques</div>
                {alertes.slice(0, 3).map((a) => (
                  <Link key={a.id} href="/livrables" className={`flex items-center gap-3 p-2.5 rounded-xl mb-2 last:mb-0 ${a.type === "rouge" ? "bg-red-50" : a.type === "orange" ? "bg-orange-50" : "bg-yellow-50"}`}>
                    <span className="text-base">{a.type === "rouge" ? "📁" : a.type === "orange" ? "⏰" : "📊"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-gray-800 truncate">{a.titre}</div>
                      <div className="text-[11px] text-gray-500 truncate">{a.description}</div>
                    </div>
                    <span className={`min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center px-1 text-white ${a.type === "rouge" ? "bg-red-500" : a.type === "orange" ? "bg-orange-500" : "bg-yellow-500"}`}>{a.count}</span>
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
              { icon: "🔍", color: "bg-blue-50 text-blue-700",    num: total,           label: "établissements ciblés",  link: "Voir tous →",       href: "/campagnes" },
              { icon: "📈", color: "bg-teal-50 text-teal-700",    num: tresChaudes,     label: "prospects Très chaud",   link: "Voir la liste →",   href: "/qualification" },
              { icon: "🎯", color: "bg-orange-50 text-orange-700",num: scoreMoyen,      label: "Score BANT moyen /10",   link: "Voir l'analyse →",  href: "/qualification" },
              { icon: "⚠️", color: "bg-red-50 text-red-700",      num: actionsUrgentes, label: "actions urgentes",       link: "Voir le détail →",  href: "/livrables" },
            ].map((kpi, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-fade-up hover:shadow-md transition-shadow duration-200"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center mb-2.5 text-base ${kpi.color}`}>{kpi.icon}</div>
                <div className="text-[26px] font-extrabold text-gray-900 leading-none">
                  <CountUp value={kpi.num} />
                </div>
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
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Détection proactive</span>
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
                  <div className={`text-[10.5px] mt-0.5 leading-tight ${
                    r.level === "ok" ? "text-green-700" : r.level === "warning" ? "text-orange-700" : "text-red-700"
                  }`}>{r.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TOP RECOMMANDATIONS IA ── */}
          {recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 animate-fade-up" style={{ animationDelay: "320ms" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-800">🤖 Recommandations IA</span>
                  <span className="text-[10px] font-semibold bg-teal-50 text-teal-600 border border-teal-200 rounded-full px-2 py-0.5">Moteur de décision</span>
                </div>
                <Link href="/qualification" className="text-[11.5px] text-[#4a90d9] hover:underline">Voir tous →</Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <Link
                    key={i}
                    href="/qualification"
                    className="group border border-gray-200 rounded-xl p-3.5 hover:border-[#1a6b7e] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block animate-scale-in"
                    style={{ animationDelay: `${400 + i * 80}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rec.urgency === "critical" ? "bg-red-100 text-red-700" :
                        rec.urgency === "high"     ? "bg-orange-100 text-orange-700" :
                                                     "bg-blue-100 text-blue-700"
                      }`}>
                        {rec.urgency === "critical" ? "URGENT" : rec.urgency === "high" ? "PRIORITÉ" : "CONSEILLÉ"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400">Confiance</span>
                        <span className="text-[13px] font-extrabold text-[#1a6b7e]">{rec.confidence}%</span>
                      </div>
                    </div>

                    {/* Prospect */}
                    <div className="text-[13px] font-bold text-gray-900 leading-tight mb-0.5">{rec.prospect.nom}</div>
                    <div className="text-[11px] text-gray-500 mb-2.5">{rec.prospect.segment} · BANT {rec.prospect.scoreBANT}/10</div>

                    {/* Confidence bar */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full bar-fill" style={{ width: `${rec.confidence}%`, background: "#1a6b7e" }} />
                    </div>

                    {/* Timing impact */}
                    <div className="flex gap-1.5 mb-2.5">
                      <div className="flex-1 bg-teal-50 border border-teal-100 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] font-semibold text-teal-600">Aujourd'hui</div>
                        <div className="text-[12px] font-extrabold text-teal-700">+{rec.todayBoost}%</div>
                      </div>
                      <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-1.5 text-center">
                        <div className="text-[9px] font-semibold text-red-500">J+3</div>
                        <div className="text-[12px] font-extrabold text-red-600">{rec.delayPenalty}%</div>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-0.5 mb-2.5">
                      {rec.reasons.slice(0, 2).map((r, j) => (
                        <div key={j} className="flex items-start gap-1.5 text-[10.5px] text-gray-600">
                          <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                          <span className="leading-snug">{r}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] font-bold text-[#1a6b7e] group-hover:underline">→ {rec.action}</div>
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
                        <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ml-1 ${diff < 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
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
                            {c.joursRestants > 0 ? `J+${c.joursRestants}` : "Terminé"}
                          </span>
                          <div className="text-[11px] text-gray-400">{c.deadline}</div>
                        </td>
                        <td className="px-3.5 py-3"><ScoreTag score={c.score} /></td>
                        <td className="px-3.5 py-3">
                          <Badge variant={c.statut === "Actif" ? "tres-chaud" : c.statut === "En cours" ? "en-cours" : c.statut === "Terminé" ? "valide" : "a-rediger"}>{c.statut}</Badge>
                        </td>
                        <td className="px-3.5 py-3 text-right"><Link href="/campagnes" className="text-gray-300 hover:text-[#1a6b7e] transition-colors">›</Link></td>
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
                          <div className="h-full rounded-full bg-[#1a6b7e] bar-fill" style={{ width: `${(c.score / 10) * 100}%` }} />
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
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
        <ConseilBar text="Lancez les appels IFSI CHU (Lyon, Lille, Bordeaux, Marseille) simultanément en semaine 1. Une réponse positive crée une référence CHU exploitable pour les autres dès J+5." />
      </div>
    </>
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
