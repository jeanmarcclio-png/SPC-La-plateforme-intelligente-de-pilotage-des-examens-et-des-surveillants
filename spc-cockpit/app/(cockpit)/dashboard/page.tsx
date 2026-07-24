export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCampagnes, getAlertes, getEcheances, getClusterScores, getSegmentRepartition, getProspects } from "@/lib/supabase/queries";
import { SEGMENT_CA } from "@/lib/constants";
import { parseFRDate } from "@/lib/utils/date";
import { computeRecommendations, detectRisks, generateInsights } from "@/lib/ai/engine";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { SectorKPIPanel } from "@/components/SectorKPIPanel";
import { SectorDashboardWidget } from "@/components/SectorDashboardWidget";
import { PilotMain, SectionHead, Pill, SignalRow, fr1, type PillTone } from "@/components/pilot";

/**
 * Tableau de bord — langage « centre de pilotage » (référence, voir
 * docs/pilot-design-system.md). Toutes les fonctionnalités du dashboard riche
 * sont préservées (KPI, insights IA, détection proactive, prévision, reco IA,
 * pipeline, campagnes, clusters, segments, alertes, échéances, file d'action,
 * temps réel) — réhabillées en grammaire pilot : chiffres en encre, un accent
 * teal, couleur = sens, filets fins, zéro aplat.
 *
 * Îlots conservés tels quels (données propres au secteur, composants client) :
 * SectorKPIPanel et SectorDashboardWidget — prochaine étape de restylage.
 */

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userFirstName = user?.user_metadata?.full_name?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "vous";

  const [campagnes, alertes, echeances, clusterScores, segmentRepartition, prospects] = await Promise.all([
    getCampagnes(), getAlertes(), getEcheances(), getClusterScores(), getSegmentRepartition(), getProspects(),
  ]);

  const total           = prospects.length;
  const tresChaudes     = prospects.filter((p) => p.niveau === "Très chaud").length;
  const scoreMoyenNum    = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;
  const actionsUrgentes  = alertes.reduce((s, a) => s + a.count, 0);
  const rdvFixes         = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis        = prospects.filter((p) => p.statut === "Converti").length;
  const nonContacte      = prospects.filter((p) => p.statut === "Non contacté").length;
  const enCours          = prospects.filter((p) => p.statut === "En cours").length;
  const aRelancer        = nonContacte + enCours;
  const conversionRate   = total > 0 ? Math.round(((rdvFixes + convertis) / total) * 100) : 0;
  const contactRate      = total > 0 ? Math.round(((total - nonContacte) / total) * 100) : 0;
  const pipelineTotal = prospects.reduce((s, p) => {
    const fromDB   = parseFloat(p.valeurPotentielle ?? "") || 0;
    const b        = SEGMENT_CA[p.segment as string] ?? 30;
    const estimate = Math.round(b * (0.6 + (Number(p.scoreBANT) || 0) * 0.04));
    return s + Math.max(fromDB, estimate);
  }, 0);

  const baseObjectif    = Math.max(conversionRate, 12);
  const boostedObjectif = Math.min(baseObjectif + 29, 96);
  const aiConfidencePct = Math.min(Math.round(52 + tresChaudes * 4 + scoreMoyenNum * 2.5), 92);
  const riskLevel: "faible" | "moyen" | "critique" = baseObjectif >= 50 ? "faible" : baseObjectif >= 25 ? "moyen" : "critique";

  const seg = [
    { l: "Non contacté", n: nonContacte, c: "#c7ccc5" },
    { l: "En cours",     n: enCours,     c: "#7c96b8" },
    { l: "RDV fixé",     n: rdvFixes,    c: "var(--amber)" },
    { l: "Converti",     n: convertis,   c: "var(--good)" },
  ];
  const denom = total || 1;

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

  const alerteColor   = (t: string) => (t === "rouge" ? "var(--crit)" : t === "orange" ? "var(--warn)" : "var(--amber)");
  const campColor     = (score: number) => (score >= 7.5 ? "var(--good)" : score >= 5 ? "var(--amber)" : "var(--crit)");
  const riskColor     = (lvl: string) => (lvl === "ok" ? "var(--good)" : lvl === "warning" ? "var(--warn)" : "var(--crit)");
  const insightColor  = (t: string) => (t === "critical" ? "var(--crit)" : t === "opportunity" ? "var(--brand)" : "var(--ink3)");
  const urgencyTone   = (u: string): PillTone => (u === "critical" ? "hot" : u === "high" ? "warm" : "brand");
  const urgencyLabel  = (u: string) => (u === "critical" ? "Urgent" : u === "high" ? "Priorité" : "Conseillé");

  return (
    <>
      <RealtimeRefresh tables={["prospects", "campagnes", "alertes", "echeances"]} />

      <PilotMain>
        <header className="phead">
          <div>
            <div className="eyebrow">Tableau de bord</div>
            <h1>Bonjour {userFirstName}</h1>
            <div className="sub">{dateStr}</div>
          </div>
          <div className="actions">
            <Link className="switch" href="/reporting">Reporting complet →</Link>
          </div>
        </header>

        {/* IA proactive — signaux */}
        {insights.length > 0 && (
          <section style={{ marginTop: 18 }}>
            <div className="sechd"><h2>IA proactive</h2><span className="n num">{insights.length}</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 10 }}>
              {insights.map((ins, i) => (
                <Link key={i} href={ins.href} style={{ display: "flex", alignItems: "baseline", gap: 9, maxWidth: 360 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: insightColor(ins.type), transform: "translateY(-1px)", flex: "none" }} />
                  <span style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.35 }}>{ins.message} <b style={{ color: "var(--ink)", fontWeight: 640 }}>{ins.metric}</b></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Hero — pipeline + répartition réelle */}
        <section className="hero">
          <div>
            <div className="eyebrow">Pipeline commercial</div>
            <div className="metric">
              <span className="big num">{Math.round(pipelineTotal)}<span className="u">k€</span></span>
              <span className={`trend ${conversionRate >= 25 ? "" : conversionRate >= 12 ? "warn" : "crit"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" width="14" height="14"><path d="M4 17 10 11l4 4 6-7" /><path d="M16 8h4v4" /></svg>
                {conversionRate}% conv.
              </span>
            </div>
            <p className="story"><b className="num">{total} établissements</b> ciblés · <b className="num">{tresChaudes}</b> Très chaud · score BANT moyen <b className="num">{fr1(scoreMoyenNum)}</b>.{tresChaudes > 0 && <> <mark>{tresChaudes} prospects</mark> à activer en priorité.</>}</p>
            <div className="mini">
              <div><div className="n num">{rdvFixes}</div><div className="l">RDV fixés</div></div>
              <div><div className="n num">{aRelancer}</div><div className="l">à relancer</div></div>
              <div><div className="n num">{contactRate}%</div><div className="l">contactés</div></div>
              <div><div className="n num">{campagnes.length}</div><div className="l">campagnes</div></div>
            </div>
          </div>

          <div className="chart">
            <div className="cap"><span className="t">Répartition du pipeline</span><span className="leg">{total} prospects</span></div>
            <div className="funnel" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
              <div className="track" aria-hidden="true">
                {seg.map((s) => <i key={s.l} style={{ width: `${(s.n / denom) * 100}%`, background: s.c }} />)}
              </div>
              <div className="keys">
                {seg.map((s) => (
                  <div className="key" key={s.l}>
                    <span className="sw" style={{ background: s.c }} />
                    <span className="n num">{s.n}</span><span className="l">{s.l}</span>
                    <span className="p num">{Math.round((s.n / denom) * 100)} %</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Panneau KPI sectoriel (îlot secteur, données propres) */}
        <section style={{ marginTop: 34 }}>
          <SectorKPIPanel />
        </section>

        {/* Cockpit dirigeant — détection proactive */}
        {risks.length > 0 && (
          <section style={{ marginTop: 38 }}>
            <SectionHead title="Cockpit dirigeant — détection proactive" href="/reporting" hrefLabel="Vue complète →" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 0 }}>
              {risks.map((r, i) => (
                <div key={i} style={{ padding: "13px 16px 13px 0", borderTop: "1px solid var(--line)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor(r.level), marginTop: 5, flex: "none" }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 640, color: "var(--ink)" }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink3)", marginTop: 1, lineHeight: 1.35 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prévision IA — objectif fin de campagne */}
        <section style={{ marginTop: 38 }}>
          <div className="sechd">
            <h2>Prévision IA — objectif fin de campagne</h2>
            <span className="n num" style={{ color: riskLevel === "faible" ? "var(--good)" : riskLevel === "moyen" ? "var(--warn)" : "var(--crit)" }}>Risque {riskLevel} · confiance {aiConfidencePct}%</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink3)", fontWeight: 700 }}>Sans action aujourd&apos;hui</div>
              <div className="num" style={{ fontSize: 44, fontWeight: 730, letterSpacing: "-.04em", lineHeight: 1, color: "var(--ink3)", margin: "6px 0 8px" }}>{baseObjectif}%</div>
              <div className="camp" style={{ padding: 0, borderTop: 0, gridTemplateColumns: "1fr" }}><span className="bar"><i style={{ width: `${baseObjectif}%`, background: "var(--ink3)" }} /></span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--brand)", fontWeight: 700 }}>Recommandations IA suivies ✓</div>
              <div className="num" style={{ fontSize: 44, fontWeight: 730, letterSpacing: "-.04em", lineHeight: 1, color: "var(--brand)", margin: "6px 0 8px" }}>{boostedObjectif}%</div>
              <div className="camp" style={{ padding: 0, borderTop: 0, gridTemplateColumns: "1fr" }}><span className="bar"><i style={{ width: `${boostedObjectif}%`, background: "var(--brand)" }} /></span></div>
            </div>
          </div>
          <p className="story" style={{ maxWidth: "none", marginTop: 14 }}>
            <b>+{boostedObjectif - baseObjectif} points</b> de progression estimée si les <b>{recommendations.length} recommandations</b> sont appliquées cette semaine.
            {pipelineTotal > 0 && <> Impact CA estimé : <mark>+{Math.round(pipelineTotal * (boostedObjectif - baseObjectif) / 10000)}k€</mark>.</>}
          </p>
        </section>

        {/* Colonnes principales + rail */}
        <div className="grid2">
          <div>
            {recommendations.length > 0 && (
              <div className="block">
                <SectionHead title="Recommandations IA" href="/qualification" />
                <div className="card">
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <div className="rec" key={i}>
                      <div className="top">
                        <span className="nm">{rec.prospect.nom}</span>
                        <Pill tone={urgencyTone(rec.urgency)}>{urgencyLabel(rec.urgency)} · {rec.confidence}%</Pill>
                      </div>
                      <div className="why">{rec.prospect.segment} · BANT {fr1(rec.prospect.scoreBANT)} — auj. <b style={{ color: "var(--good)" }}>+{rec.todayBoost}%</b> / J+3 <b style={{ color: "var(--crit)" }}>{rec.delayPenalty}%</b>. {rec.reasons[0]}</div>
                      <Link className="act" href="/qualification">→ {rec.action}</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="block">
              <SectionHead title="Mes campagnes en cours" href="/campagnes" hrefLabel="Toutes →" />
              <div>
                {campagnes.map((c) => (
                  <Link className="camp" href="/campagnes" key={c.id}>
                    <span>
                      <span className="nm">{c.nom}</span>
                      <div className="sub">{c.perimetre} · {c.joursRestants > 0 ? `J-${c.joursRestants}` : "terminé"} · {c.statut}</div>
                    </span>
                    <span className="bar"><i style={{ width: `${Math.min(c.score * 10, 100)}%`, background: campColor(c.score) }} /></span>
                    <span className="v num" style={{ color: campColor(c.score) }}>{fr1(c.score)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="block">
              <SectionHead title="Scores BANT par cluster" href="/qualification" hrefLabel="Analyse →" />
              <div>
                {clusterScores.map((c) => (
                  <div className="camp" key={c.nom}>
                    <span className="nm">{c.nom}</span>
                    <span className="bar"><i style={{ width: `${(c.score / 10) * 100}%`, background: "var(--brand)" }} /></span>
                    <span className="v num">{fr1(c.score)}</span>
                  </div>
                ))}
              </div>
              <div className="keys" style={{ marginTop: 18 }}>
                {segmentRepartition.map((s) => (
                  <div className="key" key={s.nom}>
                    <span className="sw" style={{ background: s.color }} />
                    <span className="n num">{s.count}</span><span className="l">{s.nom}</span>
                  </div>
                ))}
              </div>
            </div>

            {fileAction.length > 0 && (
              <div className="block">
                <SectionHead title="File d'action du jour" count={fileAction.length} href="/qualification" />
                <div>
                  {fileAction.map((p) => {
                    const d = parseFRDate(p.prochaineRelance)!;
                    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
                    return (
                      <Link className="row" href="/qualification" key={p.id}>
                        <span className="nm">{p.nom}</span>
                        <span className="sub">{p.segment} · {p.cluster} · {p.canal || p.interlocuteur}</span>
                        <span className="right">
                          <Pill tone={diff < 0 ? "hot" : "warm"}>{diff < 0 ? `J+${Math.abs(diff)}` : "Aujourd'hui"}</Pill>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Widget sectoriel (îlot secteur, données propres) */}
            <div className="block">
              <SectorDashboardWidget />
            </div>
          </div>

          <aside>
            {iaRec && (
              <div className="card">
                <div className="h"><span className="b ia">Contact du jour</span><span className="s">{iaProba}% de probabilité</span></div>
                <div className="rec">
                  <div className="top"><span className="nm">{iaRec.nom}</span><span className="pc num">{iaProba}%</span></div>
                  <div className="why">{iaRec.segment} · BANT {fr1(iaRec.scoreBANT)} — meilleure probabilité de signature cette semaine.</div>
                  <Link className="act" href="/qualification">Préparer l&apos;appel →</Link>
                </div>
              </div>
            )}

            <div className="card">
              <div className="h"><span className="b sig">Signaux</span><span className="s">{actionsUrgentes} alertes</span></div>
              {alertes.slice(0, 4).map((a) => (
                <SignalRow key={a.id} href="/livrables" color={alerteColor(a.type)} title={a.titre} detail={a.description} count={a.count} />
              ))}
              {echeances.slice(0, 3).map((e, i) => (
                <SignalRow key={`e${i}`} href="/planning" color={(e as { urgent?: boolean }).urgent ? "var(--crit)" : "var(--ink3)"} title={e.nom} detail={e.date} tag={e.tag} />
              ))}
            </div>
          </aside>
        </div>

        <div className="foot">
          <span>Lancez les appels IFSI CHU (Lyon, Lille, Bordeaux, Marseille) en semaine 1 : une réponse positive crée une référence exploitable dès J+5.{pipelineTotal > 0 && ` Impact estimé +${Math.round(pipelineTotal * 0.3)}k€.`}</span>
          <span className="switch">Confiance IA {aiConfidencePct}%</span>
        </div>
      </PilotMain>
    </>
  );
}
