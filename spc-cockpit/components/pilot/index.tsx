import Link from "next/link";
import type { ReactNode } from "react";

/**
 * LANGAGE « CENTRE DE PILOTAGE » (pilot) — référence de design du SaaS.
 * ------------------------------------------------------------------
 * Grammaire information-design validée sur /dashboard/apercu, extraite ici
 * comme couche réutilisable et servant de référence pour toutes les pages.
 *
 * Principes non négociables (voir docs/pilot-design-system.md) :
 *  - Chiffres en encre, tabular-nums, mono pour les métriques secondaires.
 *  - UN seul accent (teal de marque) ; la couleur ne sert qu'au SENS
 *    (good / warn / crit) ou au violet IA. Zéro carte à filet coloré.
 *  - Hiérarchie par la typo et les filets fins, pas par des aplats.
 *  - Papier chaud, serif d'accent pour l'eyebrow, densité assumée.
 *
 * Server-component safe : aucune directive "use client", aucun hook.
 * Le CSS est injecté une seule fois via <PilotStyles/> (idempotent par id).
 */

export const PILOT_CSS = `
.pilot{--paper:#f4f4f1;--surface:#fff;--ink:#16110d;--ink2:#5c574f;--ink3:#918b81;
  --line:#e6e4dd;--line2:#efeee9;--brand:#0f766e;--brand2:#0a5f57;--amber:#c2660f;
  --ia:#6d5cf0;--good:#2f7a53;--warn:#b06a12;--crit:#bd2f2a;
  --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  --serif:ui-serif,Georgia,"Iowan Old Style","Times New Roman",serif;
  background:var(--paper);color:var(--ink);min-height:100%;font-variant-numeric:tabular-nums;}
.pilot a{color:inherit;text-decoration:none;}
.pilot .wrap{max-width:1120px;margin:0 auto;padding:10px 30px 64px;}
@media(max-width:640px){.pilot .wrap{padding:8px 18px 56px;}}
.pilot .num{font-variant-numeric:tabular-nums;}

/* En-tête de page (générique, remplace le bandeau/Topbar dans le langage pilot) */
.pilot .phead{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:26px 0 18px;border-bottom:1px solid var(--line);margin-bottom:8px;}
.pilot .phead .eyebrow{font-family:var(--serif);font-style:italic;font-size:15px;color:var(--brand);}
.pilot .phead h1{margin:2px 0 0;font-size:23px;font-weight:680;letter-spacing:-.02em;}
.pilot .phead .sub{font-size:13px;color:var(--ink3);margin-top:3px;}
.pilot .phead .actions{display:flex;align-items:center;gap:10px;}

.pilot .hero{display:grid;grid-template-columns:.92fr 1.08fr;gap:44px;align-items:end;padding:32px 0 24px;position:relative;}
.pilot .hero::before{content:"";position:absolute;inset:28px 0 16px;pointer-events:none;
  background:repeating-linear-gradient(to bottom,transparent 0,transparent 43px,var(--line2) 43px,var(--line2) 44px);
  -webkit-mask-image:linear-gradient(to right,#000 0,#000 30%,transparent 46%);mask-image:linear-gradient(to right,#000 0,#000 30%,transparent 46%);opacity:.7;}
@media(max-width:760px){.pilot .hero{grid-template-columns:1fr;gap:24px;align-items:stretch;}.pilot .hero::before{display:none;}}
.pilot .eyebrow{font-family:var(--serif);font-style:italic;font-size:16px;letter-spacing:.01em;color:var(--brand);}
.pilot .metric{display:flex;align-items:baseline;gap:16px;margin-top:8px;}
.pilot .metric .big{font-size:clamp(52px,8.5vw,86px);font-weight:730;letter-spacing:-.048em;line-height:.84;}
.pilot .metric .big .u{font-size:.4em;font-weight:600;color:var(--ink2);letter-spacing:-.02em;margin-left:3px;}
.pilot .trend{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:640;color:var(--good);background:color-mix(in srgb,var(--good) 12%,transparent);padding:5px 10px;border-radius:7px;align-self:center;}
.pilot .trend.warn{color:var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent);}
.pilot .trend.crit{color:var(--crit);background:color-mix(in srgb,var(--crit) 12%,transparent);}
.pilot .story{font-size:15px;color:var(--ink2);margin:16px 0 0;max-width:44ch;position:relative;}
.pilot .story b{color:var(--ink);font-weight:640;}
.pilot .story mark{background:none;color:var(--ia);font-weight:660;}
.pilot .mini{display:flex;gap:26px;margin-top:20px;position:relative;flex-wrap:wrap;}
.pilot .mini .n{font-family:var(--mono);font-size:18px;font-weight:600;letter-spacing:-.02em;}
.pilot .mini .l{font-size:11.5px;color:var(--ink3);margin-top:2px;}
.pilot .chart{position:relative;}
.pilot .chart .cap{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;}
.pilot .chart .cap .t{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);}
.pilot .chart .cap .leg{font-size:11.5px;color:var(--ink3);}
.pilot .chart svg{display:block;width:100%;height:146px;overflow:visible;}
.pilot .gridline{stroke:var(--line);stroke-width:1;}
.pilot .area{fill:url(#pg);opacity:0;animation:pFade .9s ease .5s forwards;}
.pilot .line{fill:none;stroke:var(--brand);stroke-width:2.25;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:760;stroke-dashoffset:760;animation:pDraw 1.15s cubic-bezier(.2,.7,.2,1) .1s forwards;}
.pilot .endpt{fill:var(--surface);stroke:var(--brand);stroke-width:2.5;opacity:0;animation:pFade .3s ease 1.3s forwards;}
.pilot .endlab{fill:var(--ink);font-family:var(--mono);font-size:11px;font-weight:600;opacity:0;animation:pFade .3s ease 1.4s forwards;}
@keyframes pDraw{to{stroke-dashoffset:0;}}
@keyframes pFade{to{opacity:1;}}

/* Ancrage sombre — UN seul point d'ancrage dominant par page (hero).
   Donne du contraste sans assombrir toute la page. */
.pilot .anchor{position:relative;overflow:hidden;border-radius:16px;padding:24px 34px 22px;margin-top:22px;
  background:linear-gradient(157deg,#1c2b28 0%,#141e1c 58%,#101917 100%);color:#eef1ee;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 16px 40px -24px rgba(12,20,18,.8);}
.pilot .anchor::after{content:"";position:absolute;top:-42%;right:-4%;width:340px;height:340px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(79,209,197,.16),transparent 70%);pointer-events:none;}
.pilot .anchorGrid{display:grid;grid-template-columns:.92fr 1.08fr;gap:44px;align-items:center;position:relative;}
@media(max-width:760px){.pilot .anchorGrid{grid-template-columns:1fr;gap:22px;align-items:stretch;}}
.pilot .anchor .eyebrow{color:#6fd6c4;}
.pilot .anchor .metric .big{color:#fff;}
.pilot .anchor .metric .big .u{color:#93a8a1;}
.pilot .anchor .trend{color:#83e3b4;background:rgba(131,227,180,.14);}
.pilot .anchor .trend.warn{color:#e8c07a;background:rgba(232,192,122,.15);}
.pilot .anchor .trend.crit{color:#ef9a95;background:rgba(239,154,149,.15);}
.pilot .anchor .story{color:#c2ccc7;}
.pilot .anchor .story b{color:#fff;}
.pilot .anchor .story mark{color:#b7a9ff;}
.pilot .anchor .mini .n{color:#fff;}
.pilot .anchor .mini .l{color:#8fa19b;}
.pilot .anchor .chart .cap .t{color:#8ba09a;}
.pilot .anchor .chart .cap .leg{color:#7f938d;}
.pilot .anchor .track{background:rgba(255,255,255,.13);}
.pilot .anchor .key .n{color:#fff;}
.pilot .anchor .key .l{color:#c2ccc7;}
.pilot .anchor .key .p{color:#8fa19b;}

/* Écho clair-teinté — relance de rythme SANS 2e bloc sombre ni filet coloré.
   C'est une zone (surface un cran plus soutenue que le papier), pas une carte. */
.pilot .echo{border-radius:14px;padding:22px 26px;margin-top:32px;background:#eaece4;border:1px solid #dfe1d8;}
.pilot .echo>.sechd:first-child{margin-top:0;}
@media(max-width:640px){.pilot .echo{padding:18px 18px;}}

.pilot .funnel{margin-top:12px;padding-top:22px;border-top:1px solid var(--line);}
.pilot .track{display:flex;height:11px;border-radius:3px;overflow:hidden;background:var(--line);}
.pilot .track i{display:block;height:100%;transform:scaleX(0);transform-origin:left;animation:pGrow .8s cubic-bezier(.2,.7,.2,1) forwards;}
.pilot .track i:nth-child(2){animation-delay:.08s;}.pilot .track i:nth-child(3){animation-delay:.16s;}.pilot .track i:nth-child(4){animation-delay:.24s;}
@keyframes pGrow{to{transform:scaleX(1);}}
.pilot .keys{display:flex;flex-wrap:wrap;gap:20px 32px;margin-top:14px;}
.pilot .key{display:flex;align-items:baseline;gap:8px;}
.pilot .key .sw{width:9px;height:9px;border-radius:2px;align-self:center;}
.pilot .key .n{font-family:var(--mono);font-size:16px;font-weight:600;}
.pilot .key .l{font-size:12.5px;color:var(--ink2);}
.pilot .key .p{font-size:11.5px;color:var(--ink3);font-family:var(--mono);}

.pilot .grid2{display:grid;grid-template-columns:1.62fr 1fr;gap:40px;margin-top:42px;align-items:start;}
@media(max-width:900px){.pilot .grid2{grid-template-columns:1fr;gap:36px;}}
.pilot .sechd{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 2px;}
.pilot .sechd h2{margin:0;font-size:15px;font-weight:660;letter-spacing:-.01em;}
.pilot .sechd .n{font-size:12px;color:var(--ink3);}
.pilot .sechd a{font-size:12.5px;color:var(--brand);font-weight:600;}
.pilot .block+.block{margin-top:38px;}

.pilot .row{display:grid;grid-template-columns:1fr auto;gap:4px 14px;padding:13px 4px;border-top:1px solid var(--line);align-items:center;transition:background .15s;}
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
.pilot .pill.brand{color:var(--brand);border-color:color-mix(in srgb,var(--brand) 32%,var(--line));}
@media(max-width:520px){.pilot .bant{display:none;}}

/* Lignes à barre de score (santé, clusters…) */
.pilot .camp{display:grid;grid-template-columns:1fr 150px 40px;gap:14px;align-items:center;padding:12px 4px;border-top:1px solid var(--line);}
.pilot .camp .nm{font-size:13.5px;font-weight:600;}
.pilot .camp .sub{font-size:11.5px;color:var(--ink3);margin-top:1px;}
.pilot .camp .bar{height:5px;border-radius:3px;background:var(--line);overflow:hidden;}
.pilot .camp .bar i{display:block;height:100%;border-radius:3px;}
.pilot .camp .v{font-family:var(--mono);font-size:13px;font-weight:600;text-align:right;}
@media(max-width:520px){.pilot .camp{grid-template-columns:1fr 44px;}.pilot .camp .bar{display:none;}}

/* Rail : cartes (copilote IA + signaux) */
.pilot .card{border:1px solid var(--line);border-radius:12px;background:var(--surface);overflow:hidden;}
.pilot .card+.card{margin-top:20px;}
.pilot .card .h{display:flex;align-items:center;gap:9px;padding:13px 16px 11px;border-bottom:1px solid var(--line2);}
.pilot .card .h .b{font-size:10.5px;font-weight:750;letter-spacing:.13em;text-transform:uppercase;}
.pilot .card .h .b.ia{color:var(--ia);}
.pilot .card .h .b.ia::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ia);margin-right:7px;vertical-align:middle;}
.pilot .card .h .b.sig{color:var(--ink2);}
.pilot .card .h .s{margin-left:auto;font-size:11.5px;color:var(--ink3);}
.pilot .rec{padding:12px 16px;border-bottom:1px solid var(--line2);}
.pilot .rec:last-child{border-bottom:0;}
.pilot .rec .top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}
.pilot .rec .nm{font-size:13.5px;font-weight:640;}
.pilot .rec .pc{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--brand);}
.pilot .rec .why{font-size:12.5px;color:var(--ink2);margin-top:4px;}
.pilot .rec .act{display:inline-block;margin-top:7px;font-size:12px;font-weight:600;color:var(--brand);}
.pilot .sig{display:flex;align-items:flex-start;gap:10px;padding:11px 16px;border-bottom:1px solid var(--line2);}
.pilot .sig:last-child{border-bottom:0;}
.pilot .sig .dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex:none;}
.pilot .sig .t{font-size:13px;font-weight:600;line-height:1.35;}
.pilot .sig .d{font-size:11.5px;color:var(--ink3);margin-top:1px;}
.pilot .sig .c{margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--ink3);flex:none;padding-top:1px;}
.pilot .sig .tag{font-size:11px;color:var(--brand);font-weight:600;flex:none;padding-top:1px;}

.pilot .foot{margin-top:44px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--ink3);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.pilot .switch{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--ink3);border:1px solid var(--line);border-radius:999px;padding:5px 12px;}
@media(prefers-reduced-motion:reduce){.pilot *{animation:none!important;}.pilot .area,.pilot .endpt,.pilot .endlab{opacity:1;}.pilot .line{stroke-dashoffset:0;}.pilot .track i{transform:none;}}
`;

