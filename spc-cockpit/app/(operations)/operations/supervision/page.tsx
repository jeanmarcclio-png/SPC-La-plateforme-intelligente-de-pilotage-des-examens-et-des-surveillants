export const dynamic = "force-dynamic";

import { getMissions, getAffectations, getSalles } from "@/lib/operations/queries";
import { analyseCouverture } from "@/lib/operations/couverture";
import { dateFR } from "@/lib/operations/format";
import type { Affectation } from "@/lib/operations/types";

/**
 * SUPERVISION LIVE — écran « salle de contrôle » du jour d'examen.
 * Thème sombre assumé (mono-thème), métier surveillance : plan des salles temps
 * réel, constantes vitales, flux d'événements, chronologie du jour.
 * Branché sur la mission active + affectations + salles réelles.
 */

const CSS = `
.svl{--bg:#0a0e13;--panel:#0f151b;--panel2:#121a21;--line:#1d2731;--line2:#161e26;
  --ink:#e9eff3;--dim:#7e8c99;--dim2:#556673;--brand:#2dd4bf;--ok:#34d399;--amber:#f5a524;--alert:#ff5d5d;--ia:#a99bff;
  --mono:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;
  min-height:100%;background:var(--bg);color:var(--ink);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  background-image:radial-gradient(1000px 500px at 72% -10%,rgba(45,212,191,.06),transparent 60%),
    linear-gradient(var(--line2) 1px,transparent 1px),linear-gradient(90deg,var(--line2) 1px,transparent 1px);
  background-size:auto,44px 44px,44px 44px;}
.svl .mono{font-family:var(--mono);}
.svl .wrap{max-width:1180px;margin:0 auto;padding:0 26px 56px;}
.svl .ribbon{display:flex;align-items:center;gap:20px;height:58px;border-bottom:1px solid var(--line);flex-wrap:wrap;
  position:sticky;top:0;background:linear-gradient(180deg,var(--bg),rgba(10,14,19,.85));backdrop-filter:blur(8px);z-index:5;}
.svl .logo{display:flex;align-items:center;gap:10px;font-weight:750;letter-spacing:.02em;}
.svl .logo .m{width:20px;height:20px;border-radius:6px;background:var(--brand);position:relative;box-shadow:0 0 15px rgba(45,212,191,.5);}
.svl .logo .m::after{content:"";position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--bg);}
.svl .logo span{color:var(--dim);font-weight:600;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;}
.svl .sess{color:var(--dim);font-size:12.5px;} .svl .sess b{color:var(--ink);font-weight:600;}
.svl .rt{margin-left:auto;display:flex;align-items:center;gap:16px;}
.svl .clock{font-family:var(--mono);font-size:15px;letter-spacing:.06em;color:var(--brand);}
.svl .live{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--alert);}
.svl .live::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--alert);animation:svlBip 1.6s ease-out infinite;}
@keyframes svlBip{0%{box-shadow:0 0 0 0 rgba(255,93,93,.55);}70%{box-shadow:0 0 0 9px transparent;}100%{box-shadow:0 0 0 0 transparent;}}
.svl h2.h{font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);margin:26px 0 15px;}
.svl .vitals{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
@media(max-width:760px){.svl .vitals{grid-template-columns:repeat(2,1fr);}}
.svl .vital{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:15px 16px 14px;}
.svl .vital .k{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);}
.svl .vital .n{font-family:var(--mono);font-size:36px;font-weight:600;letter-spacing:-.02em;line-height:1;margin-top:9px;}
.svl .vital .n small{font-size:16px;color:var(--dim);}
.svl .vital .g{height:4px;border-radius:2px;background:var(--line);margin-top:11px;overflow:hidden;}
.svl .vital .g i{display:block;height:100%;border-radius:2px;transform-origin:left;animation:svlGrow 1s cubic-bezier(.2,.7,.2,1) forwards;}
.svl .vital .sub{font-size:11.5px;color:var(--dim);margin-top:8px;}
.svl .vital.ok .n{color:var(--ok);text-shadow:0 0 22px rgba(52,211,153,.24);}
.svl .vital.brand .n{color:var(--brand);text-shadow:0 0 22px rgba(45,212,191,.2);}
.svl .vital.amber .n{color:var(--amber);text-shadow:0 0 22px rgba(245,165,36,.2);}
.svl .vital.alert .n{color:var(--alert);text-shadow:0 0 22px rgba(255,93,93,.24);}
@keyframes svlGrow{from{transform:scaleX(0);}}
.svl .board{display:grid;grid-template-columns:1.55fr 1fr;gap:20px;margin-top:24px;align-items:start;}
@media(max-width:920px){.svl .board{grid-template-columns:1fr;}}
.svl .panel{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden;}
.svl .panel .ph{display:flex;align-items:center;justify-content:space-between;padding:12px 15px;border-bottom:1px solid var(--line2);flex-wrap:wrap;gap:8px;}
.svl .panel .ph .t{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);}
.svl .panel .ph .leg{display:flex;gap:13px;font-size:11px;color:var(--dim);}
.svl .panel .ph .leg i{display:inline-flex;align-items:center;gap:6px;}
.svl .panel .ph .leg i::before{content:"";width:8px;height:8px;border-radius:2px;}
.svl .leg .lo::before{background:var(--ok);} .svl .leg .la::before{background:var(--amber);} .svl .leg .lv::before{background:var(--dim2);}
.svl .rooms{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:15px;}
@media(max-width:560px){.svl .rooms{grid-template-columns:repeat(3,1fr);}}
.svl .room{border:1px solid var(--line);border-radius:8px;padding:10px 10px;background:var(--panel2);position:relative;min-height:72px;}
.svl .room .code{font-family:var(--mono);font-size:13px;font-weight:600;}
.svl .room .cap{font-size:10.5px;color:var(--dim);margin-top:3px;}
.svl .room .st{position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;}
.svl .room .surv{font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:7px;}
.svl .room.ok{border-color:color-mix(in srgb,var(--ok) 40%,var(--line));} .svl .room.ok .st{background:var(--ok);box-shadow:0 0 8px var(--ok);}
.svl .room.warn{border-color:color-mix(in srgb,var(--amber) 46%,var(--line));background:color-mix(in srgb,var(--amber) 8%,var(--panel2));} .svl .room.warn .st{background:var(--amber);box-shadow:0 0 8px var(--amber);}
.svl .room.warn .surv{color:var(--amber);}
.svl .room .tag{font-size:9.5px;color:var(--brand);font-weight:700;letter-spacing:.06em;margin-top:2px;}
.svl .feed{max-height:372px;overflow:auto;}
.svl .ev{display:flex;gap:11px;padding:11px 15px;border-bottom:1px solid var(--line2);font-size:12.5px;}
.svl .ev:last-child{border-bottom:0;}
.svl .ev .ts{font-family:var(--mono);color:var(--dim2);flex:none;font-size:11.5px;padding-top:1px;}
.svl .ev .d{width:7px;height:7px;border-radius:50%;margin-top:5px;flex:none;}
.svl .ev.a .d{background:var(--alert);box-shadow:0 0 7px var(--alert);} .svl .ev.w .d{background:var(--amber);} .svl .ev.o .d{background:var(--ok);} .svl .ev.i .d{background:var(--ia);}
.svl .ev .tx{line-height:1.4;} .svl .ev .tx b{font-weight:640;} .svl .ev.i .tx em{color:var(--ia);font-style:normal;font-weight:600;}
.svl .timeline{border:1px solid var(--line);border-radius:12px;background:var(--panel);margin-top:20px;padding:15px 18px 20px;}
.svl .timeline .th{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:15px;}
.svl .tl{position:relative;height:52px;border-left:1px solid var(--line);border-right:1px solid var(--line);}
.svl .tl .hh{position:absolute;top:-2px;bottom:-2px;width:1px;background:var(--line2);}
.svl .tl .hh span{position:absolute;top:-15px;left:-14px;font-family:var(--mono);font-size:10px;color:var(--dim2);}
.svl .tl .slot{position:absolute;height:16px;border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:10.5px;font-weight:600;color:#06120f;white-space:nowrap;overflow:hidden;}
.svl .tl .now{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--alert);box-shadow:0 0 10px var(--alert);}
.svl .tl .now::after{content:"MAINTENANT";position:absolute;top:-15px;left:6px;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--alert);}
.svl .foot{margin-top:30px;font-size:12px;color:var(--dim);}
.svl .foot b{color:var(--ink);}
@media(prefers-reduced-motion:reduce){.svl *{animation:none!important;}.svl .vital .g i{transform:none;}}
`;

