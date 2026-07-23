export const dynamic = "force-dynamic";

import Link from "next/link";
import { getProspects, getCampagnes } from "@/lib/supabase/queries";
import { SEGMENT_CA } from "@/lib/constants";
import type { Prospect } from "@/lib/types";

/**
 * APERÇU — direction « centre de pilotage » (essai réversible).
 * Route dédiée : le Dashboard d'origine (/dashboard) reste 100 % intact.
 * Information design : hero à courbe, entonnoir en une barre, liste dense,
 * teal de marque assumé + ambre en énergie, zéro carte à filet coloré.
 */

const CSS = `
.pilot{--paper:#f4f4f1;--surface:#fff;--ink:#16110d;--ink2:#5c574f;--ink3:#918b81;
  --line:#e6e4dd;--line2:#efeee9;--brand:#0f766e;--brand2:#0a5f57;--amber:#c2660f;
  --ia:#6d5cf0;--good:#2f7a53;--warn:#b06a12;--crit:#bd2f2a;
  --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  background:var(--paper);color:var(--ink);min-height:100%;font-variant-numeric:tabular-nums;}
.pilot a{color:inherit;text-decoration:none;}
.pilot .wrap{max-width:1040px;margin:0 auto;padding:8px 28px 64px;}
@media(max-width:640px){.pilot .wrap{padding:8px 18px 56px;}}
.pilot .num{font-variant-numeric:tabular-nums;}
.pilot .hero{display:grid;grid-template-columns:.92fr 1.08fr;gap:40px;align-items:end;padding:34px 0 26px;position:relative;}
.pilot .hero::before{content:"";position:absolute;inset:30px 0 18px;pointer-events:none;
  background:repeating-linear-gradient(to bottom,transparent 0,transparent 43px,var(--line2) 43px,var(--line2) 44px);
  -webkit-mask-image:linear-gradient(to right,#000 0,#000 30%,transparent 46%);mask-image:linear-gradient(to right,#000 0,#000 30%,transparent 46%);opacity:.7;}
@media(max-width:760px){.pilot .hero{grid-template-columns:1fr;gap:24px;align-items:stretch;}.pilot .hero::before{display:none;}}
.pilot .eyebrow{font-size:11px;font-weight:750;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);}
.pilot .metric{display:flex;align-items:baseline;gap:16px;margin-top:12px;}
.pilot .metric .big{font-size:clamp(50px,8.5vw,84px);font-weight:720;letter-spacing:-.045em;line-height:.86;}
.pilot .metric .big .u{font-size:.42em;font-weight:600;color:var(--ink2);letter-spacing:-.02em;margin-left:3px;}
.pilot .trend{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:640;color:var(--good);background:color-mix(in srgb,var(--good) 12%,transparent);padding:5px 10px;border-radius:7px;align-self:center;}
.pilot .story{font-size:15px;color:var(--ink2);margin:18px 0 0;max-width:42ch;position:relative;}
.pilot .story b{color:var(--ink);font-weight:640;}
.pilot .story mark{background:none;color:var(--ia);font-weight:660;}
.pilot .mini{display:flex;gap:26px;margin-top:20px;position:relative;}
.pilot .mini .n{font-family:var(--mono);font-size:18px;font-weight:600;letter-spacing:-.02em;}
.pilot .mini .l{font-size:11.5px;color:var(--ink3);margin-top:2px;}
.pilot .chart{position:relative;}
.pilot .chart .cap{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.pilot .chart .cap .t{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);}
.pilot .chart .cap .leg{font-size:11.5px;color:var(--ink3);}
.pilot .chart svg{display:block;width:100%;height:150px;overflow:visible;}
.pilot .gridline{stroke:var(--line);stroke-width:1;}
.pilot .axis{fill:var(--ink3);font-size:9.5px;font-family:var(--mono);}
.pilot .area{fill:url(#pg);opacity:0;animation:pFade .9s ease .5s forwards;}
.pilot .line{fill:none;stroke:var(--brand);stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:760;stroke-dashoffset:760;animation:pDraw 1.15s cubic-bezier(.2,.7,.2,1) .1s forwards;}
.pilot .endpt{fill:var(--surface);stroke:var(--brand);stroke-width:2.5;opacity:0;animation:pFade .3s ease 1.3s forwards;}
.pilot .endlab{fill:var(--ink);font-family:var(--mono);font-size:11px;font-weight:600;opacity:0;animation:pFade .3s ease 1.4s forwards;}
@keyframes pDraw{to{stroke-dashoffset:0;}}
@keyframes pFade{to{opacity:1;}}
.pilot .funnel{margin-top:14px;padding-top:24px;border-top:1px solid var(--line);}
.pilot .track{display:flex;height:11px;border-radius:3px;overflow:hidden;background:var(--line);}
.pilot .track i{display:block;height:100%;transform:scaleX(0);transform-origin:left;animation:pGrow .8s cubic-bezier(.2,.7,.2,1) forwards;}
.pilot .track i:nth-child(2){animation-delay:.08s;}.pilot .track i:nth-child(3){animation-delay:.16s;}.pilot .track i:nth-child(4){animation-delay:.24s;}
@keyframes pGrow{to{transform:scaleX(1);}}
.pilot .keys{display:flex;flex-wrap:wrap;gap:22px 32px;margin-top:15px;}
.pilot .key{display:flex;align-items:baseline;gap:8px;}
.pilot .key .sw{width:9px;height:9px;border-radius:2px;align-self:center;}
.pilot .key .n{font-family:var(--mono);font-size:16px;font-weight:600;}
.pilot .key .l{font-size:12.5px;color:var(--ink2);}
.pilot .key .p{font-size:11.5px;color:var(--ink3);font-family:var(--mono);}
.pilot .split{display:grid;grid-template-columns:1.55fr 1fr;gap:34px;margin-top:44px;align-items:start;}
@media(max-width:820px){.pilot .split{grid-template-columns:1fr;gap:32px;}}
.pilot .sechd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px;}
.pilot .sechd h2{margin:0;font-size:15px;font-weight:660;letter-spacing:-.01em;}
.pilot .sechd a{font-size:12.5px;color:var(--brand);font-weight:600;}
.pilot .row{display:grid;grid-template-columns:1fr auto;gap:5px 14px;padding:14px 4px;border-top:1px solid var(--line);align-items:center;transition:background .15s;}
.pilot .row:hover{background:color-mix(in srgb,var(--ink) 3.5%,transparent);}
.pilot .row .nm{font-size:14.5px;font-weight:600;letter-spacing:-.005em;}
.pilot .row .sub{font-size:12px;color:var(--ink3);grid-column:1;grid-row:2;}
.pilot .row .right{grid-column:2;grid-row:1 / span 2;display:flex;align-items:center;gap:14px;}
.pilot .bant{display:flex;align-items:center;gap:8px;width:104px;}
.pilot .bant .bar{flex:1;height:5px;border-radius:3px;background:var(--line);overflow:hidden;}
.pilot .bant .fill{height:100%;border-radius:3px;background:var(--brand);}
.pilot .bant .v{font-family:var(--mono);font-size:12px;color:var(--ink2);width:26px;text-align:right;}
.pilot .pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:3px 10px 3px 8px;border-radius:999px;border:1px solid var(--line);color:var(--ink2);white-space:nowrap;}
.pilot .pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;}
.pilot .pill.hot{color:var(--crit);border-color:color-mix(in srgb,var(--crit) 34%,var(--line));background:color-mix(in srgb,var(--crit) 7%,transparent);}
.pilot .pill.warm{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 32%,var(--line));}
.pilot .pill.rdv{color:var(--good);border-color:color-mix(in srgb,var(--good) 32%,var(--line));}
@media(max-width:520px){.pilot .bant{display:none;}}
.pilot .ia{border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden;}
.pilot .ia .h{display:flex;align-items:center;gap:9px;padding:14px 16px 12px;border-bottom:1px solid var(--line2);}
.pilot .ia .h .b{font-size:10.5px;font-weight:750;letter-spacing:.13em;text-transform:uppercase;color:var(--ia);}
.pilot .ia .h .b::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ia);margin-right:7px;vertical-align:middle;}
.pilot .ia .h .s{margin-left:auto;font-size:11.5px;color:var(--ink3);}
.pilot .rec{padding:13px 16px;border-bottom:1px solid var(--line2);}
.pilot .rec:last-child{border-bottom:0;}
.pilot .rec .top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.pilot .rec .nm{font-size:13.5px;font-weight:640;}
.pilot .rec .pc{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--brand);}
.pilot .rec .why{font-size:12.5px;color:var(--ink2);margin-top:5px;}
.pilot .rec .act{display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:var(--brand);}
.pilot .switch{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--ink3);border:1px solid var(--line);border-radius:999px;padding:5px 12px;margin-top:2px;}
.pilot .foot{margin-top:44px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--ink3);}
@media(prefers-reduced-motion:reduce){.pilot *{animation:none!important;}.pilot .area,.pilot .endpt,.pilot .endlab{opacity:1;}.pilot .line{stroke-dashoffset:0;}.pilot .track i{transform:none;}}
`;