/** Injecte le CSS du langage pilot. Idempotent : l'id évite les doublons si deux blocs coexistent. */
export function PilotStyles() {
  return <style id="pilot-css" dangerouslySetInnerHTML={{ __html: PILOT_CSS }} />;
}

/** Conteneur de page pilot : <main> scrollable + styles + zone centrée. */
export function PilotMain({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`flex-1 overflow-y-auto pilot ${className}`}>
      <PilotStyles />
      <div className="wrap">{children}</div>
    </main>
  );
}

/** En-tête de section : titre + lien « voir tout ». */
export function SectionHead({ title, count, href, hrefLabel = "Tous →" }: { title: string; count?: ReactNode; href?: string; hrefLabel?: string }) {
  return (
    <div className="sechd">
      <h2>{title}</h2>
      {count != null && <span className="n num">{count}</span>}
      {href && <Link href={href}>{hrefLabel}</Link>}
    </div>
  );
}

export type PillTone = "neutral" | "hot" | "warm" | "rdv" | "brand";

/** Pastille d'état : la couleur encode le SENS, jamais la décoration. */
export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  const cls = tone === "neutral" ? "pill" : `pill ${tone}`;
  return <span className={cls}><span className="dot" />{children}</span>;
}

/** Barre de score compacte (BANT, santé…) : barre fine + valeur mono. */
export function ScoreBar({ score, max = 10, color = "var(--brand)" }: { score: number; max?: number; color?: string }) {
  return (
    <span className="bant">
      <span className="bar"><span className="fill" style={{ width: `${Math.min((score / max) * 100, 100)}%`, background: color }} /></span>
      <span className="v num">{fr1(score)}</span>
    </span>
  );
}

/** Ligne de signal (alerte / échéance) dans le rail. */
export function SignalRow({ href, color, title, detail, count, tag }: { href: string; color: string; title: ReactNode; detail?: ReactNode; count?: ReactNode; tag?: ReactNode }) {
  return (
    <Link className="sig" href={href}>
      <span className="dot" style={{ background: color }} />
      <span><div className="t">{title}</div>{detail != null && <div className="d">{detail}</div>}</span>
      {count != null && <span className="c num">{count}</span>}
      {tag != null && <span className="tag">{tag}</span>}
    </Link>
  );
}

/** Formate un nombre à 1 décimale à la française (virgule). */
export function fr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