function toMin(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
function firstCreneau(a: Affectation, periode: "matin" | "apm") {
  const list = periode === "matin" ? a.matinCreneaux : a.apmCreneaux;
  if (list?.length) return { debut: list[0].debut, fin: list[list.length - 1].fin };
  if (periode === "matin" && a.matin) return { debut: a.matinDebut, fin: a.matinFin };
  if (periode === "apm" && a.apm) return { debut: a.apmDebut, fin: a.apmFin };
  return null;
}

export default async function SupervisionPage() {
  const [jMissions, jAffectations, jSalles] = await Promise.all([
    getMissions(), getAffectations(), getSalles(),
  ]);
  const missions = jMissions.lignes;
  const affectations = jAffectations.lignes;
  const salles = jSalles.lignes;
  const salleByNom = new Map(salles.map((s) => [s.nom.trim(), s]));

  const mission = missions.find((m) => m.statut === "En cours")
    ?? missions.find((m) => m.statut === "Validée")
    ?? missions.find((m) => m.statut === "Planifiée")
    ?? missions[0];

  const rows = affectations.filter((a) => mission && a.missionId === mission.id);
  const actifs = rows.filter((a) => a.matin || a.apm || a.matinCreneaux?.length || a.apmCreneaux?.length);
  const deployes = new Set(actifs.map((a) => a.surveillantId)).size;
  const requis = mission?.nbSurveillants ?? deployes;
  const couv = analyseCouverture({ requis, affectes: deployes });
  const renforts = couv.manque;

  // Salles occupées (depuis les affectations) enrichies des métadonnées salle.
  const parSalle = new Map<string, Set<number>>();
  for (const a of actifs) {
    const code = (a.salle ?? "").trim();
    if (!code) continue;
    const set = parSalle.get(code) ?? new Set<number>();
    set.add(a.surveillantId);
    parSalle.set(code, set);
  }
  const roomList = [...parSalle.entries()].map(([code, set]) => {
    const meta = salleByNom.get(code);
    const surv = set.size;
    const req = meta?.nbSurveillants ?? 1;
    const status: "ok" | "warn" = surv >= req ? "ok" : "warn";
    return { code, surv, req, cap: meta?.capacite, pmr: meta?.pmr, tt: meta?.tiersTemps, status };
  }).sort((a, b) => a.code.localeCompare(b.code));

  const sallesCouvertes = roomList.filter((r) => r.status === "ok").length;
  const sousEffectif = roomList.filter((r) => r.status === "warn");
  const sansSalle = actifs.filter((a) => !(a.salle ?? "").trim()).length;
  const alertesN = sousEffectif.length + (sansSalle > 0 ? 1 : 0);

  // Chronologie : amplitude matin / après-midi réelle.
  const matinD: number[] = [], matinF: number[] = [], apmD: number[] = [], apmF: number[] = [];
  for (const a of actifs) {
    const m = firstCreneau(a, "matin"); const p = firstCreneau(a, "apm");
    const md = toMin(m?.debut), mf = toMin(m?.fin), pd = toMin(p?.debut), pf = toMin(p?.fin);
    if (md != null) matinD.push(md); if (mf != null) matinF.push(mf);
    if (pd != null) apmD.push(pd); if (pf != null) apmF.push(pf);
  }
  const DAY0 = 8 * 60, DAY1 = 18 * 60, SPAN = DAY1 - DAY0;
  const pct = (min: number) => Math.max(0, Math.min(100, ((min - DAY0) / SPAN) * 100));
  const matinSlot = matinD.length ? { l: pct(Math.min(...matinD)), w: pct(Math.max(...matinF)) - pct(Math.min(...matinD)) } : null;
  const apmSlot = apmD.length ? { l: pct(Math.min(...apmD)), w: pct(Math.max(...apmF)) - pct(Math.min(...apmD)) } : null;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowClock = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Flux d'événements dérivé du réel (sans invention de faits).
  type Ev = { c: "a" | "w" | "o" | "i"; t: string; tx: React.ReactNode };
  const feed: Ev[] = [];
  for (const r of sousEffectif.slice(0, 3)) feed.push({ c: "a", t: r.code, tx: <><b>{r.code}</b> — sous-effectif ({r.surv}/{r.req} surveillants).</> });
  if (sansSalle > 0) feed.push({ c: "w", t: "SALLE", tx: <>{sansSalle} surveillant(s) sans salle affectée.</> });
  for (const r of roomList.filter((x) => x.tt).slice(0, 2)) feed.push({ c: "w", t: r.code, tx: <><b>{r.code}</b> — tiers-temps activé.</> });
  for (const r of roomList.filter((x) => x.pmr).slice(0, 1)) feed.push({ c: "o", t: r.code, tx: <><b>{r.code}</b> — aménagement PMR en place.</> });
  if (renforts > 0) feed.push({ c: "i", t: "IA", tx: <><em>IA</em> — {renforts} renfort(s) recommandé(s) pour atteindre 100 % de couverture.</> });
  for (const r of roomList.filter((x) => x.status === "ok").slice(0, 3)) feed.push({ c: "o", t: r.code, tx: <><b>{r.code}</b> — couverte ({r.surv} surv.).</> });

  return (
    <div className="svl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="ribbon">
        <div className="wrap" style={{ display: "flex", alignItems: "center", gap: "20px", width: "100%", height: "58px", flexWrap: "wrap" }}>
          <span className="logo"><span className="m" />Survéo <span>Supervision live</span></span>
          <span className="sess">Session <b>{mission?.client ?? "—"}</b> · {mission?.dateMission ? dateFR(mission.dateMission) : "—"} · <b>{roomList.length} salles</b></span>
          <span className="rt"><span className="clock">{nowClock}</span><span className="live">En direct</span></span>
        </div>
      </div>

      <div className="wrap">
        <h2 className="h">Constantes de la session</h2>
        <div className="vitals">
          <div className="vital ok"><div className="k">Couverture</div><div className="n mono">{Math.round(couv.tauxCouverture * 100)}<small>%</small></div><div className="g"><i style={{ width: `${Math.round(couv.tauxCouverture * 100)}%`, background: "var(--ok)" }} /></div><div className="sub">{sallesCouvertes} / {roomList.length} salles couvertes</div></div>
          <div className="vital brand"><div className="k">Surveillants</div><div className="n mono">{deployes}</div><div className="g"><i style={{ width: `${requis ? Math.min(100, (deployes / requis) * 100) : 0}%`, background: "var(--brand)" }} /></div><div className="sub">déployés · {requis} requis</div></div>
          <div className="vital amber"><div className="k">Renforts requis</div><div className="n mono">{renforts}</div><div className="g"><i style={{ width: `${requis ? Math.min(100, (renforts / requis) * 100) : 0}%`, background: "var(--amber)" }} /></div><div className="sub">pour atteindre 100 %</div></div>
          <div className="vital alert"><div className="k">Alertes — cette session</div><div className="n mono">{alertesN}</div><div className="g"><i style={{ width: `${Math.min(100, alertesN * 20)}%`, background: "var(--alert)" }} /></div><div className="sub">{sousEffectif.length} sous-effectif{sansSalle > 0 ? " · salles à compléter" : ""}</div></div>
        </div>

        <div className="board">
          <div className="panel">
            <div className="ph"><span className="t">Plan des salles · temps réel</span>
              <span className="leg"><i className="lo">couverte</i><i className="la">renfort</i></span>
            </div>
            <div className="rooms">
              {roomList.length === 0 && <div style={{ padding: "8px", color: "var(--dim)", fontSize: "12.5px" }}>Aucune salle affectée sur la session active.</div>}
              {roomList.map((r) => (
                <div className={`room ${r.status}`} key={r.code}>
                  <span className="st" />
                  <div className="code">{r.code}</div>
                  <div className="cap">{r.cap ? `${r.cap} pl.` : "—"}</div>
                  <div className="surv">{r.surv}{r.req > 1 ? `/${r.req}` : ""} surv.</div>
                  {(r.pmr || r.tt) && <div className="tag">{r.pmr ? "PMR" : ""}{r.pmr && r.tt ? " · " : ""}{r.tt ? "TT" : ""}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="ph"><span className="t">Flux en direct</span><span className="leg" style={{ color: "var(--dim)" }}>08:00 → maintenant</span></div>
            <div className="feed">
              {feed.length === 0 && <div className="ev o"><span className="ts">—</span><span className="d" /><span className="tx">Session sous contrôle · aucun incident.</span></div>}
              {feed.map((e, i) => (
                <div className={`ev ${e.c}`} key={i}><span className="ts">{e.t}</span><span className="d" /><span className="tx">{e.tx}</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="timeline">
          <div className="th">Chronologie du jour · 08:00 → 18:00</div>
          <div className="tl">
            {[8, 10, 12, 14, 16, 18].map((h, i) => (
              <div className="hh" key={h} style={{ left: `${(i / 5) * 100}%` }}><span>{String(h).padStart(2, "0")}h</span></div>
            ))}
            {matinSlot && matinSlot.w > 0 && <div className="slot" style={{ left: `${matinSlot.l}%`, width: `${matinSlot.w}%`, top: "12px", background: "var(--brand)" }}>Matin · {matinD.length} salles</div>}
            {apmSlot && apmSlot.w > 0 && <div className="slot" style={{ left: `${apmSlot.l}%`, width: `${apmSlot.w}%`, top: "32px", background: "var(--amber)", color: "#1a1206" }}>Après-midi · {apmD.length} salles</div>}
            {nowMin >= DAY0 && nowMin <= DAY1 && <div className="now" style={{ left: `${pct(nowMin)}%` }} />}
          </div>
        </div>

        <p className="foot">Écran <b>Supervision live</b> · thème sombre dédié · données réelles de la session active ({mission?.reference ?? "—"}). Horloge et flux mis à jour au chargement.</p>
      </div>
    </div>
  );
}
