export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProspects, getCampagnes, getAlertes, getEcheances } from "@/lib/supabase/queries";
import { SEGMENT_CA } from "@/lib/constants";
import type { Prospect } from "@/lib/types";
import { PilotMain, SectionHead, Pill, ScoreBar, SignalRow, fr1, type PillTone } from "@/components/pilot";

/**
 * APERÇU v2 — direction « centre de pilotage » densifiée (essai réversible).
 * Route dédiée : le Dashboard d'origine (/dashboard) reste 100 % intact.
 * Information design + densité opérationnelle réelle : hero à courbe, entonnoir,
 * priorités denses, santé des campagnes, signaux (alertes + échéances), copilote.
 * teal de marque assumé + ambre en énergie, un serif d'accent, zéro carte à filet.
 *
 * Le langage visuel (tokens + grammaire CSS + primitives) vit désormais dans
 * @/components/pilot — référence de design partagée par tout le SaaS.
 */

function round(n: number) { return Math.round(n); }

export default async function DashboardApercuPage() {
  const [prospects, campagnes, alertes, echeances] = await Promise.all([
    getProspects(), getCampagnes(), getAlertes(), getEcheances(),
  ]);

  const total = prospects.length;
  const rdvFixes = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis = prospects.filter((p) => p.statut === "Converti").length;
  const nonContacte = prospects.filter((p) => p.statut === "Non contacté").length;
  const enCours = prospects.filter((p) => p.statut === "En cours").length;
  const aRelancer = nonContacte + enCours;
  const scoreMoyen = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;
  const conversion = total > 0 ? Math.round(((rdvFixes + convertis) / total) * 100) : 0;
  const fortPotentielNonContacte = prospects.filter((p) => p.statut === "Non contacté" && p.scoreBANT >= 8).length;

  const pipelineTotal = prospects.reduce((s, p) => {
    const fromDB = parseFloat(p.valeurPotentielle ?? "") || 0;
    const base = SEGMENT_CA[p.segment as string] ?? 30;
    const estimate = Math.round(base * (0.6 + (Number(p.scoreBANT) || 0) * 0.04));
    return s + Math.max(fromDB, estimate);
  }, 0);

  const seg = [
    { l: "Non contacté", n: nonContacte, c: "#c7ccc5" },
    { l: "En cours", n: enCours, c: "#7c96b8" },
    { l: "RDV fixé", n: rdvFixes, c: "var(--amber)" },
    { l: "Converti", n: convertis, c: "var(--good)" },
  ];
  const denom = total || 1;

  // Courbe : tendance ESTIMÉE (assumée comme telle), calée sur le pipeline réel.
  const W = 320, H = 146, top = 22, bottom = 124;
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return pipelineTotal * (0.55 + 0.45 * t + Math.sin(i * 1.7) * 0.05);
  });
  pts[pts.length - 1] = pipelineTotal;
  const lo = Math.min(...pts), hi = Math.max(...pts) || 1;
  const coords = pts.map((v, i) => {
    const x = (i / 11) * W;
    const y = hi === lo ? (top + bottom) / 2 : bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    return [x, y] as const;
  });
  const linePath = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const [ex, ey] = coords[coords.length - 1];

  const priorites: Prospect[] = [...prospects].sort((a, b) => b.scoreBANT - a.scoreBANT).slice(0, 5);
  const recs = [...prospects].sort((a, b) => b.scoreBANT - a.scoreBANT).slice(0, 2);
  const campSante = [...campagnes].sort((a, b) => b.score - a.score).slice(0, 4);
  const alertesTop = alertes.slice(0, 3);
  const echeancesTop = echeances.slice(0, 3);

  function pill(p: Prospect): { tone: PillTone; txt: string } {
    if (p.niveau === "Très chaud") return { tone: "hot", txt: "Très chaud" };
    if (p.statut === "RDV fixé") return { tone: "rdv", txt: "RDV fixé" };
    if (p.statut === "Converti") return { tone: "rdv", txt: "Converti" };
    return { tone: "warm", txt: p.statut };
  }
  const alerteColor = (t: string) => (t === "rouge" ? "var(--crit)" : t === "orange" ? "var(--warn)" : "var(--amber)");
  const campColor = (score: number) => (score >= 7.5 ? "var(--good)" : score >= 5 ? "var(--amber)" : "var(--crit)");

  return (
    <PilotMain>

        <section className="hero">
          <div>
            <div className="eyebrow">Où se joue le trimestre</div>
            <div className="metric">
              <span className="big num">{round(pipelineTotal)}<span className="u">k€</span></span>
              <span className="trend">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" width="14" height="14"><path d="M4 17 10 11l4 4 6-7" /><path d="M16 8h4v4" /></svg>
                {conversion}% conv.
              </span>
            </div>
            <p className="story"><b>{total} prospects actifs</b>, score BANT moyen <b className="num">{scoreMoyen.toFixed(1).replace(".", ",")}</b>.{fortPotentielNonContacte > 0 && <> <mark>{fortPotentielNonContacte} à fort potentiel</mark> pas encore contactés.</>}</p>
            <div className="mini">
              <div><div className="n num">{rdvFixes}</div><div className="l">RDV fixés</div></div>
              <div><div className="n num">{aRelancer}</div><div className="l">à relancer</div></div>
              <div><div className="n num">{campagnes.length}</div><div className="l">campagnes</div></div>
            </div>
          </div>

          <div className="chart">
            <div className="cap"><span className="t">Pipeline · tendance estimée</span><span className="leg">k€ HT</span></div>
            <svg viewBox="0 0 320 146" preserveAspectRatio="none" aria-label="Tendance estimée du pipeline">
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
              <line className="gridline" x1="0" y1="22" x2="320" y2="22" /><line className="gridline" x1="0" y1="73" x2="320" y2="73" /><line className="gridline" x1="0" y1="124" x2="320" y2="124" />
              <path className="area" d={areaPath} />
              <path className="line" d={linePath} />
              <circle className="endpt" cx={ex} cy={ey} r="4.5" />
              <text className="endlab" x={ex - 8} y={ey - 8} textAnchor="end">{round(pipelineTotal)}</text>
            </svg>
          </div>
        </section>

        <section className="funnel">
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
        </section>

        <div className="grid2">
          <div>
            <div className="block">
              <SectionHead title="À traiter en priorité" href="/qualification" />
              <div>
                {priorites.map((p) => {
                  const pl = pill(p);
                  return (
                    <Link className="row" href="/qualification" key={p.id}>
                      <span className="nm">{p.nom}</span>
                      <span className="sub">{(p.contactPrincipal || p.interlocuteur || p.segment)} · {p.segment}</span>
                      <span className="right">
                        <ScoreBar score={p.scoreBANT} />
                        <Pill tone={pl.tone}>{pl.txt}</Pill>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="block">
              <SectionHead title="Santé des campagnes" href="/campagnes" hrefLabel="Toutes →" />
              <div>
                {campSante.map((c) => (
                  <Link className="camp" href="/campagnes" key={c.id}>
                    <span><span className="nm">{c.nom}</span><div className="sub">{c.perimetre} · {c.nombreProspects} cibles</div></span>
                    <span className="bar"><i style={{ width: `${Math.min(c.score * 10, 100)}%`, background: campColor(c.score) }} /></span>
                    <span className="v num" style={{ color: campColor(c.score) }}>{fr1(c.score)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside>
            <div className="card">
              <div className="h"><span className="b ia">Copilote</span><span className="s">par probabilité</span></div>
              {recs.map((p) => (
                <div className="rec" key={p.id}>
                  <div className="top"><span className="nm">{p.nom}</span><span className="pc num">{Math.min(95, Math.round(p.scoreBANT * 9 + 8))} %</span></div>
                  <div className="why">{p.segment} · BANT {fr1(p.scoreBANT)} — {p.action || "meilleure probabilité de signature cette semaine"}.</div>
                  <Link className="act" href="/qualification">Préparer l&apos;appel →</Link>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="h"><span className="b sig">Signaux</span><span className="s">{alertes.reduce((s, a) => s + a.count, 0)} alertes</span></div>
              {alertesTop.map((a) => (
                <SignalRow key={a.id} href="/livrables" color={alerteColor(a.type)} title={a.titre} detail={a.description} count={a.count} />
              ))}
              {echeancesTop.map((e) => (
                <SignalRow key={`e${e.id}`} href="/planning" color={e.urgent ? "var(--crit)" : "var(--ink3)"} title={e.nom} detail="Échéance" tag={e.tag} />
              ))}
            </div>
          </aside>
        </div>

        <div className="foot">
          <span>Aperçu « centre de pilotage » v2 · données réelles (pipeline, campagnes, alertes, échéances). Courbe = tendance estimée.</span>
          <Link className="switch" href="/dashboard">← Revenir au Dashboard actuel</Link>
        </div>

    </PilotMain>
  );
}