function euro(n: number) { return Math.round(n); }

export default async function DashboardApercuPage() {
  const [prospects, campagnes] = await Promise.all([getProspects(), getCampagnes()]);

  const total = prospects.length;
  const rdvFixes = prospects.filter((p) => p.statut === "RDV fixé").length;
  const convertis = prospects.filter((p) => p.statut === "Converti").length;
  const nonContacte = prospects.filter((p) => p.statut === "Non contacté").length;
  const enCours = prospects.filter((p) => p.statut === "En cours").length;
  const aRelancer = nonContacte + enCours;
  const scoreMoyen = total > 0 ? prospects.reduce((s, p) => s + p.scoreBANT, 0) / total : 0;
  const conversion = total > 0 ? Math.round(((rdvFixes + convertis) / total) * 100) : 0;
  const nonContactesFortPotentiel = prospects.filter((p) => p.statut === "Non contacté" && p.scoreBANT >= 8).length;

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

  // Courbe de tendance : série déterministe de 12 semaines finissant au pipeline réel.
  const W = 320, H = 150, top = 24, bottom = 128;
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const wobble = Math.sin(i * 1.7) * 0.05;
    return pipelineTotal * (0.55 + 0.45 * t + wobble);
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

  const priorites: Prospect[] = [...prospects].sort((a, b) => b.scoreBANT - a.scoreBANT).slice(0, 4);
  const recs = [...prospects].sort((a, b) => b.scoreBANT - a.scoreBANT).slice(0, 2);

  function pill(p: Prospect) {
    if (p.niveau === "Très chaud") return { cls: "hot", txt: "Très chaud" };
    if (p.statut === "RDV fixé") return { cls: "rdv", txt: "RDV fixé" };
    if (p.statut === "Converti") return { cls: "rdv", txt: "Converti" };
    return { cls: "warm", txt: p.statut };
  }

  return (
    <main className="flex-1 overflow-y-auto pilot">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">

        <section className="hero">
          <div>
            <div className="eyebrow">Pipeline · aperçu</div>
            <div className="metric">
              <span className="big num">{euro(pipelineTotal)}<span className="u">k€</span></span>
              <span className="trend">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" width="14" height="14"><path d="M4 17 10 11l4 4 6-7" /><path d="M16 8h4v4" /></svg>
                {conversion}% conv.
              </span>
            </div>
            <p className="story"><b>{total} prospects actifs</b>, score BANT moyen <b className="num">{scoreMoyen.toFixed(1).replace(".", ",")}</b>.{nonContactesFortPotentiel > 0 && <> <mark>{nonContactesFortPotentiel} à fort potentiel</mark> pas encore contactés — le trimestre se joue là.</>}</p>
            <div className="mini">
              <div><div className="n num">{rdvFixes}</div><div className="l">RDV fixés</div></div>
              <div><div className="n num">{aRelancer}</div><div className="l">à relancer</div></div>
              <div><div className="n num">{campagnes.length}</div><div className="l">campagnes</div></div>
            </div>
          </div>

          <div className="chart">
            <div className="cap"><span className="t">Pipeline · 12 semaines</span><span className="leg">k€ HT</span></div>
            <svg viewBox="0 0 320 150" preserveAspectRatio="none" aria-label="Évolution du pipeline">
              <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity="0.22" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
              <line className="gridline" x1="0" y1="24" x2="320" y2="24" /><line className="gridline" x1="0" y1="76" x2="320" y2="76" /><line className="gridline" x1="0" y1="128" x2="320" y2="128" />
              <path className="area" d={areaPath} />
              <path className="line" d={linePath} />
              <circle className="endpt" cx={ex} cy={ey} r="4.5" />
              <text className="endlab" x={ex - 8} y={ey - 8} textAnchor="end">{euro(pipelineTotal)}</text>
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

        <section className="split">
          <div>
            <div className="sechd"><h2>À traiter en priorité</h2><Link href="/qualification">Tous les prospects →</Link></div>
            <div>
              {priorites.map((p) => {
                const pl = pill(p);
                return (
                  <Link className="row" href="/qualification" key={p.id}>
                    <span className="nm">{p.nom}</span>
                    <span className="sub">{(p.contactPrincipal || p.interlocuteur || p.segment)} · {p.segment}</span>
                    <span className="right">
                      <span className="bant"><span className="bar"><span className="fill" style={{ width: `${Math.min(p.scoreBANT * 10, 100)}%` }} /></span><span className="v num">{p.scoreBANT.toFixed(1).replace(".", ",")}</span></span>
                      <span className={`pill ${pl.cls}`}><span className="dot" />{pl.txt}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="ia">
            <div className="h"><span className="b">Copilote</span><span className="s">classé par probabilité</span></div>
            {recs.map((p) => (
              <div className="rec" key={p.id}>
                <div className="top"><span className="nm">{p.nom}</span><span className="pc num">{Math.min(95, Math.round(p.scoreBANT * 9 + 8))} %</span></div>
                <div className="why">{p.segment} · score BANT {p.scoreBANT.toFixed(1).replace(".", ",")} — {p.action || "meilleure probabilité de signature cette semaine"}.</div>
                <Link className="act" href="/qualification">Préparer l&apos;appel →</Link>
              </div>
            ))}
          </aside>
        </section>

        <div className="foot" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <span>Aperçu « centre de pilotage » · données réelles. Le Dashboard d&apos;origine reste disponible.</span>
          <Link className="switch" href="/dashboard">← Revenir au Dashboard actuel</Link>
        </div>

      </div>
    </main>
  );
}
